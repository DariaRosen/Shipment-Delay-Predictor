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

async function checkLD1019() {
  console.log('🔍 Checking LD1019 shipment data...\n');

  try {
    // Get shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('shipment_id', 'LD1019')
      .single();

    if (shipmentError) {
      console.error('❌ Error fetching shipment:', shipmentError);
      process.exit(1);
    }

    if (!shipment) {
      console.log('ℹ️  Shipment LD1019 not found');
      return;
    }

    console.log('📦 Shipment Data:');
    console.log(JSON.stringify(shipment, null, 2));
    console.log('\n');

    // Get events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', 'LD1019')
      .order('event_time', { ascending: true });

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      process.exit(1);
    }

    console.log(`📋 Events (${events?.length || 0}):`);
    if (events && events.length > 0) {
      events.forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.event_stage}`);
        console.log(`   Time: ${event.event_time}`);
        console.log(`   Description: ${event.description || 'N/A'}`);
        console.log(`   Location: ${event.location || 'N/A'}`);
      });
    } else {
      console.log('   No events found');
    }

    console.log('\n');

    // Calculate cancellation conditions
    const now = new Date();
    const orderDate = new Date(shipment.order_date);
    const expectedDelivery = new Date(shipment.expected_delivery);
    const daysPastEta = (now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24);

    console.log('📊 Cancellation Analysis:');
    console.log(`   Order Date: ${orderDate.toISOString()}`);
    console.log(`   Expected Delivery: ${expectedDelivery.toISOString()}`);
    console.log(`   Current Date: ${now.toISOString()}`);
    console.log(`   Days Past ETA: ${Math.floor(daysPastEta)} days`);
    console.log(`   Current Status: ${shipment.current_status}`);

    // Check if already canceled
    if (shipment.current_status && shipment.current_status.toLowerCase().includes('canceled')) {
      console.log(`   ✅ Already marked as canceled`);
    }

    // Check if completed
    if (events && events.length > 0) {
      const sortedEvents = [...events].sort(
        (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
      );
      const latestEvent = sortedEvents[0];
      const latestEventTime = new Date(latestEvent.event_time);
      const daysSinceLastEvent = (now.getTime() - latestEventTime.getTime()) / (1000 * 60 * 60 * 24);

      console.log(`   Latest Event: ${latestEvent.event_stage} at ${latestEventTime.toISOString()}`);
      console.log(`   Days Since Last Event: ${Math.floor(daysSinceLastEvent)} days`);

      // Get the latest event's stage
      const stageToCheck = latestEvent.event_stage;
      
      // Condition 1: Check if stuck in the same step/stage for more than 30 days
      const dwellTime = calculateStageDwellTime(events, stageToCheck);
      console.log(`   Dwell Time in "${stageToCheck}": ${Math.floor(dwellTime)} days`);
      
      // Condition 2: Check if 14+ days past expected delivery date (ETA)
      console.log(`   Days Past ETA: ${Math.floor(daysPastEta)} days`);
      
      // Check if should be canceled
      const shouldBeCanceled = dwellTime > 30 && daysPastEta >= 14;
      console.log(`\n   Should be canceled: ${shouldBeCanceled ? 'YES ⚠️' : 'NO ✅'}`);
      
      if (shouldBeCanceled) {
        console.log(`   Reason: Stuck for ${Math.floor(dwellTime)} days AND ${Math.floor(daysPastEta)} days past ETA`);
      } else {
        if (dwellTime <= 30) {
          console.log(`   - Not stuck long enough (${Math.floor(dwellTime)} days < 30 days)`);
        }
        if (daysPastEta < 14) {
          console.log(`   - Not past ETA enough (${Math.floor(daysPastEta)} days < 14 days)`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkLD1019();

