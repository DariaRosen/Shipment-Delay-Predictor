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

async function checkShipmentRisk(shipmentId: string) {
  console.log(`🔍 Checking risk factors for ${shipmentId}...\n`);

  // Get shipment data
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('*')
    .eq('shipment_id', shipmentId)
    .single();

  if (shipmentError || !shipment) {
    console.error(`❌ Error fetching shipment:`, shipmentError);
    process.exit(1);
  }

  console.log('📦 Shipment Data:');
  console.log(`   ID: ${shipment.shipment_id}`);
  console.log(`   Status: ${shipment.current_status}`);
  console.log(`   Mode: ${shipment.mode}`);
  console.log(`   Origin: ${shipment.origin_city}, ${shipment.origin_country}`);
  console.log(`   Destination: ${shipment.dest_city}, ${shipment.dest_country}`);
  console.log(`   Order Date: ${shipment.order_date}`);
  console.log(`   Expected Delivery: ${shipment.expected_delivery}`);
  console.log(`   Last Update: ${shipment.last_update || 'N/A'}`);

  // Get events
  const { data: events, error: eventsError } = await supabase
    .from('shipment_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('event_time');

  if (eventsError) {
    console.error(`❌ Error fetching events:`, eventsError);
    process.exit(1);
  }

  console.log(`\n📋 Events (${events?.length || 0}):`);
  if (events && events.length > 0) {
    events.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.event_stage} - ${event.event_time}`);
    });
    
    const latestEvent = events[events.length - 1];
    console.log(`\n   Latest Event: ${latestEvent.event_stage} at ${latestEvent.event_time}`);
    
    const now = new Date();
    const lastEventTime = new Date(latestEvent.event_time);
    const daysSinceLastEvent = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24);
    console.log(`   Days since last event: ${daysSinceLastEvent.toFixed(2)}`);
  }

  // Calculate risk factors manually
  console.log(`\n🔍 Risk Factor Analysis:`);
  
  const now = new Date();
  const expectedDelivery = new Date(shipment.expected_delivery);
  const daysToEta = (expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  console.log(`   Days to ETA: ${daysToEta.toFixed(2)}`);

  if (events && events.length > 0) {
    const latestEvent = events[events.length - 1];
    const lastEventTime = new Date(latestEvent.event_time);
    const daysSinceLastEvent = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24);
    
    console.log(`\n   Stale Status Check:`);
    console.log(`      Days since last event: ${daysSinceLastEvent.toFixed(2)}`);
    if (daysSinceLastEvent > 1) {
      console.log(`      ⚠️  RISK: Stale status (>1 day)`);
    } else {
      console.log(`      ✅ OK: Recent update`);
    }

    // Check for long dwell time
    const currentStage = latestEvent.event_stage;
    const eventsInStage = events.filter(e => e.event_stage === currentStage);
    if (eventsInStage.length > 0) {
      const firstEventInStage = eventsInStage[0];
      const firstEventTime = new Date(firstEventInStage.event_time);
      const dwellTime = (now.getTime() - firstEventTime.getTime()) / (1000 * 60 * 60 * 24);
      console.log(`\n   Dwell Time Check:`);
      console.log(`      Current stage: ${currentStage}`);
      console.log(`      First event in stage: ${firstEventInStage.event_time}`);
      console.log(`      Dwell time: ${dwellTime.toFixed(2)} days`);
      if (dwellTime > 3) {
        console.log(`      ⚠️  RISK: Long dwell time (>3 days)`);
      } else {
        console.log(`      ✅ OK: Normal dwell time`);
      }
    }

    // Check if past ETA
    const daysPastEta = (now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24);
    console.log(`\n   ETA Check:`);
    console.log(`      Expected delivery: ${shipment.expected_delivery}`);
    console.log(`      Days past ETA: ${daysPastEta.toFixed(2)}`);
    if (daysPastEta > 0) {
      console.log(`      ⚠️  RISK: Past expected delivery date`);
    } else {
      console.log(`      ✅ OK: Before expected delivery date`);
    }
  }

  console.log(`\n💡 To see the actual risk score calculation, check the backend logs or API response.`);
}

const shipmentId = process.argv[2] || 'LD0072';
checkShipmentRisk(shipmentId);

