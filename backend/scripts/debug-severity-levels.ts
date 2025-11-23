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

async function debugSeverityLevels() {
  console.log('🔍 Debugging severity levels in database...\n');

  try {
    // Fetch all in-progress shipments with calculated data
    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('current_status', 'In Transit')
      .not('calculated_severity', 'is', null)
      .order('calculated_risk_score', { ascending: false });

    if (error) {
      console.error('❌ Error fetching shipments:', error);
      process.exit(1);
    }

    if (!shipments || shipments.length === 0) {
      console.log('⚠️  No shipments found with calculated severity data.');
      console.log('   Run /api/alerts/recalculate to populate calculated data.\n');
      return;
    }

    // Group by severity
    const bySeverity: Record<string, any[]> = {
      Critical: [],
      High: [],
      Medium: [],
      Low: [],
      Minimal: [],
    };

    shipments.forEach((s: any) => {
      const severity = s.calculated_severity;
      if (severity && bySeverity[severity]) {
        bySeverity[severity].push({
          shipment_id: s.shipment_id,
          risk_score: s.calculated_risk_score,
          timeline_days: s.order_date && s.expected_delivery
            ? Math.round((new Date(s.expected_delivery).getTime() - new Date(s.order_date).getTime()) / (1000 * 60 * 60 * 24))
            : null,
          order_date: s.order_date,
          expected_delivery: s.expected_delivery,
        });
      }
    });

    console.log('📊 Severity Distribution:\n');
    for (const [severity, items] of Object.entries(bySeverity)) {
      console.log(`${severity}: ${items.length} shipments`);
      if (items.length > 0 && items.length <= 5) {
        // Show details for small counts
        items.forEach((item) => {
          console.log(`  - ${item.shipment_id}: Score=${item.risk_score}, Timeline=${item.timeline_days} days`);
        });
      } else if (items.length > 5) {
        // Show first 3 and last 3
        console.log(`  First 3:`);
        items.slice(0, 3).forEach((item) => {
          console.log(`    - ${item.shipment_id}: Score=${item.risk_score}, Timeline=${item.timeline_days} days`);
        });
        console.log(`  ... (${items.length - 6} more) ...`);
        console.log(`  Last 3:`);
        items.slice(-3).forEach((item) => {
          console.log(`    - ${item.shipment_id}: Score=${item.risk_score}, Timeline=${item.timeline_days} days`);
        });
      }
      console.log('');
    }

    // Check for Medium severity shipments specifically
    console.log('\n🔍 Medium Severity Analysis:');
    const mediumShipments = bySeverity.Medium;
    if (mediumShipments.length === 0) {
      console.log('❌ No Medium severity shipments found!');
      console.log('\n   Medium requires: 1 day delay AND timeline ≤7 days from order to ETA');
      console.log('   Checking for shipments that might qualify...\n');

      // Find shipments with 1 day delay and short timeline
      const { data: allShipments } = await supabase
        .from('shipments')
        .select('*')
        .eq('current_status', 'In Transit');

      if (allShipments) {
        const now = new Date('2025-11-25T12:00:00Z');
        const candidates: any[] = [];

        allShipments.forEach((s: any) => {
          if (s.order_date && s.expected_delivery) {
            const orderDate = new Date(s.order_date);
            const expectedDelivery = new Date(s.expected_delivery);
            const timelineDays = Math.round((expectedDelivery.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
            const daysPastEta = Math.round((now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24));

            // Check if it matches Medium criteria: 1 day delay, timeline ≤7
            if (daysPastEta === 1 && timelineDays <= 7) {
              candidates.push({
                shipment_id: s.shipment_id,
                timeline_days: timelineDays,
                days_past_eta: daysPastEta,
                current_severity: s.calculated_severity || 'Not calculated',
                risk_score: s.calculated_risk_score || 'Not calculated',
              });
            }
          }
        });

        if (candidates.length > 0) {
          console.log(`   Found ${candidates.length} shipments that SHOULD be Medium:`);
          candidates.slice(0, 10).forEach((c) => {
            console.log(`     - ${c.shipment_id}: Timeline=${c.timeline_days} days, Delay=${c.days_past_eta} days, Current=${c.current_severity}, Score=${c.risk_score}`);
          });
          console.log('\n   💡 These shipments need to be recalculated.');
          console.log('      Run: POST /api/alerts/recalculate');
        } else {
          console.log('   ❌ No shipments found matching Medium criteria.');
          console.log('      You may need to add more shipments using: npm run add:medium-low');
        }
      }
    } else {
      console.log(`✅ Found ${mediumShipments.length} Medium severity shipments`);
      console.log('   Score range:', {
        min: Math.min(...mediumShipments.map((s) => s.risk_score)),
        max: Math.max(...mediumShipments.map((s) => s.risk_score)),
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugSeverityLevels();

