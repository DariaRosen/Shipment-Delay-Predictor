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

async function verifyCanceledRefunds() {
  console.log('🔍 Verifying canceled shipments have refund events...\n');

  // Get all canceled shipments
  const { data: canceledShipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('shipment_id')
    .eq('current_status', 'Canceled');

  if (shipmentsError) {
    console.error('❌ Error fetching canceled shipments:', shipmentsError);
    process.exit(1);
  }

  if (!canceledShipments || canceledShipments.length === 0) {
    console.log('⚠️  No canceled shipments found.');
    return;
  }

  console.log(`📦 Found ${canceledShipments.length} canceled shipments\n`);

  let missingRefunds = 0;

  for (const shipment of canceledShipments) {
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('event_stage, event_time')
      .eq('shipment_id', shipment.shipment_id)
      .order('event_time');

    if (eventsError) {
      console.error(`❌ Error fetching events for ${shipment.shipment_id}:`, eventsError);
      continue;
    }

    const hasRefund = events?.some(e => e.event_stage === 'Refund customer');

    if (!hasRefund) {
      console.log(`❌ ${shipment.shipment_id} - Missing refund event`);
      missingRefunds++;
    } else {
      const refundEvent = events.find(e => e.event_stage === 'Refund customer');
      console.log(`✅ ${shipment.shipment_id} - Has refund event (${refundEvent?.event_time})`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total canceled shipments: ${canceledShipments.length}`);
  console.log(`   With refund events: ${canceledShipments.length - missingRefunds}`);
  console.log(`   Missing refund events: ${missingRefunds}`);

  if (missingRefunds > 0) {
    console.log('\n⚠️  Some canceled shipments are missing refund events!');
    console.log('   Run: npm run reset:db to regenerate data');
  } else {
    console.log('\n✅ All canceled shipments have refund events!');
  }
}

verifyCanceledRefunds();

