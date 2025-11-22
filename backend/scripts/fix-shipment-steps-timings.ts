import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateShipmentSteps } from '../src/alerts/data/shipment-steps-generator';

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

async function fixShipmentStepsTimings() {
  console.log('🔧 Fixing shipment steps timings with distance-based calculations...\n');

  try {
    // Get all shipments
    const { data: shipments, error: fetchError } = await supabase
      .from('shipments')
      .select('shipment_id, order_date, expected_delivery, current_status, mode, origin_city, dest_city')
      .order('shipment_id', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching shipments:', fetchError);
      process.exit(1);
    }

    if (!shipments || shipments.length === 0) {
      console.log('ℹ️  No shipments found');
      return;
    }

    console.log(`📦 Found ${shipments.length} shipments to fix\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const shipment of shipments) {
      try {
        // Generate new steps with distance-based calculations
        const newSteps = generateShipmentSteps(
          shipment.mode as 'Air' | 'Sea' | 'Road',
          new Date(shipment.order_date),
          new Date(shipment.expected_delivery),
          shipment.current_status,
          shipment.origin_city,
          shipment.dest_city,
        );

        if (newSteps.length === 0) {
          skippedCount++;
          continue;
        }

        // Delete existing events for this shipment
        const { error: deleteError } = await supabase
          .from('shipment_events')
          .delete()
          .eq('shipment_id', shipment.shipment_id);

        if (deleteError) {
          console.error(`❌ Error deleting events for ${shipment.shipment_id}:`, deleteError);
          skippedCount++;
          continue;
        }

        // Insert new events based on generated steps
        const eventsToInsert = newSteps
          .filter((step) => step.actualCompletionTime) // Only insert steps that have actual completion times
          .map((step) => ({
            shipment_id: shipment.shipment_id,
            event_time: step.actualCompletionTime!,
            event_stage: step.stepName,
            description: step.stepDescription || null,
            location: step.location || null,
          }));

        if (eventsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('shipment_events')
            .insert(eventsToInsert);

          if (insertError) {
            console.error(`❌ Error inserting events for ${shipment.shipment_id}:`, insertError);
            skippedCount++;
          } else {
            fixedCount++;
            if (fixedCount % 10 === 0) {
              console.log(`✅ Fixed ${fixedCount} shipments...`);
            }
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${shipment.shipment_id}:`, error);
        skippedCount++;
      }
    }

    console.log(`\n✅ Fix completed!`);
    console.log(`   - Fixed: ${fixedCount} shipments`);
    console.log(`   - Skipped: ${skippedCount} shipments`);
    console.log(`\n💡 All shipment steps now have realistic timings based on distance and mode`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixShipmentStepsTimings();

