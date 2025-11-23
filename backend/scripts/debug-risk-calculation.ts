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

async function debugRiskCalculation(shipmentId: string) {
  console.log(`🔍 Debugging risk calculation for ${shipmentId}...\n`);

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

  // Prepare data for calculation
  const shipmentData = {
    shipment_id: shipment.shipment_id,
    order_date: shipment.order_date,
    origin_country: shipment.origin_country,
    origin_city: shipment.origin_city,
    dest_country: shipment.dest_country,
    dest_city: shipment.dest_city,
    expected_delivery: shipment.expected_delivery,
    current_status: shipment.current_status,
    carrier: shipment.carrier,
    service_level: shipment.service_level,
    mode: shipment.mode,
    owner: shipment.owner,
    events: events.map(e => ({
      event_time: e.event_time,
      event_stage: e.event_stage,
      description: e.description,
      location: e.location,
    })),
  };

  // Calculate alert
  const delayCalculator = new DelayCalculatorService();
  const alert = delayCalculator.calculateAlert(shipmentData);

  console.log('📊 Risk Calculation Results:');
  console.log(`   Risk Score: ${alert.riskScore}`);
  console.log(`   Severity: ${alert.severity}`);
  console.log(`   Risk Reasons: ${alert.riskReasons.join(', ') || 'None'}`);
  console.log(`   Current Stage: ${alert.currentStage}`);
  console.log(`   Days to ETA: ${alert.daysToEta}`);
  console.log(`   Last Milestone Update: ${alert.lastMilestoneUpdate}`);

  // Manual calculation breakdown
  console.log(`\n🔍 Manual Calculation Breakdown:`);
  const now = new Date();
  const expectedDelivery = new Date(shipment.expected_delivery);
  const orderDate = new Date(shipment.order_date);
  const latestEvent = events.length > 0
    ? events.sort((a, b) => 
        new Date(b.event_time).getTime() - new Date(a.event_time).getTime()
      )[0]
    : null;

  const lastEventTime = latestEvent ? new Date(latestEvent.event_time) : orderDate;
  const daysSinceLastEvent = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24);
  const daysToEta = Math.ceil((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  console.log(`   Days to ETA (calculated): ${daysToEta}`);
  console.log(`   Days since last event: ${daysSinceLastEvent.toFixed(2)}`);
  
  // Check safeguard conditions
  const stageDwellTime = delayCalculator['calculateStageDwellTime'](shipmentData.events, latestEvent?.event_stage);
  console.log(`   Stage dwell time: ${stageDwellTime.toFixed(2)}`);
  
  const isHealthy = daysToEta >= 7 && 
                    daysSinceLastEvent <= 1 && 
                    alert.riskReasons.length === 0 &&
                    stageDwellTime <= 2;
  
  console.log(`\n   Safeguard Check:`);
  console.log(`      daysToEta >= 7: ${daysToEta >= 7} (${daysToEta})`);
  console.log(`      daysSinceLastEvent <= 1: ${daysSinceLastEvent <= 1} (${daysSinceLastEvent.toFixed(2)})`);
  console.log(`      riskReasons.length === 0: ${alert.riskReasons.length === 0} (${alert.riskReasons.length})`);
  console.log(`      stageDwellTime <= 2: ${stageDwellTime <= 2} (${stageDwellTime.toFixed(2)})`);
  console.log(`      isHealthy: ${isHealthy}`);
  
  if (!isHealthy) {
    console.log(`\n   ⚠️  Shipment is NOT considered healthy, so safeguard is not applied.`);
    console.log(`   This explains why the risk score is ${alert.riskScore} instead of being capped at 15.`);
  } else {
    console.log(`\n   ✅ Shipment IS considered healthy, but risk score is ${alert.riskScore}.`);
    console.log(`   This suggests the safeguard might not be working correctly.`);
  }
}

const shipmentId = process.argv[2] || 'LD0072';
debugRiskCalculation(shipmentId);

