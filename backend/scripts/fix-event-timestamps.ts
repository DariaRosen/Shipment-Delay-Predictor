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
 * Calculate correct event timestamps based on order date and ETA
 * Uses a more realistic distribution based on typical logistics timelines
 */
function calculateEventTimestamps(
  orderDate: Date,
  expectedDelivery: Date,
  eventStages: string[],
  mode: string,
): Date[] {
  const timestamps: Date[] = [];
  const totalDuration = expectedDelivery.getTime() - orderDate.getTime();
  const numEvents = eventStages.length;

  if (numEvents === 0) return timestamps;
  if (numEvents === 1) {
    timestamps.push(new Date(orderDate.getTime() + totalDuration * 0.5));
    return timestamps;
  }

  // Create a more realistic distribution:
  // - First 30% of events happen in first 20% of time (initial processing)
  // - Middle 40% of events happen in middle 60% of time (transit)
  // - Last 30% of events happen in last 20% of time (delivery)
  
  const firstPhaseEvents = Math.ceil(numEvents * 0.3);
  const middlePhaseEvents = Math.ceil(numEvents * 0.4);
  const lastPhaseEvents = numEvents - firstPhaseEvents - middlePhaseEvents;

  let currentTime = orderDate.getTime();
  let eventIndex = 0;

  // First phase: Initial processing (20% of total time)
  const firstPhaseDuration = totalDuration * 0.2;
  for (let i = 0; i < firstPhaseEvents; i++) {
    const progress = i / Math.max(1, firstPhaseEvents - 1);
    const timestamp = new Date(currentTime + firstPhaseDuration * progress);
    timestamps.push(timestamp);
    eventIndex++;
  }
  currentTime += firstPhaseDuration;

  // Middle phase: Transit (60% of total time)
  const middlePhaseDuration = totalDuration * 0.6;
  for (let i = 0; i < middlePhaseEvents; i++) {
    const progress = i / Math.max(1, middlePhaseEvents - 1);
    const timestamp = new Date(currentTime + middlePhaseDuration * progress);
    timestamps.push(timestamp);
    eventIndex++;
  }
  currentTime += middlePhaseDuration;

  // Last phase: Delivery (20% of total time)
  const lastPhaseDuration = totalDuration * 0.2;
  for (let i = 0; i < lastPhaseEvents; i++) {
    const progress = i / Math.max(1, lastPhaseEvents - 1);
    const timestamp = new Date(currentTime + lastPhaseDuration * progress);
    timestamps.push(timestamp);
    eventIndex++;
  }

  // Ensure the last event is at or before expected delivery
  if (timestamps.length > 0) {
    const lastTimestamp = timestamps[timestamps.length - 1];
    if (lastTimestamp.getTime() > expectedDelivery.getTime()) {
      timestamps[timestamps.length - 1] = new Date(expectedDelivery.getTime());
    }
  }

  return timestamps;
}

/**
 * Fix event timestamps for all shipments
 */
async function fixEventTimestamps() {
  console.log('🔧 Fixing event timestamps...\n');

  // Fetch all shipments
  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('shipment_id, order_date, expected_delivery, mode')
    .order('shipment_id');

  if (shipmentsError) {
    console.error('❌ Error fetching shipments:', shipmentsError);
    process.exit(1);
  }

  if (!shipments || shipments.length === 0) {
    console.log('⚠️  No shipments found');
    return;
  }

  console.log(`📦 Found ${shipments.length} shipments to fix\n`);

  let fixedCount = 0;

  for (const shipment of shipments) {
    const shipmentId = shipment.shipment_id;
    const orderDate = new Date(shipment.order_date);
    const expectedDelivery = new Date(shipment.expected_delivery);
    const mode = shipment.mode || 'Air';

    // Fetch all events for this shipment
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('event_id, event_stage, description, location')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: true }); // Use created_at to preserve original order

    if (eventsError) {
      console.error(`❌ Error fetching events for ${shipmentId}:`, eventsError);
      continue;
    }

    if (!events || events.length === 0) {
      console.log(`⚠️  No events found for ${shipmentId}`);
      continue;
    }

    // Calculate correct timestamps
    const eventStages = events.map((e) => e.event_stage);
    const correctTimestamps = calculateEventTimestamps(
      orderDate,
      expectedDelivery,
      eventStages,
      mode,
    );

    // Update each event with correct timestamp
    const updates = events.map((event, index) => ({
      event_id: event.event_id,
      shipment_id: shipmentId,
      event_time: correctTimestamps[index].toISOString(),
      event_stage: event.event_stage,
      description: event.description,
      location: event.location,
    }));

    // Delete old events and insert corrected ones
    // We need to delete first because of the UNIQUE constraint
    const { error: deleteError } = await supabase
      .from('shipment_events')
      .delete()
      .eq('shipment_id', shipmentId);

    if (deleteError) {
      console.error(`❌ Error deleting events for ${shipmentId}:`, deleteError);
      continue;
    }

    // Insert corrected events
    const { error: insertError } = await supabase
      .from('shipment_events')
      .insert(updates);

    if (insertError) {
      console.error(`❌ Error inserting corrected events for ${shipmentId}:`, insertError);
      continue;
    }

    fixedCount++;
    console.log(`✅ Fixed ${shipmentId}: ${events.length} events`);
  }

  console.log(`\n✅ Fixed timestamps for ${fixedCount} shipments!`);
}

async function main() {
  console.log('🚀 Starting event timestamp fix...\n');

  try {
    await fixEventTimestamps();
    console.log('\n✅ All timestamps fixed successfully!');
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

main();

