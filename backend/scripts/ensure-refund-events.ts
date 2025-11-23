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

async function ensureRefundEvents() {
  console.log('🔍 Checking canceled shipments for refund events...\n');

  // Get all canceled shipments
  const { data: canceledShipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('shipment_id, expected_delivery')
    .eq('current_status', 'Canceled');

  if (shipmentsError) {
    console.error('❌ Error fetching canceled shipments:', shipmentsError);
    process.exit(1);
  }

  if (!canceledShipments || canceledShipments.length === 0) {
    console.log('✅ No canceled shipments found.');
    return;
  }

  console.log(`📦 Found ${canceledShipments.length} canceled shipments\n`);

  let fixedCount = 0;
  const now = new Date();

  for (const shipment of canceledShipments) {
    // Check if refund event exists
    const { data: refundEvents, error: eventsError } = await supabase
      .from('shipment_events')
      .select('event_id')
      .eq('shipment_id', shipment.shipment_id)
      .eq('event_stage', 'Refund customer');

    if (eventsError) {
      console.error(`❌ Error checking events for ${shipment.shipment_id}:`, eventsError);
      continue;
    }

    if (!refundEvents || refundEvents.length === 0) {
      // Calculate days past ETA
      const expectedDelivery = new Date(shipment.expected_delivery);
      const daysPastETA = Math.floor((now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24));

      // Add refund event
      const { error: insertError } = await supabase.from('shipment_events').insert({
        shipment_id: shipment.shipment_id,
        event_time: now.toISOString(),
        event_stage: 'Refund customer',
        description: `Shipment was stuck in the same step for more than 30 days and is ${daysPastETA} days past the expected delivery date (14+ days delay). Refund has been processed.`,
        location: null,
      });

      if (insertError) {
        console.error(`❌ Error adding refund event for ${shipment.shipment_id}:`, insertError);
      } else {
        console.log(`✅ Added refund event for ${shipment.shipment_id}`);
        fixedCount++;
      }
    } else {
      console.log(`✓ ${shipment.shipment_id} already has refund event`);
    }
  }

  console.log(`\n✅ Done! Fixed ${fixedCount} shipment(s).`);
}

ensureRefundEvents();

