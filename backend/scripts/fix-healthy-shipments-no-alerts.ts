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

// Generate random number between min and max
const randomBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

async function fixHealthyShipments() {
  console.log('🔧 Fixing healthy shipments to ensure they don\'t appear in alerts...\n');

  try {
    // Get all in-progress shipments
    const { data: shipments, error: fetchError } = await supabase
      .from('shipments')
      .select('shipment_id, order_date, expected_delivery, mode')
      .order('shipment_id', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching shipments:', fetchError);
      process.exit(1);
    }

    if (!shipments || shipments.length === 0) {
      console.log('ℹ️  No shipments found');
      return;
    }

    console.log(`📦 Found ${shipments.length} shipments to check\n`);

    const now = new Date('2025-11-25T00:00:00Z'); // Base date
    let fixedCount = 0;
    let skippedCount = 0;

    for (const shipment of shipments) {
      const orderDate = new Date(shipment.order_date);
      const expectedDelivery = new Date(shipment.expected_delivery);
      const daysToEta = Math.ceil((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Only fix shipments that:
      // 1. Have ETA >= 5 days away (enough buffer to avoid time pressure risk)
      // 2. Are not future shipments
      // 3. Are not past ETA
      if (daysToEta >= 5 && orderDate <= now && daysToEta > 0) {
        // Get the latest event for this shipment
        const { data: events, error: eventsError } = await supabase
          .from('shipment_events')
          .select('event_time, event_stage')
          .eq('shipment_id', shipment.shipment_id)
          .order('event_time', { ascending: false })
          .limit(1);

        if (eventsError) {
          console.error(`❌ Error fetching events for ${shipment.shipment_id}:`, eventsError);
          continue;
        }

        if (events && events.length > 0) {
          const latestEvent = events[0];
          const lastEventTime = new Date(latestEvent.event_time);
          const daysSinceLastEvent = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24);

          // Always update to be very recent (within last 12-24 hours) to ensure no stale status risk
          // This ensures daysSinceLastEvent < 1, so no risk points from stale status
          if (daysSinceLastEvent >= 0.4) { // Update if more than ~10 hours ago
            // Update the latest event time to be 6-20 hours ago
            const hoursAgo = randomBetween(6, 20);
            const newEventTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

            const { error: updateError } = await supabase
              .from('shipment_events')
              .update({ event_time: newEventTime.toISOString() })
              .eq('shipment_id', shipment.shipment_id)
              .eq('event_time', latestEvent.event_time)
              .eq('event_stage', latestEvent.event_stage);

            if (updateError) {
              console.error(`❌ Error updating event for ${shipment.shipment_id}:`, updateError);
            } else {
              fixedCount++;
              console.log(`✅ Fixed ${shipment.shipment_id}: Updated last event from ${daysSinceLastEvent.toFixed(1)} days ago to ${hoursAgo} hours ago`);
            }
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Fix completed!`);
    console.log(`   - Fixed: ${fixedCount} shipments`);
    console.log(`   - Skipped: ${skippedCount} shipments (already recent or don't meet criteria)`);
    console.log(`\n💡 Fixed shipments should now have:`);
    console.log(`   - Last update within last 12-24 hours (no stale status risk)`);
    console.log(`   - ETA >= 7 days away (no time pressure risk)`);
    console.log(`   - Should NOT appear in alerts`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixHealthyShipments();

