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

// Helper to create a date from days ago
const daysAgo = (days: number): Date => {
  const date = new Date('2025-11-25T00:00:00Z'); // Base date: November 25, 2025
  date.setDate(date.getDate() - days);
  return date;
};

// Helper to create a date in the future
const daysFromNow = (days: number): Date => {
  const date = new Date('2025-11-25T00:00:00Z'); // Base date: November 25, 2025
  date.setDate(date.getDate() + days);
  return date;
};

// Generate random number between min and max
const randomBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Cities and carriers for variety
const ORIGINS = [
  'Shanghai', 'Tokyo', 'Singapore', 'Hong Kong', 'Seoul', 'Bangkok', 'Mumbai', 'Dubai',
  'London', 'Frankfurt', 'Paris', 'Amsterdam', 'Barcelona', 'Istanbul',
  'New York', 'Los Angeles', 'Chicago', 'Miami', 'Toronto', 'Vancouver',
  'São Paulo', 'Buenos Aires', 'Mexico City', 'Sydney', 'Melbourne'
];

const DESTINATIONS = [
  'Los Angeles', 'New York', 'Chicago', 'Miami', 'Seattle', 'Houston', 'Toronto', 'Vancouver',
  'London', 'Paris', 'Amsterdam', 'Frankfurt', 'Barcelona', 'Rome', 'Madrid',
  'Tokyo', 'Shanghai', 'Singapore', 'Hong Kong', 'Seoul', 'Sydney', 'Melbourne',
  'São Paulo', 'Buenos Aires', 'Mexico City', 'Dubai', 'Istanbul'
];

const CARRIERS = {
  Air: ['SkyBridge', 'AeroLink', 'GlobalAir', 'ExpressWings', 'FastFly'],
  Sea: ['OceanBlue', 'BlueWave', 'PacificStar', 'Mediterranean', 'AtlanticCargo'],
  Road: ['NorthDrive', 'FastTrack', 'Continental', 'CrossBorder', 'ExpressRoad']
};

const OWNERS = [
  'west-coast-team', 'east-coast-team', 'air-expedite', 'gulf-team', 'europe-team',
  'asia-pacific', 'road-east', 'road-west', 'road-south', 'pacific', 'emea-air'
];

const STAGES = {
  Air: [
    'Package collected by carrier',
    'Package received by sorting center of origin',
    'Package left sorting center of origin',
    'Your package arrived at airport. Awaiting transit',
    'Export customs clearance started',
    'Export customs clearance complete',
    'Awaiting flight',
    'Package leaving origin country/region',
    'Your package arrived at local airport',
    'Arrived at customs',
    'Import customs clearance started',
    'Import customs clearance completed',
    'Package arrived at regional carrier facility',
    'Out for Delivery'
  ],
  Sea: [
    'Package collected by carrier',
    'Package received by sorting center of origin',
    'Package left sorting center of origin',
    'Export customs clearance started',
    'Export customs clearance complete',
    'Package arrived at port',
    'Port Loading',
    'Container loaded onto vessel',
    'Vessel departed',
    'In transit at sea',
    'Vessel arrived at destination port',
    'Container unloaded from vessel',
    'Arrived at customs',
    'Import customs clearance started',
    'Import customs clearance completed',
    'Package arrived at regional carrier facility'
  ],
  Road: [
    'Package collected by carrier',
    'Package received by sorting center of origin',
    'Package left sorting center of origin',
    'In transit',
    'Crossed border',
    'Border inspection',
    'Package arrived at regional carrier facility',
    'At Hub',
    'Out for Delivery'
  ]
};

function generateInProgressShipments(count: number) {
  const shipments: any[] = [];
  const events: any[] = [];
  let shipmentIdCounter = 2000; // Start from LD2000 to avoid conflicts

  for (let i = 0; i < count; i++) {
    const mode = ['Air', 'Sea', 'Road'][randomBetween(0, 2)] as 'Air' | 'Sea' | 'Road';
    const shipmentId = `LD${shipmentIdCounter++}`;
    
    // Random origin and destination (ensure they're different)
    let origin = ORIGINS[randomBetween(0, ORIGINS.length - 1)];
    let destination = DESTINATIONS[randomBetween(0, DESTINATIONS.length - 1)];
    while (origin === destination) {
      destination = DESTINATIONS[randomBetween(0, DESTINATIONS.length - 1)];
    }

    const carrier = CARRIERS[mode][randomBetween(0, CARRIERS[mode].length - 1)];
    const owner = OWNERS[randomBetween(0, OWNERS.length - 1)];
    const serviceLevel = ['Express', 'Std', 'Priority'][randomBetween(0, 2)];

    // Order date: 5-30 days ago
    const orderDaysAgo = randomBetween(5, 30);
    const orderDate = daysAgo(orderDaysAgo);

    // ETA: 3-45 days from now (ensuring it's in the future)
    const etaDaysFromNow = randomBetween(3, 45);
    const plannedEta = daysFromNow(etaDaysFromNow);

    // Current stage: random stage from the middle of the process (not first, not last)
    const availableStages = STAGES[mode];
    const stageIndex = randomBetween(2, availableStages.length - 2); // Avoid first and last stages
    const currentStage = availableStages[stageIndex];

    // Last milestone update: 0-3 days ago (to keep them active)
    const lastUpdateDaysAgo = randomBetween(0, 3);
    const lastMilestoneUpdate = daysAgo(lastUpdateDaysAgo);

    // Generate steps for this shipment
    const steps = generateShipmentSteps(mode, orderDate, plannedEta, currentStage);

    // Create shipment record
    shipments.push({
      shipment_id: shipmentId,
      order_date: orderDate.toISOString(),
      origin_country: origin.includes(' ') ? origin.split(' ')[0] : 'Unknown',
      origin_city: origin,
      dest_country: destination.includes(' ') ? destination.split(' ')[0] : 'Unknown',
      dest_city: destination,
      expected_delivery: plannedEta.toISOString(),
      current_status: currentStage,
      carrier: carrier,
      service_level: serviceLevel,
      mode: mode,
      priority_level: 'normal',
      owner: owner,
      acknowledged: false,
      acknowledged_by: null,
      acknowledged_at: null,
    });

    // Create events from steps
    steps.forEach((step, index) => {
      if (step.actualCompletionTime) {
        events.push({
          shipment_id: shipmentId,
          event_time: step.actualCompletionTime,
          event_stage: step.stepName,
          description: step.stepDescription || null,
          location: step.location || null,
        });
      }
    });
  }

  return { shipments, events };
}

async function main() {
  console.log('🚀 Adding more in-progress shipments...\n');

  try {
    // Generate 30 new in-progress shipments
    const { shipments, events } = generateInProgressShipments(30);

    console.log(`📦 Generated ${shipments.length} new shipments with ${events.length} events\n`);

    // Insert shipments
    console.log('📥 Inserting shipments...');
    const batchSize = 10;
    for (let i = 0; i < shipments.length; i += batchSize) {
      const batch = shipments.slice(i, i + batchSize);
      const { error } = await supabase.from('shipments').upsert(batch, {
        onConflict: 'shipment_id',
      });

      if (error) {
        console.error(`❌ Error inserting shipments batch ${Math.floor(i / batchSize) + 1}:`, error);
      } else {
        console.log(
          `✅ Inserted shipments batch ${Math.floor(i / batchSize) + 1} (${batch.length} shipments)`,
        );
      }
    }

    // Insert events
    console.log('\n📥 Inserting events...');
    for (let i = 0; i < events.length; i += batchSize * 5) {
      const batch = events.slice(i, i + batchSize * 5);
      const { error } = await supabase.from('shipment_events').upsert(batch, {
        onConflict: 'shipment_id,event_time,event_stage',
        ignoreDuplicates: false,
      });

      if (error) {
        console.error(`❌ Error inserting events batch ${Math.floor(i / (batchSize * 5)) + 1}:`, error);
      } else {
        console.log(
          `✅ Inserted events batch ${Math.floor(i / (batchSize * 5)) + 1} (${batch.length} events)`,
        );
      }
    }

    console.log(`\n✅ Successfully added ${shipments.length} new in-progress shipments!`);
    console.log(`   - ${shipments.length} shipments`);
    console.log(`   - ${events.length} events`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

