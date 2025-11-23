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

const CITIES = [
  { city: 'Shanghai', country: 'China' },
  { city: 'Los Angeles', country: 'USA' },
  { city: 'Berlin', country: 'Germany' },
  { city: 'Chicago', country: 'USA' },
  { city: 'Ho Chi Minh', country: 'Vietnam' },
  { city: 'Houston', country: 'USA' },
  { city: 'Newark', country: 'USA' },
  { city: 'Toronto', country: 'Canada' },
  { city: 'Mumbai', country: 'India' },
  { city: 'London', country: 'UK' },
  { city: 'Tokyo', country: 'Japan' },
  { city: 'Seattle', country: 'USA' },
  { city: 'Singapore', country: 'Singapore' },
  { city: 'New York', country: 'USA' },
  { city: 'Hong Kong', country: 'Hong Kong' },
  { city: 'Dubai', country: 'UAE' },
  { city: 'Sydney', country: 'Australia' },
  { city: 'Paris', country: 'France' },
  { city: 'Barcelona', country: 'Spain' },
  { city: 'Miami', country: 'USA' },
];

const CARRIERS = ['OceanBlue', 'SkyBridge', 'BlueWave', 'NorthDrive', 'AeroLink', 'PacificStar', 'LatAmLink'];
const SERVICE_LEVELS = ['Express', 'Priority', 'Std'];
const OWNERS = ['west-coast-team', 'air-expedite', 'gulf-team', 'road-east', 'emea-air', 'pacific', 'road-south'];

const now = new Date('2025-11-25T12:00:00Z'); // Match the base date from the calculator

// Helper to add days to date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper to add hours to date
function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

// Helper to get random element from array
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate events for Medium severity shipments (2-3 days delayed, with some risk factors)
function generateMediumSeverityEvents(
  shipmentId: string,
  orderDate: Date,
  expectedDelivery: Date,
  mode: 'Air' | 'Sea' | 'Road',
): any[] {
  const events: any[] = [];
  let currentTime = new Date(orderDate);

  // Order created
  events.push({
    shipment_id: shipmentId,
    event_time: currentTime.toISOString(),
    event_stage: 'Your order has been successfully created',
    description: null,
    location: shipmentId.includes('Sea') ? 'Port' : 'Warehouse',
  });

  // Preparation steps
  currentTime = addHours(currentTime, 4);
  events.push({
    shipment_id: shipmentId,
    event_time: currentTime.toISOString(),
    event_stage: 'Your package is currently being prepared',
    description: null,
    location: 'Warehouse',
  });

  currentTime = addHours(currentTime, 2);
  events.push({
    shipment_id: shipmentId,
    event_time: currentTime.toISOString(),
    event_stage: 'Package collected by carrier',
    description: null,
    location: 'Warehouse',
  });

  if (mode === 'Air') {
    currentTime = addHours(currentTime, 6);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at airport. Awaiting transit',
      description: null,
      location: 'Airport',
    });

    currentTime = addHours(currentTime, 24);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'Arrived at customs',
      description: null,
      location: 'Customs',
    });

    // Delay: stuck at customs for 2 days (this causes Medium severity)
    currentTime = addDays(currentTime, 2);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'Awaiting Customs',
      description: 'Customs clearance in progress',
      location: 'Customs',
    });
  } else if (mode === 'Sea') {
    currentTime = addHours(currentTime, 48);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at port',
      description: null,
      location: 'Port',
    });

    // Delay: port congestion (causes Medium severity)
    currentTime = addDays(currentTime, 2);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'Port Loading',
      description: 'Port congestion causing delays',
      location: 'Port',
    });
  } else {
    // Road
    currentTime = addHours(currentTime, 12);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'In transit',
      description: null,
      location: 'In Transit',
    });

    // Delay: long dwell at hub
    currentTime = addDays(currentTime, 2);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'Hub Congestion',
      description: 'Delayed at distribution hub',
      location: 'Hub',
    });
  }

  return events;
}

// Generate events for Low severity shipments (1 day delayed, minor issues)
function generateLowSeverityEvents(
  shipmentId: string,
  orderDate: Date,
  expectedDelivery: Date,
  mode: 'Air' | 'Sea' | 'Road',
): any[] {
  const events: any[] = [];
  let currentTime = new Date(orderDate);

  // Order created
  events.push({
    shipment_id: shipmentId,
    event_time: currentTime.toISOString(),
    event_stage: 'Your order has been successfully created',
    description: null,
    location: 'Warehouse',
  });

  // Preparation steps
  currentTime = addHours(currentTime, 3);
  events.push({
    shipment_id: shipmentId,
    event_time: currentTime.toISOString(),
    event_stage: 'Your package is currently being prepared',
    description: null,
    location: 'Warehouse',
  });

  currentTime = addHours(currentTime, 1);
  events.push({
    shipment_id: shipmentId,
    event_time: currentTime.toISOString(),
    event_stage: 'Package collected by carrier',
    description: null,
    location: 'Warehouse',
  });

  if (mode === 'Air') {
    currentTime = addHours(currentTime, 8);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at airport. Awaiting transit',
      description: null,
      location: 'Airport',
    });

    // Minor delay: 1 day late
    currentTime = addDays(currentTime, 1);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'In transit',
      description: null,
      location: 'In Transit',
    });
  } else if (mode === 'Sea') {
    currentTime = addHours(currentTime, 48);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at port',
      description: null,
      location: 'Port',
    });

    // Minor delay
    currentTime = addDays(currentTime, 1);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'In Transit',
      description: null,
      location: 'In Transit',
    });
  } else {
    // Road
    currentTime = addHours(currentTime, 10);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'In transit',
      description: null,
      location: 'In Transit',
    });

    // Minor delay
    currentTime = addDays(currentTime, 1);
    events.push({
      shipment_id: shipmentId,
      event_time: currentTime.toISOString(),
      event_stage: 'In transit',
      description: 'Slight delay in transit',
      location: 'In Transit',
    });
  }

  return events;
}

async function addMediumLowSeverityShipments() {
  console.log('📦 Adding Medium and Low severity shipments...\n');

  try {
    // Get the highest existing shipment ID
    const { data: existingShipments } = await supabase
      .from('shipments')
      .select('shipment_id')
      .order('shipment_id', { ascending: false })
      .limit(1);

    let shipmentCounter = 1;
    if (existingShipments && existingShipments.length > 0) {
      const lastId = existingShipments[0].shipment_id;
      const match = lastId.match(/LD(\d+)/);
      if (match) {
        shipmentCounter = parseInt(match[1], 10) + 1;
      }
    }

    const shipments: any[] = [];
    const allEvents: any[] = [];

    // Add 8 Medium severity shipments (40-59 risk score)
    console.log('📦 Generating 8 Medium severity shipments...');
    for (let i = 0; i < 8; i++) {
      const origin = randomElement(CITIES);
      const dest = randomElement(CITIES.filter((c) => c.city !== origin.city));
      const mode = randomElement(['Air', 'Sea', 'Road'] as const);
      
      // Order date: 10-20 days ago
      const orderDate = addDays(now, -(10 + Math.random() * 10));
      // Expected delivery: 2-3 days AGO (past ETA = delayed)
      const expectedDelivery = addDays(now, -(2 + Math.random() * 1));

      const shipmentId = `LD${String(shipmentCounter).padStart(4, '0')}`;
      const shipment = {
        shipment_id: shipmentId,
        order_date: orderDate.toISOString(),
        origin_country: origin.country,
        origin_city: origin.city,
        dest_country: dest.country,
        dest_city: dest.city,
        expected_delivery: expectedDelivery.toISOString(),
        current_status: 'In Transit',
        carrier: randomElement(CARRIERS),
        service_level: randomElement(SERVICE_LEVELS),
        mode: mode,
        owner: randomElement(OWNERS),
        acknowledged: false,
      };

      shipments.push(shipment);

      const events = generateMediumSeverityEvents(shipmentId, orderDate, expectedDelivery, mode);
      allEvents.push(...events);

      shipmentCounter++;
    }

    // Add 10 Low severity shipments (20-39 risk score)
    console.log('📦 Generating 10 Low severity shipments...');
    for (let i = 0; i < 10; i++) {
      const origin = randomElement(CITIES);
      const dest = randomElement(CITIES.filter((c) => c.city !== origin.city));
      const mode = randomElement(['Air', 'Sea', 'Road'] as const);
      
      // Order date: 5-15 days ago
      const orderDate = addDays(now, -(5 + Math.random() * 10));
      // Expected delivery: 1 day AGO (slightly delayed)
      const expectedDelivery = addDays(now, -1);

      const shipmentId = `LD${String(shipmentCounter).padStart(4, '0')}`;
      const shipment = {
        shipment_id: shipmentId,
        order_date: orderDate.toISOString(),
        origin_country: origin.country,
        origin_city: origin.city,
        dest_country: dest.country,
        dest_city: dest.city,
        expected_delivery: expectedDelivery.toISOString(),
        current_status: 'In Transit',
        carrier: randomElement(CARRIERS),
        service_level: randomElement(SERVICE_LEVELS),
        mode: mode,
        owner: randomElement(OWNERS),
        acknowledged: false,
      };

      shipments.push(shipment);

      const events = generateLowSeverityEvents(shipmentId, orderDate, expectedDelivery, mode);
      allEvents.push(...events);

      shipmentCounter++;
    }

    console.log('\n💾 Inserting shipments into database...');
    const { error: insertShipmentsError } = await supabase.from('shipments').insert(shipments);

    if (insertShipmentsError) {
      console.error('❌ Error inserting shipments:', insertShipmentsError);
      process.exit(1);
    }

    console.log(`✅ Inserted ${shipments.length} shipments`);

    console.log('\n💾 Inserting events into database...');
    const batchSize = 100;
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize);
      const { error: insertEventsError } = await supabase.from('shipment_events').insert(batch);

      if (insertEventsError) {
        console.error(`❌ Error inserting events batch ${Math.floor(i / batchSize) + 1}:`, insertEventsError);
        process.exit(1);
      }
    }

    console.log(`✅ Inserted ${allEvents.length} events`);

    console.log('\n✅ Successfully added Medium and Low severity shipments!');
    console.log('   - 8 Medium severity shipments (40-59 risk score)');
    console.log('   - 10 Low severity shipments (20-39 risk score)');
    console.log('\n💡 Next step: Run /api/alerts/recalculate to calculate and store alert data for these shipments.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addMediumLowSeverityShipments();

