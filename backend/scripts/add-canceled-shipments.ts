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
 * Add 3 shipments that should be canceled (stuck in same step for 30+ days)
 */
async function addCanceledShipments() {
  console.log('📦 Adding 3 canceled shipments (stuck for 30+ days)...\n');

  const now = new Date();
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
  const thirtyTwoDaysAgo = new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000); // 32 days ago
  const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // 31 days ago

  // Shipment 1: Stuck at "Arrived at customs" for 35 days
  const shipment1 = {
    shipment_id: 'LD2001',
    order_date: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
    origin_country: 'China',
    origin_city: 'Shenzhen',
    dest_country: 'USA',
    dest_city: 'New York',
    expected_delivery: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
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

  // Events for shipment 1: Stuck at customs for 35 days
  // All events before the stuck stage, then stuck at customs 35 days ago with no updates since
  const events1 = [
    {
      shipment_id: 'LD2001',
      event_time: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
      event_stage: 'Your order has been successfully created',
      description: 'Order placed and confirmed',
      location: 'Shenzhen, China',
    },
    {
      shipment_id: 'LD2001',
      event_time: new Date(now.getTime() - 48 * 24 * 60 * 60 * 1000).toISOString(), // 48 days ago
      event_stage: 'Package picked up',
      description: 'Package collected from origin',
      location: 'Shenzhen, China',
    },
    {
      shipment_id: 'LD2001',
      event_time: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      event_stage: 'In transit to port',
      description: 'Package en route to port',
      location: 'Shenzhen, China',
    },
    {
      shipment_id: 'LD2001',
      event_time: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
      event_stage: 'Arrived at port',
      description: 'Package arrived at origin port',
      location: 'Shenzhen Port, China',
    },
    {
      shipment_id: 'LD2001',
      event_time: new Date(now.getTime() - 38 * 24 * 60 * 60 * 1000).toISOString(), // 38 days ago
      event_stage: 'Loaded onto vessel',
      description: 'Package loaded onto container ship',
      location: 'Shenzhen Port, China',
    },
    {
      shipment_id: 'LD2001',
      event_time: new Date(now.getTime() - 37 * 24 * 60 * 60 * 1000).toISOString(), // 37 days ago
      event_stage: 'Vessel arrived at destination port',
      description: 'Ship arrived at destination port',
      location: 'New York Port, USA',
    },
    {
      shipment_id: 'LD2001',
      event_time: thirtyFiveDaysAgo.toISOString(), // 35 days ago - LAST EVENT, stuck here
      event_stage: 'Arrived at customs',
      description: 'Package arrived at customs for inspection',
      location: 'New York Port, USA',
    },
  ];

  // Shipment 2: Stuck at "Container unloaded from vessel" for 32 days
  const shipment2 = {
    shipment_id: 'LD2002',
    order_date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    origin_country: 'Germany',
    origin_city: 'Hamburg',
    dest_country: 'USA',
    dest_city: 'Los Angeles',
    expected_delivery: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
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

  // Events for shipment 2: Stuck at container unloaded for 32 days
  // All events before the stuck stage, then stuck at container unloaded 32 days ago with no updates since
  const events2 = [
    {
      shipment_id: 'LD2002',
      event_time: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      event_stage: 'Your order has been successfully created',
      description: 'Order placed and confirmed',
      location: 'Hamburg, Germany',
    },
    {
      shipment_id: 'LD2002',
      event_time: new Date(now.getTime() - 43 * 24 * 60 * 60 * 1000).toISOString(), // 43 days ago
      event_stage: 'Package picked up',
      description: 'Package collected from origin',
      location: 'Hamburg, Germany',
    },
    {
      shipment_id: 'LD2002',
      event_time: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
      event_stage: 'In transit to port',
      description: 'Package en route to port',
      location: 'Hamburg, Germany',
    },
    {
      shipment_id: 'LD2002',
      event_time: new Date(now.getTime() - 38 * 24 * 60 * 60 * 1000).toISOString(), // 38 days ago
      event_stage: 'Arrived at port',
      description: 'Package arrived at origin port',
      location: 'Hamburg Port, Germany',
    },
    {
      shipment_id: 'LD2002',
      event_time: new Date(now.getTime() - 36 * 24 * 60 * 60 * 1000).toISOString(), // 36 days ago
      event_stage: 'Loaded onto vessel',
      description: 'Package loaded onto container ship',
      location: 'Hamburg Port, Germany',
    },
    {
      shipment_id: 'LD2002',
      event_time: new Date(now.getTime() - 34 * 24 * 60 * 60 * 1000).toISOString(), // 34 days ago
      event_stage: 'Vessel arrived at destination port',
      description: 'Ship arrived at destination port',
      location: 'Los Angeles Port, USA',
    },
    {
      shipment_id: 'LD2002',
      event_time: thirtyTwoDaysAgo.toISOString(), // 32 days ago - LAST EVENT, stuck here
      event_stage: 'Container unloaded from vessel',
      description: 'Container unloaded from vessel',
      location: 'Los Angeles Port, USA',
    },
  ];

  // Shipment 3: Stuck at "In transit" (Road) for 31 days
  const shipment3 = {
    shipment_id: 'LD2003',
    order_date: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
    origin_country: 'USA',
    origin_city: 'Chicago',
    dest_country: 'USA',
    dest_city: 'Miami',
    expected_delivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
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

  // Events for shipment 3: Stuck in transit for 31 days
  const events3 = [
    {
      shipment_id: 'LD2003',
      event_time: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
      event_stage: 'Your order has been successfully created',
      description: 'Order placed and confirmed',
      location: 'Chicago, USA',
    },
    {
      shipment_id: 'LD2003',
      event_time: new Date(now.getTime() - 39 * 24 * 60 * 60 * 1000).toISOString(), // 39 days ago
      event_stage: 'Package picked up',
      description: 'Package collected from origin',
      location: 'Chicago, USA',
    },
    {
      shipment_id: 'LD2003',
      event_time: new Date(now.getTime() - 38 * 24 * 60 * 60 * 1000).toISOString(), // 38 days ago
      event_stage: 'Departed from origin hub',
      description: 'Package left origin hub',
      location: 'Chicago Hub, USA',
    },
    {
      shipment_id: 'LD2003',
      event_time: thirtyOneDaysAgo.toISOString(), // 31 days ago - LAST EVENT, stuck here
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
  console.log('\nSummary:');
  console.log(`  - LD2001: Stuck at "Arrived at customs" for 35 days`);
  console.log(`  - LD2002: Stuck at "Container unloaded from vessel" for 32 days`);
  console.log(`  - LD2003: Stuck at "In transit" for 31 days`);
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

