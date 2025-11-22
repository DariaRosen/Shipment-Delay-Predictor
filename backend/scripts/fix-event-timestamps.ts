import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateShipmentSteps } from '../src/alerts/data/shipment-steps-generator';
import { Mode } from '../src/alerts/types/alert-shipment.interface';

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
 * Fix event timestamps for all shipments
 */
async function fixEventTimestamps() {
  console.log('🔧 Fixing event timestamps...\n');

  // Fetch all shipments
  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('shipment_id, order_date, expected_delivery, mode, current_status')
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
    const mode = (shipment.mode || 'Air') as Mode;
    const currentStage = shipment.current_status || 'In Transit';

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

    // Generate steps using the step generator to get proper timestamps
    const steps = generateShipmentSteps(mode, orderDate, expectedDelivery, currentStage);
    
    // Create a map of event stage to timestamp
    // Match events to steps by name similarity
    const updates = events.map((event) => {
      // Find matching step by comparing event stage with step name
      const matchingStep = steps.find((step) => {
        const eventStageLower = event.event_stage.toLowerCase();
        const stepNameLower = step.stepName.toLowerCase();
        // Check if they match (either contains or is contained)
        return (
          stepNameLower.includes(eventStageLower.substring(0, 20)) ||
          eventStageLower.includes(stepNameLower.substring(0, 20)) ||
          stepNameLower === eventStageLower
        );
      });
      
      if (matchingStep) {
        // Use actualCompletionTime if available, otherwise expectedCompletionTime
        const timestamp = matchingStep.actualCompletionTime
          ? new Date(matchingStep.actualCompletionTime)
          : matchingStep.expectedCompletionTime
            ? new Date(matchingStep.expectedCompletionTime)
            : orderDate;
        
        return {
          event_id: event.event_id,
          shipment_id: shipmentId,
          event_time: timestamp.toISOString(),
          event_stage: event.event_stage,
          description: event.description,
          location: event.location,
        };
      } else {
        // If no match found, distribute chronologically based on event order
        const eventIndex = events.findIndex((e) => e.event_id === event.event_id);
        const totalDuration = expectedDelivery.getTime() - orderDate.getTime();
        const progress = (eventIndex + 1) / (events.length + 1);
        const timestamp = new Date(orderDate.getTime() + totalDuration * progress);
        
        console.warn(`⚠️  No step match for event stage: "${event.event_stage}" in ${shipmentId}, using distributed timestamp`);
        
        return {
          event_id: event.event_id,
          shipment_id: shipmentId,
          event_time: timestamp.toISOString(),
          event_stage: event.event_stage,
          description: event.description,
          location: event.location,
        };
      }
    });

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

