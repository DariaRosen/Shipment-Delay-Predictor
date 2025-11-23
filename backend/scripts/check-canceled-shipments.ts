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

async function checkCanceledShipments() {
  console.log('🔍 Checking canceled shipments...\n');

  // Get all canceled shipments
  const { data: canceledShipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('shipment_id, order_date, expected_delivery, current_status')
    .eq('current_status', 'Canceled')
    .order('shipment_id');

  if (shipmentsError) {
    console.error('❌ Error fetching canceled shipments:', shipmentsError);
    process.exit(1);
  }

  if (!canceledShipments || canceledShipments.length === 0) {
    console.log('⚠️  No canceled shipments found.');
    return;
  }

  console.log(`📦 Found ${canceledShipments.length} canceled shipments\n`);

  for (const shipment of canceledShipments) {
    console.log(`\n📦 ${shipment.shipment_id}:`);
    console.log(`   Status: ${shipment.current_status}`);
    console.log(`   Order Date: ${shipment.order_date}`);
    console.log(`   Expected Delivery: ${shipment.expected_delivery}`);
    
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('event_stage, event_time, description')
      .eq('shipment_id', shipment.shipment_id)
      .order('event_time');

    if (eventsError) {
      console.error(`   ❌ Error fetching events:`, eventsError);
      continue;
    }

    console.log(`   Total events: ${events?.length || 0}`);
    
    if (events && events.length > 0) {
      console.log(`   First event: ${events[0].event_stage} at ${events[0].event_time}`);
      console.log(`   Last event: ${events[events.length - 1].event_stage} at ${events[events.length - 1].event_time}`);
      
      const refundEvents = events.filter(e => 
        e.event_stage.toLowerCase().includes('refund') || 
        e.event_stage.toLowerCase().includes('refound')
      );
      
      if (refundEvents.length > 0) {
        console.log(`   ✅ Found ${refundEvents.length} refund event(s):`);
        refundEvents.forEach(e => {
          console.log(`      - ${e.event_stage} at ${e.event_time}`);
          if (e.description) {
            console.log(`        Description: ${e.description.substring(0, 100)}...`);
          }
        });
      } else {
        console.log(`   ❌ NO REFUND EVENT FOUND!`);
        console.log(`   All event stages:`);
        events.forEach((e, i) => {
          console.log(`      ${i + 1}. ${e.event_stage}`);
        });
      }
    }
  }
}

checkCanceledShipments();

