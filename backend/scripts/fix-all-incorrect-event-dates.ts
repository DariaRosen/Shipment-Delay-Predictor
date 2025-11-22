import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Missing Supabase environment variables!\n' +
      'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Calculate how long shipment has been in the same step/stage
 */
function calculateStageDwellTime(events: any[], currentStage: string): number {
  if (!currentStage || events.length === 0) return 0;
  
  // Sort events by time (oldest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime(),
  );
  
  // Find all events that match the current stage
  const currentStageLower = currentStage.toLowerCase();
  const matchingEvents = sortedEvents.filter(e => 
    e.event_stage.toLowerCase() === currentStageLower ||
    e.event_stage.toLowerCase().includes(currentStageLower) ||
    currentStageLower.includes(e.event_stage.toLowerCase())
  );
  
  if (matchingEvents.length === 0) return 0;
  
  // Get the first (earliest) event in this stage
  const firstEventInStage = matchingEvents[0];
  const stageStartTime = new Date(firstEventInStage.event_time);
  
  // Get the latest event overall to see if shipment moved
  const latestEventOverall = sortedEvents[sortedEvents.length - 1];
  
  // Check if the latest event is still in the same stage
  const latestEventStageLower = latestEventOverall.event_stage.toLowerCase();
  const isStillInSameStage = 
    latestEventStageLower === currentStageLower ||
    latestEventStageLower.includes(currentStageLower) ||
    currentStageLower.includes(latestEventStageLower);
  
  // If shipment moved to a different stage, it's not stuck
  if (!isStillInSameStage) {
    return 0;
  }
  
  // Calculate dwell time from the first event in this stage to now
  const now = new Date();
  const daysSinceFirstEvent = (now.getTime() - stageStartTime.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceFirstEvent;
}

async function fixAllIncorrectEventDates() {
  console.log('🔧 Finding and fixing shipments with incorrect event dates...\n');

  try {
    // Get all shipments
    const { data: shipments, error: fetchError } = await supabase
      .from('shipments')
      .select('shipment_id, order_date, expected_delivery, current_status, mode, origin_city, dest_city')
      .order('shipment_id', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching shipments:', fetchError);
      process.exit(1);
    }

    if (!shipments || shipments.length === 0) {
      console.log('ℹ️  No shipments found');
      return;
    }

    console.log(`📦 Checking ${shipments.length} shipments...\n`);

    const now = new Date();
    const shipmentsToFix: Array<{
      shipmentId: string;
      eventsToFix: Array<{ eventId: number; eventStage: string; oldTime: string; newTime: string }>;
      shouldBeCanceled: boolean;
      daysPastEta: number;
      dwellTime: number;
    }> = [];

    for (const shipment of shipments) {
      try {
        // Skip future shipments
        const orderDate = new Date(shipment.order_date);
        if (orderDate > now) {
          continue;
        }

        // Skip already canceled shipments
        if (shipment.current_status && shipment.current_status.toLowerCase().includes('canceled')) {
          continue;
        }

        // Get events
        const { data: events, error: eventsError } = await supabase
          .from('shipment_events')
          .select('*')
          .eq('shipment_id', shipment.shipment_id)
          .order('event_time', { ascending: true });

        if (eventsError || !events || events.length === 0) {
          continue;
        }

        // Check if last event indicates refund/canceled
        const sortedEvents = [...events].sort(
          (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
        );
        const lastEvent = sortedEvents[0];
        const lastEventStage = lastEvent.event_stage.toLowerCase();
        
        if (
          lastEventStage.includes('refund') ||
          lastEventStage.includes('canceled') ||
          lastEventStage.includes('lost')
        ) {
          continue;
        }

        // Check if completed
        const completedStages = [
          'package received by customer',
          'delivered',
          'received by customer',
          'package received',
          'delivery completed',
        ];
        const isCompleted = completedStages.some(stage => 
          lastEventStage.includes(stage)
        );
        if (isCompleted) {
          continue;
        }

        const expectedDelivery = new Date(shipment.expected_delivery);
        const daysPastEta = (now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24);

        // Find events that have dates that are suspiciously recent (within last 7 days)
        // but the shipment is way past ETA (14+ days)
        const suspiciousEvents: Array<{ event: any; shouldBeEarlier: Date | null }> = [];

        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const eventTime = new Date(event.event_time);
          const daysSinceEvent = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60 * 24);

          // If event is very recent (within last 7 days) but shipment is 14+ days past ETA,
          // this event probably has the wrong date
          if (daysSinceEvent < 7 && daysPastEta >= 14) {
            // Try to find a logical previous event to base the time on
            let shouldBeEarlier: Date | null = null;

            // Look for a previous event that happened before the ETA
            for (let j = i - 1; j >= 0; j--) {
              const prevEvent = events[j];
              const prevEventTime = new Date(prevEvent.event_time);
              
              // If previous event is before ETA, use it as reference
              if (prevEventTime < expectedDelivery) {
                // Set this event to be shortly after the previous one (1-4 hours)
                const hoursAfter = 1 + Math.random() * 3; // 1-4 hours
                shouldBeEarlier = new Date(prevEventTime.getTime() + (hoursAfter * 60 * 60 * 1000));
                break;
              }
            }

            // If no previous event found, use a date shortly after order date
            if (!shouldBeEarlier) {
              const hoursAfterOrder = 24 + Math.random() * 48; // 1-3 days after order
              shouldBeEarlier = new Date(orderDate.getTime() + (hoursAfterOrder * 60 * 60 * 1000));
            }

            suspiciousEvents.push({ event, shouldBeEarlier });
          }
        }

        if (suspiciousEvents.length > 0) {
          // Get the latest event's stage for cancellation check
          const stageToCheck = lastEvent.event_stage;
          const dwellTime = calculateStageDwellTime(events, stageToCheck);

          shipmentsToFix.push({
            shipmentId: shipment.shipment_id,
            eventsToFix: suspiciousEvents.map(se => ({
              eventId: se.event.event_id,
              eventStage: se.event.event_stage,
              oldTime: se.event.event_time,
              newTime: se.shouldBeEarlier!.toISOString(),
            })),
            shouldBeCanceled: dwellTime > 30 && daysPastEta >= 14,
            daysPastEta: Math.floor(daysPastEta),
            dwellTime: Math.floor(dwellTime),
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${shipment.shipment_id}:`, error);
      }
    }

    if (shipmentsToFix.length === 0) {
      console.log('✅ No shipments found with incorrect event dates');
      return;
    }

    console.log(`⚠️  Found ${shipmentsToFix.length} shipments with incorrect event dates:\n`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const shipment of shipmentsToFix) {
      try {
        console.log(`🔧 Fixing ${shipment.shipmentId}...`);
        console.log(`   Events to fix: ${shipment.eventsToFix.length}`);

        // Fix each suspicious event
        for (const eventFix of shipment.eventsToFix) {
          const { error: updateError } = await supabase
            .from('shipment_events')
            .update({ event_time: eventFix.newTime })
            .eq('event_id', eventFix.eventId);

          if (updateError) {
            console.error(`   ❌ Error updating event "${eventFix.eventStage}":`, updateError);
            errorCount++;
            continue;
          }

          console.log(`   ✅ Fixed "${eventFix.eventStage}": ${eventFix.oldTime} → ${eventFix.newTime}`);
        }

        // If shipment should be canceled, update status and add refund event
        if (shipment.shouldBeCanceled) {
          // Update shipment status to canceled
          const { error: updateStatusError } = await supabase
            .from('shipments')
            .update({ current_status: 'Canceled' })
            .eq('shipment_id', shipment.shipmentId);

          if (updateStatusError) {
            console.error(`   ❌ Error updating status:`, updateStatusError);
            errorCount++;
          } else {
            // Add refund event
            const cancellationReason = `Shipment was stuck in the same step for more than 30 days (${shipment.dwellTime} days) and is ${shipment.daysPastEta} days past the expected delivery date (14+ days delay). Refund has been processed.`;
            
            const refundEvent = {
              shipment_id: shipment.shipmentId,
              event_time: now.toISOString(),
              event_stage: 'Refund customer',
              description: cancellationReason,
              location: null,
            };

            const { error: insertError } = await supabase
              .from('shipment_events')
              .insert(refundEvent);

            if (insertError) {
              console.error(`   ❌ Error inserting refund event:`, insertError);
              errorCount++;
            } else {
              console.log(`   ✅ Status updated to "Canceled" and refund event added`);
            }
          }
        }

        console.log('');
        fixedCount++;
      } catch (error) {
        console.error(`   ❌ Error fixing ${shipment.shipmentId}:`, error);
        errorCount++;
      }
    }

    console.log('\n✅ Fix completed!');
    console.log(`   - Fixed: ${fixedCount} shipments`);
    console.log(`   - Errors: ${errorCount} shipments`);
    console.log(`\n💡 All shipments with incorrect event dates have been fixed`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAllIncorrectEventDates();

