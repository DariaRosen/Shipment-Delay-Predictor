import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DelayCalculatorService } from '../src/alerts/services/delay-calculator.service';

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

async function checkShipmentRiskDetail(shipmentId: string) {
  console.log(`🔍 Checking risk calculation for ${shipmentId}...\n`);

  // Fetch shipment
  const { data: shipmentData, error: shipmentError } = await supabase
    .from('shipments')
    .select('*')
    .eq('shipment_id', shipmentId)
    .single();

  if (shipmentError || !shipmentData) {
    console.error('❌ Error fetching shipment:', shipmentError);
    process.exit(1);
  }

  // Fetch events
  const { data: eventsData, error: eventsError } = await supabase
    .from('shipment_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('event_time', { ascending: true });

  if (eventsError) {
    console.error('❌ Error fetching events:', eventsError);
    process.exit(1);
  }

  const delayCalculator = new DelayCalculatorService();
  
  const shipment = {
    shipment_id: shipmentData.shipment_id,
    order_date: shipmentData.order_date,
    expected_delivery: shipmentData.expected_delivery,
    current_status: shipmentData.current_status,
    carrier: shipmentData.carrier,
    mode: shipmentData.mode,
    origin_city: shipmentData.origin_city,
    origin_country: shipmentData.origin_country,
    dest_city: shipmentData.dest_city,
    dest_country: shipmentData.dest_country,
    service_level: shipmentData.service_level,
    owner: shipmentData.owner,
    events: (eventsData || []).map(e => ({
      event_time: e.event_time,
      event_stage: e.event_stage,
      description: e.description,
      location: e.location,
    })),
  };

  const alert = delayCalculator.calculateAlert(shipment);

  console.log('📊 Risk Calculation Details:');
  console.log(`  Shipment ID: ${alert.shipmentId}`);
  console.log(`  Risk Score: ${alert.riskScore}`);
  console.log(`  Severity: ${alert.severity}`);
  console.log(`  Days Past ETA: ${Math.floor((new Date().getTime() - new Date(shipment.expected_delivery).getTime()) / (1000 * 60 * 60 * 24))}`);
  console.log(`  Original Timeline: ${((new Date(shipment.expected_delivery).getTime() - new Date(shipment.order_date).getTime()) / (1000 * 60 * 60 * 24)).toFixed(1)} days`);
  console.log(`  Risk Reasons: ${alert.riskReasons.join(', ') || 'None'}`);
  console.log(`  Current Stage: ${alert.currentStage}`);
  console.log(`  Days to ETA: ${alert.daysToEta}`);
  console.log(`  Last Milestone Update: ${alert.lastMilestoneUpdate}`);
  console.log('\n📋 Events:');
  shipment.events.forEach((event, idx) => {
    console.log(`  ${idx + 1}. ${event.event_stage} - ${new Date(event.event_time).toISOString()}`);
  });
}

// Get shipment IDs from command line args
const shipmentIds = process.argv.slice(2);
if (shipmentIds.length === 0) {
  console.error('Usage: npm run check:risk-detail <shipmentId1> [shipmentId2] ...');
  process.exit(1);
}

Promise.all(shipmentIds.map(id => checkShipmentRiskDetail(id))).catch(console.error);

