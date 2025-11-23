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

async function verifyData() {
  console.log('🔍 Verifying database data...\n');

  // Check shipment counts by status
  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('shipment_id, current_status, order_date, expected_delivery')
    .order('shipment_id');

  if (shipmentsError) {
    console.error('❌ Error fetching shipments:', shipmentsError);
    process.exit(1);
  }

  const statusCounts = shipments.reduce((acc, s) => {
    acc[s.current_status] = (acc[s.current_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 Shipment counts by status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  // Check event counts
  const { count: eventCount, error: eventsError } = await supabase
    .from('shipment_events')
    .select('*', { count: 'exact', head: true });

  if (eventsError) {
    console.error('❌ Error counting events:', eventsError);
    process.exit(1);
  }

  console.log(`\n📊 Total events: ${eventCount}`);

  // Check a sample canceled shipment
  const canceledShipment = shipments.find(s => s.current_status === 'Canceled');
  if (canceledShipment) {
    console.log(`\n🔍 Sample canceled shipment: ${canceledShipment.shipment_id}`);
    const { data: events } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', canceledShipment.shipment_id)
      .order('event_time');
    
    if (events && events.length > 0) {
      console.log(`   Events: ${events.length}`);
      console.log(`   First event: ${events[0].event_stage} at ${events[0].event_time}`);
      console.log(`   Last event: ${events[events.length - 1].event_stage} at ${events[events.length - 1].event_time}`);
    }
  }

  // Check a sample in-progress shipment
  const inProgressShipment = shipments.find(s => s.current_status === 'In Transit');
  if (inProgressShipment) {
    console.log(`\n🔍 Sample in-progress shipment: ${inProgressShipment.shipment_id}`);
    const { data: events } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', inProgressShipment.shipment_id)
      .order('event_time');
    
    if (events && events.length > 0) {
      console.log(`   Events: ${events.length}`);
      console.log(`   First event: ${events[0].event_stage} at ${events[0].event_time}`);
      console.log(`   Last event: ${events[events.length - 1].event_stage} at ${events[events.length - 1].event_time}`);
      const lastEventTime = new Date(events[events.length - 1].event_time);
      const now = new Date();
      const daysSinceLastEvent = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24);
      console.log(`   Days since last event: ${daysSinceLastEvent.toFixed(2)}`);
    }
  }

  // Check a sample future shipment
  const futureShipment = shipments.find(s => s.current_status === 'Order scheduled');
  if (futureShipment) {
    console.log(`\n🔍 Sample future shipment: ${futureShipment.shipment_id}`);
    const orderDate = new Date(futureShipment.order_date);
    const now = new Date();
    const daysUntilOrder = (orderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    console.log(`   Order date: ${futureShipment.order_date}`);
    console.log(`   Days until order: ${daysUntilOrder.toFixed(2)}`);
    
    const { data: events } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', futureShipment.shipment_id)
      .order('event_time');
    
    if (events && events.length > 0) {
      console.log(`   Events: ${events.length}`);
      console.log(`   First event: ${events[0].event_stage} at ${events[0].event_time}`);
    }
  }

  // Check a sample completed shipment
  const completedShipment = shipments.find(s => s.current_status === 'Delivered');
  if (completedShipment) {
    console.log(`\n🔍 Sample completed shipment: ${completedShipment.shipment_id}`);
    const { data: events } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', completedShipment.shipment_id)
      .order('event_time');
    
    if (events && events.length > 0) {
      console.log(`   Events: ${events.length}`);
      console.log(`   First event: ${events[0].event_stage} at ${events[0].event_time}`);
      const lastEvent = events[events.length - 1];
      console.log(`   Last event: ${lastEvent.event_stage} at ${lastEvent.event_time}`);
      if (lastEvent.event_stage === 'Package received by customer') {
        console.log(`   ✅ Properly completed`);
      }
    }
  }

  console.log('\n✅ Data verification complete!');
}

verifyData();

