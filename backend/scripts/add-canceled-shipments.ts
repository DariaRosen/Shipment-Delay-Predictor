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
 * Add 3 shipments that should be canceled (BOTH conditions must be met):
 * 1. Stuck in same step for 30+ days
 * 2. 14+ days past expected delivery date (ETA)
 */
async function addCanceledShipments() {
  console.log('📦 Adding 3 canceled shipments (30+ days stuck AND 14+ days past ETA)...\n');

  const now = new Date();
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
  const thirtyTwoDaysAgo = new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000); // 32 days ago
  const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago (for ETA)

  // Shipment 1: Stuck at "Arrived at customs" for 35 days AND 15 days past ETA
  const shipment1 = {
    shipment_id: 'LD2004',
    order_date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    origin_country: 'China',
    origin_city: 'Shenzhen',
    dest_country: 'USA',
    dest_city: 'New York',
    expected_delivery: fifteenDaysAgo.toISOString(), // 15 days ago (14+ days past ETA)
    current_status: 'Arrived at customs',
    carrier: 'GlobalFreight',
    service_level: 'Std',
    mode: 'Sea',
    priority_level: 'normal',
    owner: 'east-coast-team',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
  };

  // Events for shipment 1: Stuck at customs for 35 days (30+ days) AND ETA was 15 days ago (14+ days past)
  const events1 = [
    {
      shipment_id: 'LD2004',
      event_time: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      event_stage: 'Your order has been successfully created',
      description: 'Order placed and confirmed',
      location: 'Shenzhen, China',
    },
    {
      shipment_id: 'LD2004',
      event_time: new Date(now.getTime() - 58 * 24 * 60 * 60 * 1000).toISOString(), // 58 days ago
      event_stage: 'Package picked up',
      description: 'Package collected from origin',
      location: 'Shenzhen, China',
    },
    {
      shipment_id: 'LD2004',
      event_time: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString(), // 55 days ago
      event_stage: 'In transit to port',
      description: 'Package en route to port',
      location: 'Shenzhen, China',
    },
    {
      shipment_id: 'LD2004',
      event_time: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
      event_stage: 'Arrived at port',
      description: 'Package arrived at origin port',
      location: 'Shenzhen Port, China',
    },
    {
      shipment_id: 'LD2004',
      event_time: new Date(now.getTime() - 48 * 24 * 60 * 60 * 1000).toISOString(), // 48 days ago
      event_stage: 'Loaded onto vessel',
      description: 'Package loaded onto container ship',
      location: 'Shenzhen Port, China',
    },
    {
      shipment_id: 'LD2004',
      event_time: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
      event_stage: 'Vessel arrived at destination port',
      description: 'Ship arrived at destination port',
      location: 'New York Port, USA',
    },
    {
      shipment_id: 'LD2004',
      event_time: thirtyFiveDaysAgo.toISOString(), // 35 days ago - LAST EVENT, stuck here (30+ days)
      event_stage: 'Arrived at customs',
      description: 'Package arrived at customs for inspection',
      location: 'New York Port, USA',
    },
  ];

  // Shipment 2: Stuck at "Container unloaded from vessel" for 32 days AND 16 days past ETA
  const shipment2 = {
    shipment_id: 'LD2005',
    order_date: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString(), // 55 days ago
    origin_country: 'Germany',
    origin_city: 'Hamburg',
    dest_country: 'USA',
    dest_city: 'Los Angeles',
    expected_delivery: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(), // 16 days ago (14+ days past ETA)
    current_status: 'Container unloaded from vessel',
    carrier: 'OceanBlue',
    service_level: 'Std',
    mode: 'Sea',
    priority_level: 'normal',
    owner: 'west-coast-team',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
  };

  // Events for shipment 2: Stuck at container unloaded for 32 days (30+ days) AND ETA was 16 days ago (14+ days past)
  const events2 = [
    {
      shipment_id: 'LD2005',
      event_time: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString(), // 55 days ago
      event_stage: 'Your order has been successfully created',
      description: 'Order placed and confirmed',
      location: 'Hamburg, Germany',
    },
    {
      shipment_id: 'LD2005',
      event_time: new Date(now.getTime() - 53 * 24 * 60 * 60 * 1000).toISOString(), // 53 days ago
      event_stage: 'Package picked up',
      description: 'Package collected from origin',
      location: 'Hamburg, Germany',
    },
    {
      shipment_id: 'LD2005',
      event_time: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
      event_stage: 'In transit to port',
      description: 'Package en route to port',
      location: 'Hamburg, Germany',
    },
    {
      shipment_id: 'LD2005',
      event_time: new Date(now.getTime() - 48 * 24 * 60 * 60 * 1000).toISOString(), // 48 days ago
      event_stage: 'Arrived at port',
      description: 'Package arrived at origin port',
      location: 'Hamburg Port, Germany',
    },
    {
      shipment_id: 'LD2005',
      event_time: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      event_stage: 'Loaded onto vessel',
      description: 'Package loaded onto container ship',
      location: 'Hamburg Port, Germany',
    },
    {
      shipment_id: 'LD2005',
      event_time: new Date(now.getTime() - 38 * 24 * 60 * 60 * 1000).toISOString(), // 38 days ago
      event_stage: 'Vessel arrived at destination port',
      description: 'Ship arrived at destination port',
      location: 'Los Angeles Port, USA',
    },
    {
      shipment_id: 'LD2005',
      event_time: thirtyTwoDaysAgo.toISOString(), // 32 days ago - LAST EVENT, stuck here (30+ days)
      event_stage: 'Container unloaded from vessel',
      description: 'Container unloaded from vessel',
      location: 'Los Angeles Port, USA',
    },
  ];

  // Shipment 3: Stuck at "In transit" (Road) for 31 days AND 18 days past ETA
  const shipment3 = {
    shipment_id: 'LD2006',
    order_date: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
    origin_country: 'USA',
    origin_city: 'Chicago',
    dest_country: 'USA',
    dest_city: 'Miami',
    expected_delivery: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days ago (14+ days past ETA)
    current_status: 'In transit',
    carrier: 'RoadExpress',
    service_level: 'Std',
    mode: 'Road',
    priority_level: 'normal',
    owner: 'road-south',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
  };

  // Events for shipment 3: Stuck in transit for 31 days (30+ days) AND ETA was 18 days ago (14+ days past)
  const events3 = [
    {
      shipment_id: 'LD2006',
      event_time: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
      event_stage: 'Your order has been successfully created',
      description: 'Order placed and confirmed',
      location: 'Chicago, USA',
    },
    {
      shipment_id: 'LD2006',
      event_time: new Date(now.getTime() - 49 * 24 * 60 * 60 * 1000).toISOString(), // 49 days ago
      event_stage: 'Package picked up',
      description: 'Package collected from origin',
      location: 'Chicago, USA',
    },
    {
      shipment_id: 'LD2006',
      event_time: new Date(now.getTime() - 48 * 24 * 60 * 60 * 1000).toISOString(), // 48 days ago
      event_stage: 'Departed from origin hub',
      description: 'Package left origin hub',
      location: 'Chicago Hub, USA',
    },
    {
      shipment_id: 'LD2006',
      event_time: thirtyOneDaysAgo.toISOString(), // 31 days ago - LAST EVENT, stuck here (30+ days)
      event_stage: 'In transit',
      description: 'Package in transit to destination',
      location: 'En route, USA',
    },
  ];

  // Insert shipments
  const shipments = [shipment1, shipment2, shipment3];
  const allEvents = [...events1, ...events2, ...events3];

  console.log('Inserting shipments...');
  const { error: shipmentError } = await supabase
    .from('shipments')
    .upsert(shipments, { onConflict: 'shipment_id' });

  if (shipmentError) {
    console.error('❌ Error inserting shipments:', shipmentError);
    return;
  }

  console.log(`✅ Inserted ${shipments.length} shipments`);

  // Delete existing events for these shipments first
  const shipmentIds = shipments.map(s => s.shipment_id);
  console.log('Deleting existing events for these shipments...');
  const { error: deleteError } = await supabase
    .from('shipment_events')
    .delete()
    .in('shipment_id', shipmentIds);

  if (deleteError) {
    console.error('❌ Error deleting existing events:', deleteError);
  } else {
    console.log(`✅ Deleted existing events for ${shipmentIds.length} shipments`);
  }

  // Insert events in batches
  console.log('Inserting events...');
  const batchSize = 10;
  for (let i = 0; i < allEvents.length; i += batchSize) {
    const batch = allEvents.slice(i, i + batchSize);
    const { error: eventError } = await supabase
      .from('shipment_events')
      .insert(batch);

    if (eventError) {
      console.error(`❌ Error inserting event batch ${i / batchSize + 1}:`, eventError);
    } else {
      console.log(`✅ Inserted event batch ${i / batchSize + 1} (${batch.length} events)`);
    }
  }

  console.log(`\n✅ Successfully added ${shipments.length} canceled shipments!`);
  console.log('\nSummary (both conditions met: 30+ days stuck AND 14+ days past ETA):');
  console.log(`  - LD2004: Stuck at "Arrived at customs" for 35 days, ETA was 15 days ago`);
  console.log(`  - LD2005: Stuck at "Container unloaded from vessel" for 32 days, ETA was 16 days ago`);
  console.log(`  - LD2006: Stuck at "In transit" for 31 days, ETA was 18 days ago`);
}

// Run the script
addCanceledShipments()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

