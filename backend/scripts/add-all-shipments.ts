import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { sampleAlerts } from '../src/alerts/data/sample-alerts';
import * as path from 'path';
import { generateShipmentSteps } from '../src/alerts/data/shipment-steps-generator';

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
 * Calculate order date from ETA based on typical shipment duration
 */
function calculateOrderDateFromEta(eta: Date, mode: string): Date {
  // Typical shipment durations by mode (in days)
  const typicalDurations: Record<string, number> = {
    Air: 5,    // Air shipments typically take 3-7 days
    Sea: 25,   // Sea shipments typically take 20-30 days
    Road: 3,   // Road shipments typically take 2-5 days
  };
  
  const typicalDuration = typicalDurations[mode] || 10;
  // Add some variance: 80-120% of typical duration
  const variance = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  const actualDuration = typicalDuration * variance;
  
  return new Date(eta.getTime() - actualDuration * 24 * 60 * 60 * 1000);
}

/**
 * Add all shipments from sample-alerts.ts to the database
 */
async function addAllShipments() {
  console.log('📦 Adding all shipments from sample data...\n');
  console.log(`Total shipments to add: ${sampleAlerts.length}\n`);

  const shipmentsToInsert: any[] = [];
  const eventsToInsert: any[] = [];

  for (const alert of sampleAlerts) {
    const plannedEtaDate = new Date(alert.plannedEta);
    
    // Extract order date from existing steps if available
    // The first step is usually "order created" and its expectedCompletionTime is the order date
    let orderDate: Date;
    let steps = alert.steps;
    
    if (steps && steps.length > 0) {
      // Find the "order created" step and use its expectedCompletionTime as order date
      const orderCreatedStep = steps.find((step) =>
        step.stepName.toLowerCase().includes('order has been successfully created'),
      );
      
      if (orderCreatedStep?.expectedCompletionTime) {
        orderDate = new Date(orderCreatedStep.expectedCompletionTime);
      } else if (steps[0]?.expectedCompletionTime) {
        // Fallback: use first step's expected time
        orderDate = new Date(steps[0].expectedCompletionTime);
      } else {
        // Calculate from ETA
        orderDate = calculateOrderDateFromEta(plannedEtaDate, alert.mode);
      }
    } else {
      // Calculate order date from ETA based on typical shipment duration
      orderDate = calculateOrderDateFromEta(plannedEtaDate, alert.mode);
      // Generate steps with calculated order date
      steps = generateShipmentSteps(
        alert.mode,
        orderDate,
        plannedEtaDate,
        alert.currentStage,
      );
    }
    
    // Ensure order date is at least 1 day before ETA (safety check)
    if (orderDate >= plannedEtaDate) {
      // If order date is after or equal to ETA, recalculate
      orderDate = calculateOrderDateFromEta(plannedEtaDate, alert.mode);
    }
    
    // Final safety check: ensure order date is at least 1 day before ETA
    const oneDayBeforeEta = new Date(plannedEtaDate.getTime() - 24 * 60 * 60 * 1000);
    if (orderDate >= oneDayBeforeEta) {
      orderDate = new Date(oneDayBeforeEta.getTime() - 24 * 60 * 60 * 1000);
    }

    shipmentsToInsert.push({
      shipment_id: alert.shipmentId,
      order_date: orderDate.toISOString(),
      origin_country: 'Unknown',
      origin_city: alert.origin,
      dest_country: 'Unknown',
      dest_city: alert.destination,
      expected_delivery: alert.plannedEta,
      current_status: alert.currentStage,
      carrier: alert.carrierName,
      service_level: alert.serviceLevel,
      mode: alert.mode,
      priority_level: 'normal',
      owner: alert.owner,
      acknowledged: alert.acknowledged || false,
      acknowledged_by: alert.acknowledgedBy || null,
      acknowledged_at: alert.acknowledgedAt || null,
    });

    // Convert steps to events
    steps.forEach((step, index) => {
      // Use actualCompletionTime if available, otherwise expectedCompletionTime
      const eventTime = step.actualCompletionTime || step.expectedCompletionTime;
      if (eventTime) {
        eventsToInsert.push({
          shipment_id: alert.shipmentId,
          event_time: eventTime,
          event_stage: step.stepName,
          description: step.stepDescription || null,
          location: step.location || null,
        });
      }
    });
  }

  // Insert/update shipments (upsert will insert new ones and update existing ones)
  console.log('📥 Inserting/updating shipments...');
  const batchSize = 10;

  for (let i = 0; i < shipmentsToInsert.length; i += batchSize) {
    const batch = shipmentsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('shipments').upsert(batch, {
      onConflict: 'shipment_id',
    });

    if (error) {
      console.error(`❌ Error upserting shipments batch ${Math.floor(i / batchSize) + 1}:`, error);
    } else {
      console.log(
        `✅ Upserted shipments batch ${Math.floor(i / batchSize) + 1} (${batch.length} shipments)`,
      );
    }
  }

  // Delete existing events for these shipments and insert new ones
  console.log('\n📥 Updating events...');
  const allShipmentIds = shipmentsToInsert.map((s) => s.shipment_id);
  
  // Delete existing events
  const { error: deleteError } = await supabase
    .from('shipment_events')
    .delete()
    .in('shipment_id', allShipmentIds);

  if (deleteError) {
    console.error('❌ Error deleting existing events:', deleteError);
  } else {
    console.log(`✅ Deleted existing events for ${allShipmentIds.length} shipments`);
  }

  // Insert new events
  for (let i = 0; i < eventsToInsert.length; i += batchSize * 5) {
    const batch = eventsToInsert.slice(i, i + batchSize * 5);
    const { error } = await supabase.from('shipment_events').insert(batch);

    if (error) {
      console.error(`❌ Error inserting events batch ${Math.floor(i / (batchSize * 5)) + 1}:`, error);
    } else {
      console.log(
        `✅ Inserted events batch ${Math.floor(i / (batchSize * 5)) + 1} (${batch.length} events)`,
      );
    }
  }

  console.log(`\n✅ Completed!`);
  console.log(`   - ${shipmentsToInsert.length} shipments processed (inserted/updated)`);
  console.log(`   - ${eventsToInsert.length} events inserted`);
}

async function main() {
  console.log('🚀 Starting to add all shipments...\n');

  try {
    await addAllShipments();
    console.log('\n✅ All shipments added successfully!');
  } catch (error) {
    console.error('❌ Failed to add shipments:', error);
    process.exit(1);
  }
}

main();

