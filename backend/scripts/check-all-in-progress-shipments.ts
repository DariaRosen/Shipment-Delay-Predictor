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

async function checkAllInProgressShipments() {
  console.log('🔍 Checking all in-progress shipments...\n');

  // Get all in-progress shipments
  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('*')
    .eq('current_status', 'In Transit')
    .order('shipment_id');

  if (shipmentsError || !shipments) {
    console.error(`❌ Error fetching shipments:`, shipmentsError);
    process.exit(1);
  }

  console.log(`📦 Found ${shipments.length} in-progress shipments\n`);

  const delayCalculator = new DelayCalculatorService();
  const now = new Date();

  const results: Array<{
    shipmentId: string;
    riskScore: number;
    severity: string;
    riskReasons: string[];
    daysToEta: number;
    daysSinceLastEvent: number;
    stageDwellTime: number;
    isHealthy: boolean;
    shouldBeHealthy: boolean;
    issue?: string;
  }> = [];

  for (const shipment of shipments) {
    // Get events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipment.shipment_id)
      .order('event_time');

    if (eventsError) {
      console.error(`❌ Error fetching events for ${shipment.shipment_id}:`, eventsError);
      continue;
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
    const alert = delayCalculator.calculateAlert(shipmentData);

    // Calculate metrics
    const expectedDelivery = new Date(shipment.expected_delivery);
    const latestEvent = events.length > 0
      ? events.sort((a, b) => 
          new Date(b.event_time).getTime() - new Date(a.event_time).getTime()
        )[0]
      : null;
    
    const lastEventTime = latestEvent ? new Date(latestEvent.event_time) : new Date(shipment.order_date);
    const daysSinceLastEvent = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24);
    const daysToEta = Math.ceil((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const stageDwellTime = latestEvent 
      ? delayCalculator['calculateStageDwellTime'](shipmentData.events, latestEvent.event_stage)
      : 0;

    // Check if should be healthy
    const shouldBeHealthy = daysToEta >= 7 && 
                            daysSinceLastEvent <= 1 && 
                            alert.riskReasons.length === 0 &&
                            stageDwellTime <= 2;
    
    // Check if actually healthy (score <= 15)
    const isHealthy = alert.riskScore <= 15;

    let issue: string | undefined;
    if (shouldBeHealthy && !isHealthy) {
      issue = `Should be healthy (score should be <=15) but got ${alert.riskScore}`;
    } else if (!shouldBeHealthy && isHealthy && alert.riskScore > 0) {
      issue = `Has risk factors but score is low (${alert.riskScore})`;
    } else if (alert.riskScore > 70 && daysToEta >= 7 && daysSinceLastEvent <= 1) {
      issue = `High risk score (${alert.riskScore}) but has plenty of time and recent update`;
    }

    results.push({
      shipmentId: shipment.shipment_id,
      riskScore: alert.riskScore,
      severity: alert.severity,
      riskReasons: alert.riskReasons,
      daysToEta,
      daysSinceLastEvent: Math.round(daysSinceLastEvent * 10) / 10,
      stageDwellTime: Math.round(stageDwellTime * 10) / 10,
      isHealthy,
      shouldBeHealthy,
      issue,
    });
  }

  // Sort by risk score (highest first)
  results.sort((a, b) => b.riskScore - a.riskScore);

  // Display results
  console.log('📊 Risk Score Analysis:\n');
  console.log('Shipment ID | Risk | Severity | Days to ETA | Days Since Update | Dwell | Healthy? | Issue');
  console.log('─'.repeat(100));

  let issuesCount = 0;
  for (const result of results) {
    const healthyMark = result.isHealthy ? '✅' : '❌';
    const issueMark = result.issue ? '⚠️' : '  ';
    console.log(
      `${result.shipmentId.padEnd(11)} | ${String(result.riskScore).padStart(4)} | ${result.severity.padEnd(8)} | ${String(result.daysToEta).padStart(11)} | ${String(result.daysSinceLastEvent).padStart(17)} | ${String(result.stageDwellTime).padStart(5)} | ${healthyMark.padEnd(8)} | ${result.issue || '-'}`
    );
    if (result.issue) {
      issuesCount++;
    }
  }

  console.log(`\n📈 Summary:`);
  console.log(`   Total in-progress shipments: ${results.length}`);
  console.log(`   High risk (>=70): ${results.filter(r => r.riskScore >= 70).length}`);
  console.log(`   Medium risk (40-69): ${results.filter(r => r.riskScore >= 40 && r.riskScore < 70).length}`);
  console.log(`   Low risk (<40): ${results.filter(r => r.riskScore < 40).length}`);
  console.log(`   Healthy (<=15): ${results.filter(r => r.isHealthy).length}`);
  console.log(`   Should be healthy: ${results.filter(r => r.shouldBeHealthy).length}`);
  console.log(`   ⚠️  Issues found: ${issuesCount}`);

  if (issuesCount > 0) {
    console.log(`\n🔍 Shipments with issues:`);
    results.filter(r => r.issue).forEach(r => {
      console.log(`\n   ${r.shipmentId}:`);
      console.log(`      Risk Score: ${r.riskScore} (${r.severity})`);
      console.log(`      Days to ETA: ${r.daysToEta}`);
      console.log(`      Days since last event: ${r.daysSinceLastEvent}`);
      console.log(`      Stage dwell time: ${r.stageDwellTime}`);
      console.log(`      Risk reasons: ${r.riskReasons.join(', ') || 'None'}`);
      console.log(`      Issue: ${r.issue}`);
    });
  }
}

checkAllInProgressShipments();

