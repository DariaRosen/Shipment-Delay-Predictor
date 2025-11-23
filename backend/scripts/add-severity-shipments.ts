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

// Generate events for a shipment based on mode and delay
// delayStage: 'customs' | 'port' | 'transit' - where the delay occurs
function generateEventsForDelayedShipment(
  shipment: ShipmentData,
  delayDays: number,
  originalTimelineDays: number,
  delayStage: 'customs' | 'port' | 'transit' = 'customs',
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
    
    // Add delay at port/airport if delayStage is 'port'
    if (delayStage === 'port') {
      currentTime = addDays(currentTime, delayDays);
    }
    
    currentTime = addHours(currentTime, 0);
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Package leaving origin country/region',
      description: null,
      location: 'In Transit',
    });
    
    // Flight time
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
    
    // Add delay - stuck at customs for delayDays (if delayStage is 'customs')
    if (delayStage === 'customs') {
      currentTime = addDays(currentTime, delayDays);
    }
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Import customs clearance started',
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
    
    // Add delay at transit/hub if delayStage is 'transit'
    if (delayStage === 'transit') {
      currentTime = addDays(currentTime, delayDays);
    }
    
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
  } else if (mode === 'Sea') {
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
    
    // Add delay at port if delayStage is 'port'
    if (delayStage === 'port') {
      currentTime = addDays(currentTime, delayDays);
    }
    
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
    
    // Sea transit time
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
    
    // Add delay - stuck at customs for delayDays (if delayStage is 'customs')
    if (delayStage === 'customs') {
      currentTime = addDays(currentTime, delayDays);
    }
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Import customs clearance started',
      description: null,
      location: 'In Transit',
    });
    
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
    
    // Add delay - stuck at border for delayDays (if delayStage is 'customs')
    if (delayStage === 'customs') {
      currentTime = addDays(currentTime, delayDays);
    }
    events.push({
      shipment_id: shipment.shipment_id,
      event_time: currentTime.toISOString(),
      event_stage: 'Border inspection complete',
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
    
    // Add delay at transit/hub if delayStage is 'transit'
    if (delayStage === 'transit') {
      currentTime = addDays(currentTime, delayDays);
    }
    
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
  }
  
  // Ensure all events are in the past (before now)
  // If the last event is in the future, scale down the timeline proportionally
  const currentNow = new Date('2025-11-22T12:00:00Z');
  const lastEvent = events[events.length - 1];
  const lastEventTime = new Date(lastEvent.event_time);
  
  if (lastEventTime > currentNow) {
    // Calculate the scale factor to fit all events before now
    const totalDuration = lastEventTime.getTime() - orderDate.getTime();
    const targetDuration = currentNow.getTime() - orderDate.getTime() - (2 * 60 * 60 * 1000); // 2 hours before now
    const scaleFactor = targetDuration / totalDuration;
    
    // Rescale all event times (except the first one which is the order date)
    const firstEventTime = new Date(events[0].event_time).getTime();
    for (let i = 1; i < events.length; i++) {
      const originalTime = new Date(events[i].event_time).getTime();
      const adjustedTime = firstEventTime + (originalTime - firstEventTime) * scaleFactor;
      events[i].event_time = new Date(adjustedTime).toISOString();
    }
  }
  
  return events;
}

async function addSeverityShipments() {
  console.log('📦 Adding shipments with specific severity levels...\n');

  // Get current max shipment ID
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

  const shipments: ShipmentData[] = [];
  const allEvents: EventData[] = [];
  const now = new Date('2025-11-22T12:00:00Z');

  // Generate 3 Critical shipments (2+ days delay, close ETA ≤7 days)
  console.log('📦 Generating 3 Critical shipments (2+ days delay, close ETA)...');
  for (let i = 0; i < 3; i++) {
    const origin = randomElement(CITIES);
    const dest = randomElement(CITIES.filter(c => c.city !== origin.city));
    const delayDays = 2 + Math.random() * 3; // 2-5 days delay
    const originalTimelineDays = 3 + Math.random() * 4; // 3-7 days (close ETA)
    // For shipment to be delayDays past ETA at now: expectedDelivery = now - delayDays
    const expectedDelivery = addDays(now, -delayDays);
    const orderDate = addDays(expectedDelivery, -originalTimelineDays); // Order date = ETA - original timeline
    
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
    const events = generateEventsForDelayedShipment(shipment, delayDays, originalTimelineDays, 'customs');
    allEvents.push(...events);
    shipmentCounter++;
  }

  // Generate 3 more Critical shipments with delays at different stages
  console.log('📦 Generating 3 more Critical shipments with delays at different stages...');
  const delayStages: Array<'port' | 'customs' | 'transit'> = ['port', 'customs', 'transit'];
  for (let i = 0; i < 3; i++) {
    const origin = randomElement(CITIES);
    const dest = randomElement(CITIES.filter(c => c.city !== origin.city));
    const delayDays = 2 + Math.random() * 3; // 2-5 days delay
    const originalTimelineDays = 3 + Math.random() * 4; // 3-7 days (close ETA)
    // For shipment to be delayDays past ETA at now: expectedDelivery = now - delayDays
    const expectedDelivery = addDays(now, -delayDays);
    const orderDate = addDays(expectedDelivery, -originalTimelineDays); // Order date = ETA - original timeline
    
    // Use different delay stages: port, customs, transit
    const delayStage = delayStages[i];
    
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
      mode: delayStage === 'port' ? 'Sea' : randomElement(['Air', 'Sea', 'Road']), // Port delay only for Sea
      owner: randomElement(OWNERS),
    };
    
    shipments.push(shipment);
    const events = generateEventsForDelayedShipment(shipment, delayDays, originalTimelineDays, delayStage);
    allEvents.push(...events);
    shipmentCounter++;
  }

  // Generate 7 High shipments (2+ days delay, far ETA >7 days)
  console.log('📦 Generating 7 High shipments (2+ days delay, far ETA)...');
  for (let i = 0; i < 7; i++) {
    const origin = randomElement(CITIES);
    const dest = randomElement(CITIES.filter(c => c.city !== origin.city));
    const delayDays = 2 + Math.random() * 3; // 2-5 days delay
    const originalTimelineDays = 10 + Math.random() * 20; // 10-30 days (far ETA)
    // For shipment to be delayDays past ETA at now: expectedDelivery = now - delayDays
    const expectedDelivery = addDays(now, -delayDays);
    const orderDate = addDays(expectedDelivery, -originalTimelineDays); // Order date = ETA - original timeline
    
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
    const events = generateEventsForDelayedShipment(shipment, delayDays, originalTimelineDays);
    allEvents.push(...events);
    shipmentCounter++;
  }

  // Generate 5 Medium shipments (1 day delay, close ETA ≤7 days)
  console.log('📦 Generating 5 Medium shipments (1 day delay, close ETA)...');
  for (let i = 0; i < 5; i++) {
    const origin = randomElement(CITIES);
    const dest = randomElement(CITIES.filter(c => c.city !== origin.city));
    const delayDays = 1; // Exactly 1 day delay
    const originalTimelineDays = 3 + Math.random() * 4; // 3-7 days (close ETA)
    // For shipment to be delayDays past ETA at now: expectedDelivery = now - delayDays
    const expectedDelivery = addDays(now, -delayDays);
    const orderDate = addDays(expectedDelivery, -originalTimelineDays); // Order date = ETA - original timeline
    
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
    const events = generateEventsForDelayedShipment(shipment, delayDays, originalTimelineDays);
    allEvents.push(...events);
    shipmentCounter++;
  }

  // Generate 10 Low shipments (1 day delay, far ETA >7 days)
  console.log('📦 Generating 10 Low shipments (1 day delay, far ETA)...');
  for (let i = 0; i < 10; i++) {
    const origin = randomElement(CITIES);
    const dest = randomElement(CITIES.filter(c => c.city !== origin.city));
    const delayDays = 1; // Exactly 1 day delay
    const originalTimelineDays = 10 + Math.random() * 20; // 10-30 days (far ETA)
    // For shipment to be delayDays past ETA at now: expectedDelivery = now - delayDays
    const expectedDelivery = addDays(now, -delayDays);
    const orderDate = addDays(expectedDelivery, -originalTimelineDays); // Order date = ETA - original timeline
    
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
    const events = generateEventsForDelayedShipment(shipment, delayDays, originalTimelineDays);
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

  console.log('\n✅ Shipments added successfully!');
  console.log(`   - 3 Critical shipments (2+ days delay, close ETA)`);
  console.log(`   - 7 High shipments (2+ days delay, far ETA)`);
  console.log(`   - 5 Medium shipments (1 day delay, close ETA)`);
  console.log(`   - 10 Low shipments (1 day delay, far ETA)`);
}

addSeverityShipments();

