import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExpectedVsActual(shipmentId: string) {
  const { data: shipment } = await supabase
    .from('shipments')
    .select('shipment_id, order_date, expected_delivery')
    .eq('shipment_id', shipmentId)
    .single();

  const { data: events } = await supabase
    .from('shipment_events')
    .select('event_time, event_stage')
    .eq('shipment_id', shipmentId)
    .order('event_time', { ascending: false })
    .limit(1);

  if (!shipment || !events || events.length === 0) {
    console.log(`Shipment ${shipmentId} not found`);
    return;
  }

  const now = new Date('2025-11-22T12:00:00Z');
  const expectedDelivery = new Date(shipment.expected_delivery);
  const lastEvent = new Date(events[0].event_time);
  
  const daysPastEta = (now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24);
  const lastEventDaysAgo = (now.getTime() - lastEvent.getTime()) / (1000 * 60 * 60 * 24);
  
  console.log(`\n${shipmentId}:`);
  console.log(`  Expected Delivery: ${expectedDelivery.toISOString()}`);
  console.log(`  Last Event: ${lastEvent.toISOString()} (${lastEventDaysAgo.toFixed(1)} days ago)`);
  console.log(`  Days Past ETA: ${daysPastEta.toFixed(1)}`);
  console.log(`  Last Event Stage: ${events[0].event_stage}`);
  console.log(`  Has Actual Delay: ${daysPastEta > 0 ? 'YES' : 'NO'}`);
}

const shipmentIds = process.argv.slice(2);
if (shipmentIds.length === 0) {
  console.error('Usage: ts-node check-expected-vs-actual.ts <shipmentId1> [shipmentId2] ...');
  process.exit(1);
}

Promise.all(shipmentIds.map(id => checkExpectedVsActual(id))).catch(console.error);


