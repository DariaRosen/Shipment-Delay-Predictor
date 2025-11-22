import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  // Check for old tables
  const { error: alertsError } = await supabase.from('alerts').select('shipment_id').limit(1);
  const { error: stepsError } = await supabase.from('shipment_steps').select('id').limit(1);

  console.log('Old schema:');
  console.log(`  - alerts table: ${alertsError?.code === '42P01' ? '❌ Not found' : '✅ Exists'}`);
  console.log(`  - shipment_steps table: ${stepsError?.code === '42P01' ? '❌ Not found' : '✅ Exists'}`);

  // Check for new tables
  const { error: shipmentsError } = await supabase.from('shipments').select('shipment_id').limit(1);
  const { error: eventsError } = await supabase.from('shipment_events').select('event_id').limit(1);

  console.log('\nNew schema:');
  console.log(`  - shipments table: ${shipmentsError?.code === '42P01' ? '❌ Not found' : '✅ Exists'}`);
  console.log(`  - shipment_events table: ${eventsError?.code === '42P01' ? '❌ Not found' : '✅ Exists'}`);

  if (shipmentsError?.code === '42P01' || eventsError?.code === '42P01') {
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('   Please run schema-normalized.sql in Supabase SQL Editor');
    console.log('   File location: backend/supabase/schema-normalized.sql');
    process.exit(1);
  }

  console.log('\n✅ Schema is ready for migration!');
}

checkSchema();

