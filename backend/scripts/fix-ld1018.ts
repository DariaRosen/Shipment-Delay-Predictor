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

/**
 * Fix LD1018: Update to ensure it meets cancellation criteria
 * ETA was Dec 12, 2024, so by January 2025 it should have been canceled
 * We'll set it to be stuck in "Border inspection" for 30+ days and ensure ETA is 14+ days ago
 */
async function fixLD1018() {
  console.log('🔧 Fixing LD1018 shipment data...\n');

  const now = new Date();
  // ETA was Dec 12, 2024, so we're way past that
  // Set last event to be 35 days ago (30+ days stuck)
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
  // ETA should be at least 15 days ago (14+ days past)
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  // Update shipment to ensure it meets cancellation criteria
  const shipment = {
    shipment_id: 'LD1018',
    order_date: new Date('2024-12-08T00:00:00Z').toISOString(),
    origin_country: 'Mexico',
    origin_city: 'Mexico City',
    dest_country: 'USA',
    dest_city: 'Dallas',
    expected_delivery: fifteenDaysAgo.toISOString(), // 15 days ago (14+ days past ETA)
    current_status: 'Border inspection', // Stuck at this step
    carrier: 'LatAmLink',
    service_level: 'Priority',
    mode: 'Road',
    priority_level: 'normal',
    owner: 'road-south',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
  };

  // Delete existing events
  console.log('Deleting existing events for LD1018...');
  const { error: deleteError } = await supabase
    .from('shipment_events')
    .delete()
    .eq('shipment_id', 'LD1018');

  if (deleteError) {
    console.error('❌ Error deleting existing events:', deleteError);
  } else {
    console.log('✅ Deleted existing events');
  }

  // Create events showing it got stuck at Border inspection 35 days ago
  const events = [
    {
      shipment_id: 'LD1018',
      event_time: new Date('2024-12-08T00:00:00Z').toISOString(),
      event_stage: 'Your order has been successfully created',
      description: 'Order placed and confirmed',
      location: 'Mexico City, Mexico',
    },
    {
      shipment_id: 'LD1018',
      event_time: new Date('2024-12-09T10:00:00Z').toISOString(),
      event_stage: 'Package picked up',
      description: 'Package collected from origin',
      location: 'Mexico City, Mexico',
    },
    {
      shipment_id: 'LD1018',
      event_time: new Date('2024-12-10T10:53:00Z').toISOString(),
      event_stage: 'Crossed border',
      description: 'Package crossed border',
      location: 'Border crossing, USA',
    },
    {
      shipment_id: 'LD1018',
      event_time: thirtyFiveDaysAgo.toISOString(), // 35 days ago - LAST EVENT, stuck here
      event_stage: 'Border inspection',
      description: 'Package at border inspection',
      location: 'Border crossing, USA',
    },
  ];

  // Update shipment
  console.log('Updating shipment LD1018...');
  const { error: shipmentError } = await supabase
    .from('shipments')
    .upsert(shipment, { onConflict: 'shipment_id' });

  if (shipmentError) {
    console.error('❌ Error updating shipment:', shipmentError);
    return;
  }

  console.log('✅ Updated shipment');

  // Insert events
  console.log('Inserting events...');
  const { error: eventError } = await supabase
    .from('shipment_events')
    .insert(events);

  if (eventError) {
    console.error('❌ Error inserting events:', eventError);
  } else {
    console.log(`✅ Inserted ${events.length} events`);
  }

  console.log('\n✅ LD1018 has been fixed!');
  console.log('   - Stuck at "Border inspection" for 35 days (30+ days)');
  console.log(`   - ETA was ${fifteenDaysAgo.toISOString().split('T')[0]} (15 days ago, 14+ days past ETA)`);
  console.log('   - Should now be marked as canceled');
}

// Run the script
fixLD1018()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

