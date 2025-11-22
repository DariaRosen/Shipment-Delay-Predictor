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

async function findShipmentsToCancel() {
  console.log('🔍 Finding shipments that should be canceled...\n');

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
    const shipmentsToCancel: Array<{
      shipmentId: string;
      daysPastEta: number;
      dwellTime: number;
      currentStage: string;
      latestEvent: string;
      latestEventTime: string;
    }> = [];

    for (const shipment of shipments) {
      try {
        // Skip future shipments
        const orderDate = new Date(shipment.order_date);
        if (orderDate > now) {
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

        // Check if already marked as canceled
        if (shipment.current_status && shipment.current_status.toLowerCase().includes('canceled')) {
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

        // Get the latest event's stage (more accurate than current_status)
        const stageToCheck = lastEvent.event_stage;

        // Condition 1: Check if stuck in the same step/stage for more than 30 days
        const dwellTime = calculateStageDwellTime(events, stageToCheck);
        
        // Condition 2: Check if 14+ days past expected delivery date (ETA)
        const expectedDelivery = new Date(shipment.expected_delivery);
        const daysPastEta = (now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24);
        
        // BOTH conditions must be true for cancellation
        if (dwellTime > 30 && daysPastEta >= 14) {
          shipmentsToCancel.push({
            shipmentId: shipment.shipment_id,
            daysPastEta: Math.floor(daysPastEta),
            dwellTime: Math.floor(dwellTime),
            currentStage: stageToCheck,
            latestEvent: lastEvent.event_stage,
            latestEventTime: lastEvent.event_time,
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${shipment.shipment_id}:`, error);
      }
    }

    if (shipmentsToCancel.length === 0) {
      console.log('✅ No shipments found that should be canceled');
      console.log('   All shipments are either:');
      console.log('   - Already canceled');
      console.log('   - Completed');
      console.log('   - Not stuck for 30+ days');
      console.log('   - Not 14+ days past ETA');
    } else {
      console.log(`⚠️  Found ${shipmentsToCancel.length} shipments that should be canceled:\n`);
      
      shipmentsToCancel.forEach((shipment, index) => {
        console.log(`${index + 1}. ${shipment.shipmentId}`);
        console.log(`   Current Stage: ${shipment.currentStage}`);
        console.log(`   Latest Event: ${shipment.latestEvent} (${shipment.latestEventTime})`);
        console.log(`   Stuck for: ${shipment.dwellTime} days`);
        console.log(`   Days past ETA: ${shipment.daysPastEta} days`);
        console.log('');
      });

      console.log('\n💡 These shipments meet BOTH cancellation conditions:');
      console.log('   1. Stuck in the same stage for 30+ days');
      console.log('   2. 14+ days past expected delivery date');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findShipmentsToCancel();

