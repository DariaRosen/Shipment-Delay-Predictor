import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { sampleAlerts } from '../src/alerts/data/sample-alerts';
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
 * Convert old alert format to new normalized format (shipments + events)
 */
async function migrateToNormalized() {
  console.log('🔄 Migrating from alerts table to normalized shipments + events...\n');

  // Check if old alerts table exists
  const { data: oldAlerts, error: alertsError } = await supabase
    .from('alerts')
    .select('*')
    .limit(1);

  if (alertsError && alertsError.code === '42P01') {
    console.log('ℹ️  Old alerts table does not exist, using sample data...\n');
    await migrateSampleData();
    return;
  }

  // Fetch all alerts
  const { data: allAlerts, error: fetchError } = await supabase
    .from('alerts')
    .select('*');

  if (fetchError) {
    console.error('❌ Error fetching alerts:', fetchError);
    process.exit(1);
  }

  if (!allAlerts || allAlerts.length === 0) {
    console.log('ℹ️  No alerts found, using sample data...\n');
    await migrateSampleData();
    return;
  }

  console.log(`📦 Found ${allAlerts.length} alerts to migrate\n`);

  // Fetch steps for all alerts
  const shipmentIds = allAlerts.map((a) => a.shipment_id);
  const { data: allSteps } = await supabase
    .from('shipment_steps')
    .select('*')
    .in('shipment_id', shipmentIds)
    .order('shipment_id, step_order', { ascending: true });

  // Group steps by shipment_id
  const stepsByShipment = new Map<string, any[]>();
  (allSteps || []).forEach((step) => {
    if (!stepsByShipment.has(step.shipment_id)) {
      stepsByShipment.set(step.shipment_id, []);
    }
    stepsByShipment.get(step.shipment_id)!.push(step);
  });

  // Convert each alert to shipment + events
  const shipmentsToInsert: any[] = [];
  const eventsToInsert: any[] = [];

  for (const alert of allAlerts) {
    // Extract origin and destination cities
    const originParts = alert.origin.split(',').map((s: string) => s.trim());
    const destParts = alert.destination.split(',').map((s: string) => s.trim());

    // Create shipment record
    shipmentsToInsert.push({
      shipment_id: alert.shipment_id,
      order_date: new Date(
        new Date(alert.planned_eta).getTime() -
          alert.days_to_eta * 24 * 60 * 60 * 1000,
      ).toISOString(), // Estimate order date
      origin_country: originParts[originParts.length - 1] || '',
      origin_city: originParts[0] || alert.origin,
      dest_country: destParts[destParts.length - 1] || '',
      dest_city: destParts[0] || alert.destination,
      expected_delivery: alert.planned_eta,
      current_status: alert.current_stage,
      carrier: alert.carrier_name,
      service_level: alert.service_level,
      mode: alert.mode,
      priority_level: 'normal',
      owner: alert.owner,
      acknowledged: alert.acknowledged || false,
      acknowledged_by: alert.acknowledged_by || null,
      acknowledged_at: alert.acknowledged_at || null,
    });

    // Convert steps to events
    const steps = stepsByShipment.get(alert.shipment_id) || [];
    if (steps.length > 0) {
      steps.forEach((step) => {
        eventsToInsert.push({
          shipment_id: alert.shipment_id,
          event_time: step.actual_completion_time || step.expected_completion_time,
          event_stage: step.step_name,
          description: step.step_description || null,
          location: step.location || null,
        });
      });
    } else {
      // If no steps, create at least one event from last milestone
      eventsToInsert.push({
        shipment_id: alert.shipment_id,
        event_time: alert.last_milestone_update,
        event_stage: alert.current_stage,
        description: null,
        location: null,
      });
    }
  }

  // Insert shipments
  console.log('📥 Inserting shipments...');
  const batchSize = 10;
  for (let i = 0; i < shipmentsToInsert.length; i += batchSize) {
    const batch = shipmentsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('shipments').upsert(batch, {
      onConflict: 'shipment_id',
    });

    if (error) {
      console.error(`❌ Error inserting shipments batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(
        `✅ Inserted shipments batch ${i / batchSize + 1} (${batch.length} shipments)`,
      );
    }
  }

  // Insert events
  console.log('\n📥 Inserting events...');
  for (let i = 0; i < eventsToInsert.length; i += batchSize * 5) {
    const batch = eventsToInsert.slice(i, i + batchSize * 5);
    const { error } = await supabase.from('shipment_events').upsert(batch, {
      onConflict: 'shipment_id,event_time,event_stage',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`❌ Error inserting events batch ${Math.floor(i / (batchSize * 5)) + 1}:`, error);
    } else {
      console.log(
        `✅ Inserted events batch ${Math.floor(i / (batchSize * 5)) + 1} (${batch.length} events)`,
      );
    }
  }

  console.log(`\n✅ Migration completed!`);
  console.log(`   - ${shipmentsToInsert.length} shipments`);
  console.log(`   - ${eventsToInsert.length} events`);
}

/**
 * Migrate sample data (if no existing data)
 */
async function migrateSampleData() {
  console.log('📦 Migrating sample alerts data...\n');

  const shipmentsToInsert: any[] = [];
  const eventsToInsert: any[] = [];

  for (const alert of sampleAlerts) {
    // Extract origin and destination
    const originParts = alert.origin.split(',').map((s) => s.trim());
    const destParts = alert.destination.split(',').map((s) => s.trim());

    // Estimate order date from planned ETA and days to ETA
    const orderDate = new Date(
      new Date(alert.plannedEta).getTime() - alert.daysToEta * 24 * 60 * 60 * 1000,
    );

    shipmentsToInsert.push({
      shipment_id: alert.shipmentId,
      order_date: orderDate.toISOString(),
      origin_country: originParts[originParts.length - 1] || '',
      origin_city: originParts[0] || alert.origin,
      dest_country: destParts[destParts.length - 1] || '',
      dest_city: destParts[0] || alert.destination,
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
    if (alert.steps && alert.steps.length > 0) {
      alert.steps.forEach((step) => {
        eventsToInsert.push({
          shipment_id: alert.shipmentId,
          event_time: step.actualCompletionTime || step.expectedCompletionTime,
          event_stage: step.stepName,
          description: step.stepDescription || null,
          location: step.location || null,
        });
      });
    } else {
      // Fallback: create event from last milestone
      eventsToInsert.push({
        shipment_id: alert.shipmentId,
        event_time: alert.lastMilestoneUpdate,
        event_stage: alert.currentStage,
        description: null,
        location: null,
      });
    }
  }

  // Insert shipments
  console.log('📥 Inserting shipments...');
  const batchSize = 10;
  for (let i = 0; i < shipmentsToInsert.length; i += batchSize) {
    const batch = shipmentsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('shipments').upsert(batch, {
      onConflict: 'shipment_id',
    });

    if (error) {
      console.error(`❌ Error inserting shipments batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(
        `✅ Inserted shipments batch ${i / batchSize + 1} (${batch.length} shipments)`,
      );
    }
  }

  // Insert events
  console.log('\n📥 Inserting events...');
  for (let i = 0; i < eventsToInsert.length; i += batchSize * 5) {
    const batch = eventsToInsert.slice(i, i + batchSize * 5);
    const { error } = await supabase.from('shipment_events').upsert(batch, {
      onConflict: 'shipment_id,event_time,event_stage',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`❌ Error inserting events batch ${Math.floor(i / (batchSize * 5)) + 1}:`, error);
    } else {
      console.log(
        `✅ Inserted events batch ${Math.floor(i / (batchSize * 5)) + 1} (${batch.length} events)`,
      );
    }
  }

  console.log(`\n✅ Migration completed!`);
  console.log(`   - ${shipmentsToInsert.length} shipments`);
  console.log(`   - ${eventsToInsert.length} events`);
}

async function main() {
  console.log('🚀 Starting migration to normalized schema...\n');

  try {
    // Check if new tables exist
    const { data: shipmentsCheck, error: shipmentsError } = await supabase
      .from('shipments')
      .select('shipment_id')
      .limit(1);

    if (shipmentsError && shipmentsError.code === '42P01') {
      console.error(
        '❌ Table "shipments" does not exist!\n' +
          'Please run schema-normalized.sql in Supabase SQL Editor first.\n',
      );
      process.exit(1);
    }

    console.log('✅ Schema verified, proceeding with migration...\n');

    await migrateToNormalized();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 You can now view your data in the Supabase dashboard.');
    console.log('⚠️  Note: The old alerts and shipment_steps tables can be dropped if no longer needed.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();

