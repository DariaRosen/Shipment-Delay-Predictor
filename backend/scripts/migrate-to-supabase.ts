import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { sampleAlerts } from '../src/alerts/data/sample-alerts';
import * as path from 'path';
import * as fs from 'fs';

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

// Schema migration should be done manually in Supabase SQL Editor
// This function is kept for reference but not executed
async function checkSchema() {
  const { data, error } = await supabase
    .from('alerts')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    console.error(
      '❌ Table "alerts" does not exist!\n' +
        'Please run the schema.sql file in Supabase SQL Editor first.\n' +
        'See SUPABASE_SETUP.md for instructions.',
    );
    return false;
  }
  return true;
}

async function seedData() {
  console.log('🌱 Seeding sample alerts data...');

  const alertsToInsert = sampleAlerts.map((alert) => ({
    shipment_id: alert.shipmentId,
    origin: alert.origin,
    destination: alert.destination,
    mode: alert.mode,
    carrier_name: alert.carrierName,
    service_level: alert.serviceLevel,
    current_stage: alert.currentStage,
    planned_eta: alert.plannedEta,
    days_to_eta: alert.daysToEta,
    last_milestone_update: alert.lastMilestoneUpdate,
    risk_score: alert.riskScore,
    severity: alert.severity,
    risk_reasons: alert.riskReasons,
    owner: alert.owner,
    acknowledged: alert.acknowledged || false,
    acknowledged_by: alert.acknowledgedBy || null,
    acknowledged_at: alert.acknowledgedAt || null,
  }));

  // Insert in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < alertsToInsert.length; i += batchSize) {
    const batch = alertsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('alerts').upsert(batch, {
      onConflict: 'shipment_id',
    });

    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(
        `✅ Inserted batch ${i / batchSize + 1} (${batch.length} alerts)`,
      );
    }
  }

  console.log(`✅ Successfully seeded ${alertsToInsert.length} alerts!`);
}

async function main() {
  console.log('🚀 Starting Supabase data migration...\n');

  try {
    // Check if schema exists
    const schemaExists = await checkSchema();
    if (!schemaExists) {
      process.exit(1);
    }

    console.log('✅ Schema verified, proceeding with data migration...\n');

    // Seed the data
    await seedData();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 You can now view your data in the Supabase dashboard.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();

