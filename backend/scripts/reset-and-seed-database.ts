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

interface ShipmentData {
  shipment_id: string;
  order_date: string;
  origin_country: string;
  origin_city: string;
  dest_country: string;
  dest_city: string;
  expected_delivery: string;
  current_status: string;
  carrier: string;
  service_level: string;
  mode: 'Air' | 'Sea' | 'Road';
  owner: string;
}

interface EventData {
  shipment_id: string;
  event_time: string;
  event_stage: string;
  description: string | null;
  location: string | null;
}

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
  { city: 'Phoenix', country: 'USA' },
  { city: 'Las Vegas', country: 'USA' },
  { city: 'Delhi', country: 'India' },
];

const CARRIERS = ['OceanBlue', 'SkyBridge', 'BlueWave', 'NorthDrive', 'AeroLink', 'PacificStar', 'LatAmLink'];
const SERVICE_LEVELS = ['Express', 'Priority', 'Std'];
const OWNERS = ['west-coast-team', 'air-expedite', 'gulf-team', 'road-east', 'emea-air', 'pacific', 'road-south'];

const now = new Date('2025-11-22T12:00:00Z');

// Helper to get random element from array
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

// Generate events for a shipment based on mode and status
function generateEvents(
  shipment: ShipmentData,
  status: 'completed' | 'in_progress' | 'canceled' | 'future',
): EventData[] {
  const events: EventData[] = [];
  const orderDate = new Date(shipment.order_date);
  const expectedDelivery = new Date(shipment.expected_delivery);
  const mode = shipment.mode;
  
  let currentTime = new Date(orderDate);
  
  // Always start with order created
  events.push({
    shipment_id: shipment.shipment_id,
    event_time: currentTime.toISOString(),
    event_stage: 'Your order has been successfully created',
    description: null,
    location: 'In Transit',
  });
  
  if (status === 'future') {
    // Future shipments only have the order created event
    return events;
  }
  
  // Add preparation steps
  currentTime = addHours(currentTime, 2);
  events.push({
    shipment_id: shipment.shipment_id,
    event_time: currentTime.toISOString(),
    event_stage: 'Your package is currently being prepared',
    description: null,
    location: 'In Transit',
  });
  
  currentTime = addHours(currentTime, 1);
  events.push({
    shipment_id: shipment.shipment_id,
    event_time: currentTime.toISOString(),
    event_stage: 'Your order is being packed',
    description: null,
    location: 'In Transit',
  });
  
  currentTime = addHours(currentTime, 0.5);
  events.push({
    shipment_id: shipment.shipment_id,
    event_time: currentTime.toISOString(),
    event_stage: 'Package ready to be shipped by warehouse',
    description: null,
    location: 'In Transit',
  });
  
  currentTime = addHours(currentTime, 1);
  events.push({
    shipment_id: shipment.shipment_id,
    event_time: currentTime.toISOString(),
    event_stage: 'Package left warehouse',
    description: null,
    location: 'In Transit',
  });
  
  currentTime = addHours(currentTime, 2);
  events.push({
    shipment_id: shipment.shipment_id,
    event_time: currentTime.toISOString(),
    event_stage: 'Package collected by carrier',
    description: null,
    location: 'In Transit',
  });
  
  if (mode === 'Air') {
    currentTime = addHours(currentTime, 4);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package received by sorting center of origin',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 6);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package left sorting center of origin',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 12);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Your package arrived at airport. Awaiting transit',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 24);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Export customs clearance started',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 24);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Export customs clearance complete',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 12);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Awaiting flight',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 0);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package leaving origin country/region',
      description: null,
      location: 'In Transit',
    });
    
    // Flight time (calculate based on distance, but use realistic time)
    const flightHours = 12 + Math.random() * 8; // 12-20 hours
    currentTime = addHours(currentTime, flightHours);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Your package arrived at local airport',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 2);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Arrived at customs',
      description: null,
      location: 'In Transit',
    });
    
    if (status === 'canceled') {
      // For canceled shipments, stop here (stuck at customs)
      return events;
    }
    
    if (status === 'in_progress') {
      // For in-progress, might have some customs steps or might be stuck
      if (Math.random() > 0.5) {
        currentTime = addHours(currentTime, 1);
        events.push({
          shipment_id: shipment.shipment_id,
          event_time: currentTime.toISOString(),
          event_stage: 'Your package will soon be handed over to the domestic courier company',
          description: null,
          location: 'In Transit',
        });
      }
      return events;
    }
    
    // Completed shipments continue
    currentTime = addHours(currentTime, 1);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Your package will soon be handed over to the domestic courier company',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 24);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Import customs clearance completed',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 6);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at regional carrier facility',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 4);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at pick-up point',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 0);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Awaiting pickup',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 1);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package received by customer',
      description: null,
      location: null,
    });
  } else if (mode === 'Sea') {
    // Similar structure for Sea mode
    currentTime = addHours(currentTime, 8);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package received by sorting center of origin',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 12);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package left sorting center of origin',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 48);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Export customs clearance started',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 4);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Export customs clearance complete',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 24);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at port',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 12);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Container loaded onto vessel',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 0);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Vessel departed',
      description: null,
      location: 'In Transit',
    });
    
    // Sea transit time (calculate based on distance, but use realistic time)
    const seaDays = 10 + Math.random() * 20; // 10-30 days
    currentTime = addDays(currentTime, seaDays);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Vessel arrived at destination port',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 12);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Container unloaded from vessel',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 0);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Arrived at customs',
      description: null,
      location: 'In Transit',
    });
    
    if (status === 'canceled') {
      return events;
    }
    
    if (status === 'in_progress') {
      return events;
    }
    
    // Completed
    currentTime = addHours(currentTime, 48);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Import customs clearance completed',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 12);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at regional carrier facility',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 8);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at pick-up point',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 0);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Awaiting pickup',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 1);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package received by customer',
      description: null,
      location: null,
    });
  } else {
    // Road mode
    currentTime = addHours(currentTime, 4);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package received by sorting center of origin',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 6);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package left sorting center of origin',
      description: null,
      location: 'In Transit',
    });
    
    // Road transit time
    const roadHours = 8 + Math.random() * 16; // 8-24 hours
    currentTime = addHours(currentTime, roadHours);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'In transit',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 0);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Crossed border',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 12);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Border inspection',
      description: null,
      location: 'In Transit',
    });
    
    if (status === 'canceled') {
      return events;
    }
    
    if (status === 'in_progress') {
      return events;
    }
    
    // Completed
    currentTime = addHours(currentTime, 6);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at regional carrier facility',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 4);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package arrived at pick-up point',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 0);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Awaiting pickup',
      description: null,
      location: 'In Transit',
    });
    
    currentTime = addHours(currentTime, 1);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package received by customer',
      description: null,
      location: null,
    });
  }
  
  return events;
}

async function resetAndSeedDatabase() {
  console.log('🗑️  Clearing existing data...\n');

  try {
    // Delete all events first (due to foreign key constraint)
    const { error: deleteEventsError } = await supabase
      .from('shipment_events')
      .delete()
      .neq('shipment_id', 'dummy'); // Delete all

    if (deleteEventsError) {
      console.error('❌ Error deleting events:', deleteEventsError);
      process.exit(1);
    }

    // Delete all shipments
    const { error: deleteShipmentsError } = await supabase
      .from('shipments')
      .delete()
      .neq('shipment_id', 'dummy'); // Delete all

    if (deleteShipmentsError) {
      console.error('❌ Error deleting shipments:', deleteShipmentsError);
      process.exit(1);
    }

    console.log('✅ All existing data cleared\n');

    const shipments: ShipmentData[] = [];
    const allEvents: EventData[] = [];
    let shipmentCounter = 1;

    // Generate 5 canceled shipments
    console.log('📦 Generating 5 canceled shipments...');
    for (let i = 0; i < 5; i++) {
      const origin = randomElement(CITIES);
      const dest = randomElement(CITIES.filter(c => c.city !== origin.city));
      const orderDate = addDays(now, -(60 + Math.random() * 30)); // 60-90 days ago
      const expectedDelivery = addDays(orderDate, 7 + Math.random() * 7); // 7-14 days after order
      const stuckDate = addDays(expectedDelivery, -10); // Stuck 10 days before ETA
      
      const shipment: ShipmentData = {
        shipment_id: `LD${String(shipmentCounter).padStart(4, '0')}`,
        order_date: orderDate.toISOString(),
        origin_country: origin.country,
        origin_city: origin.city,
        dest_country: dest.country,
        dest_city: dest.city,
        expected_delivery: expectedDelivery.toISOString(),
        current_status: 'Canceled',
        carrier: randomElement(CARRIERS),
        service_level: randomElement(SERVICE_LEVELS),
        mode: randomElement(['Air', 'Sea', 'Road']),
        owner: randomElement(OWNERS),
      };
      
      shipments.push(shipment);
      
      // Generate events up to the stuck point
      const events = generateEvents(shipment, 'canceled');
      // Ensure the last event is at the stuck date
      if (events.length > 0) {
        events[events.length - 1].event_time = stuckDate.toISOString();
      }
      
      // Add refund event
      events.push({
        shipment_id: shipment.shipment_id,
        event_time: now.toISOString(),
        event_stage: 'Refund customer',
        description: `Shipment was stuck in the same step for more than 30 days and is ${Math.floor((now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24))} days past the expected delivery date (14+ days delay). Refund has been processed.`,
        location: null,
      });
      
      allEvents.push(...events);
      shipmentCounter++;
    }

    // Generate 15 future shipments
    console.log('📦 Generating 15 future shipments...');
    for (let i = 0; i < 15; i++) {
      const origin = randomElement(CITIES);
      const dest = randomElement(CITIES.filter(c => c.city !== origin.city));
      const orderDate = addDays(now, 1 + Math.random() * 30); // 1-30 days in future
      const expectedDelivery = addDays(orderDate, 3 + Math.random() * 42); // 3-45 days after order
      
      const shipment: ShipmentData = {
        shipment_id: `LD${String(shipmentCounter).padStart(4, '0')}`,
        order_date: orderDate.toISOString(),
        origin_country: origin.country,
        origin_city: origin.city,
        dest_country: dest.country,
        dest_city: dest.city,
        expected_delivery: expectedDelivery.toISOString(),
        current_status: 'Order scheduled',
        carrier: randomElement(CARRIERS),
        service_level: randomElement(SERVICE_LEVELS),
        mode: randomElement(['Air', 'Sea', 'Road']),
        owner: randomElement(OWNERS),
      };
      
      shipments.push(shipment);
      
      // Future shipments only have order created event
      const events = generateEvents(shipment, 'future');
      allEvents.push(...events);
      shipmentCounter++;
    }

    // Generate 50 completed shipments
    console.log('📦 Generating 50 completed shipments...');
    for (let i = 0; i < 50; i++) {
      const origin = randomElement(CITIES);
      const dest = randomElement(CITIES.filter(c => c.city !== origin.city));
      const orderDate = addDays(now, -(30 + Math.random() * 60)); // 30-90 days ago
      const expectedDelivery = addDays(orderDate, 3 + Math.random() * 42); // 3-45 days after order
      const completionDate = addDays(expectedDelivery, -2 + Math.random() * 4); // -2 to +2 days from ETA
      
      const shipment: ShipmentData = {
        shipment_id: `LD${String(shipmentCounter).padStart(4, '0')}`,
        order_date: orderDate.toISOString(),
        origin_country: origin.country,
        origin_city: origin.city,
        dest_country: dest.country,
        dest_city: dest.city,
        expected_delivery: expectedDelivery.toISOString(),
        current_status: 'Delivered',
        carrier: randomElement(CARRIERS),
        service_level: randomElement(SERVICE_LEVELS),
        mode: randomElement(['Air', 'Sea', 'Road']),
        owner: randomElement(OWNERS),
      };
      
      shipments.push(shipment);
      
      // Generate events for completed shipment
      const events = generateEvents(shipment, 'completed');
      // Ensure last event (package received) is at completion date
      if (events.length > 0 && events[events.length - 1].event_stage === 'Package received by customer') {
        events[events.length - 1].event_time = completionDate.toISOString();
      }
      
      allEvents.push(...events);
      shipmentCounter++;
    }

    // Generate 20 in progress shipments
    console.log('📦 Generating 20 in progress shipments...');
    for (let i = 0; i < 20; i++) {
      const origin = randomElement(CITIES);
      const dest = randomElement(CITIES.filter(c => c.city !== origin.city));
      const orderDate = addDays(now, -(5 + Math.random() * 25)); // 5-30 days ago
      const expectedDelivery = addDays(now, 3 + Math.random() * 42); // 3-45 days in future
      
      const shipment: ShipmentData = {
        shipment_id: `LD${String(shipmentCounter).padStart(4, '0')}`,
        order_date: orderDate.toISOString(),
        origin_country: origin.country,
        origin_city: origin.city,
        dest_country: dest.country,
        dest_city: dest.city,
        expected_delivery: expectedDelivery.toISOString(),
        current_status: 'In Transit',
        carrier: randomElement(CARRIERS),
        service_level: randomElement(SERVICE_LEVELS),
        mode: randomElement(['Air', 'Sea', 'Road']),
        owner: randomElement(OWNERS),
      };
      
      shipments.push(shipment);
      
      // Generate events for in progress shipment
      const events = generateEvents(shipment, 'in_progress');
      // Ensure last event is recent (within last 1-2 days) for healthy shipments
      if (events.length > 0) {
        const lastEventTime = addDays(now, -(0.5 + Math.random() * 1.5)); // 0.5-2 days ago
        events[events.length - 1].event_time = lastEventTime.toISOString();
      }
      
      allEvents.push(...events);
      shipmentCounter++;
    }

    console.log('\n💾 Inserting shipments into database...');
    
    // Insert shipments
    const { error: insertShipmentsError } = await supabase
      .from('shipments')
      .insert(shipments);

    if (insertShipmentsError) {
      console.error('❌ Error inserting shipments:', insertShipmentsError);
      process.exit(1);
    }

    console.log(`✅ Inserted ${shipments.length} shipments`);

    console.log('\n💾 Inserting events into database...');
    
    // Insert events in batches
    const batchSize = 100;
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize);
      const { error: insertEventsError } = await supabase
        .from('shipment_events')
        .insert(batch);

      if (insertEventsError) {
        console.error(`❌ Error inserting events batch ${Math.floor(i / batchSize) + 1}:`, insertEventsError);
        process.exit(1);
      }
    }

    console.log(`✅ Inserted ${allEvents.length} events`);

    console.log('\n✅ Database reset and seeded successfully!');
    console.log(`   - ${shipments.filter(s => s.current_status === 'Canceled').length} canceled shipments`);
    console.log(`   - ${shipments.filter(s => s.current_status === 'Order scheduled').length} future shipments`);
    console.log(`   - ${shipments.filter(s => s.current_status === 'Delivered').length} completed shipments`);
    console.log(`   - ${shipments.filter(s => s.current_status === 'In Transit').length} in progress shipments`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetAndSeedDatabase();


