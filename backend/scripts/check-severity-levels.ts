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

async function checkSeverityLevels() {
  console.log('🔍 Checking severity levels of all in-progress shipments...\n');

  // Fetch all in-progress shipments
  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('shipment_id, order_date, expected_delivery, current_status')
    .eq('current_status', 'In Transit')
    .order('shipment_id', { ascending: true });

  if (shipmentsError) {
    console.error('❌ Error fetching shipments:', shipmentsError);
    process.exit(1);
  }

  if (!shipments || shipments.length === 0) {
    console.log('No in-progress shipments found.');
    return;
  }

  console.log(`Found ${shipments.length} in-progress shipments\n`);

  // Calculate severity for each shipment
  const now = new Date('2025-11-22T12:00:00Z');
  const severityCounts: Record<string, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
    Minimal: 0,
  };

  const fewDaysDelay = 2;
  const oneDayDelay = 1;
  const notManyDaysForOriginalEta = 7;

  for (const shipment of shipments) {
    const orderDate = new Date(shipment.order_date);
    const expectedDelivery = new Date(shipment.expected_delivery);
    
    const daysPastEta = (now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24);
    const hasActualDelay = daysPastEta > 0;
    const daysPastEtaRounded = Math.floor(daysPastEta);
    
    const originalTimelineDays = (expectedDelivery.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
    
    let severity: string;
    
    if (hasActualDelay && daysPastEtaRounded >= fewDaysDelay) {
      if (originalTimelineDays <= notManyDaysForOriginalEta) {
        severity = 'Critical';
      } else {
        severity = 'High';
      }
    } else if (hasActualDelay && daysPastEtaRounded >= oneDayDelay) {
      if (originalTimelineDays <= notManyDaysForOriginalEta) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    } else {
      severity = 'Minimal';
    }
    
    severityCounts[severity]++;
    
    // Show details for first 10 shipments
    if (severityCounts[severity] <= 3 || (severity === 'Critical' && severityCounts[severity] <= 3)) {
      console.log(`${shipment.shipment_id}:`);
      console.log(`  Order Date: ${orderDate.toISOString()}`);
      console.log(`  Expected Delivery: ${expectedDelivery.toISOString()}`);
      console.log(`  Days Past ETA: ${daysPastEtaRounded}`);
      console.log(`  Original Timeline: ${originalTimelineDays.toFixed(1)} days`);
      console.log(`  Severity: ${severity}`);
      console.log('');
    }
  }

  console.log('\n📊 Severity Distribution:');
  console.log(`  Critical: ${severityCounts.Critical}`);
  console.log(`  High: ${severityCounts.High}`);
  console.log(`  Medium: ${severityCounts.Medium}`);
  console.log(`  Low: ${severityCounts.Low}`);
  console.log(`  Minimal: ${severityCounts.Minimal}`);
  console.log(`  Total: ${shipments.length}`);
}

checkSeverityLevels();

