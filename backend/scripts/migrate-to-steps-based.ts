import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { StepSelectorService, StepSelectionCriteria } from '../src/alerts/services/step-selector.service';

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
const stepSelector = new StepSelectorService();

interface ShipmentRow {
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
  mode: string;
  priority_level: string;
  owner: string;
}

interface EventRow {
  event_time: string;
  event_stage: string;
  description: string | null;
  location: string | null;
}

interface StepDefinition {
  step_id: number;
  step_name: string;
  step_description: string | null;
  step_type: string;
  expected_duration_hours: number;
  is_required: boolean;
  applies_to_modes: string | null;
}

/**
 * Calculate expected completion time for a step based on order date, ETA, and step order
 */
function calculateExpectedCompletionTime(
  orderDate: Date,
  plannedEta: Date,
  stepIndex: number,
  totalSteps: number,
  stepDurationHours: number,
  cumulativeDurationHours: number,
  totalDurationHours: number,
): Date {
  if (totalDurationHours === 0) {
    // Distribute evenly if no duration info
    const progress = (stepIndex + 1) / totalSteps;
    return new Date(orderDate.getTime() + (plannedEta.getTime() - orderDate.getTime()) * progress);
  }

  // Use cumulative duration to calculate progress
  const progress = cumulativeDurationHours / totalDurationHours;
  return new Date(orderDate.getTime() + (plannedEta.getTime() - orderDate.getTime()) * progress);
}

/**
 * Find matching event for a step (fuzzy matching by step name)
 */
function findMatchingEvent(
  stepName: string,
  events: EventRow[],
): EventRow | null {
  const stepNameLower = stepName.toLowerCase();
  
  // Try exact match first
  let match = events.find(
    (e) => e.event_stage.toLowerCase() === stepNameLower,
  );
  
  if (match) return match;
  
  // Try partial match (step name contains event stage or vice versa)
  match = events.find((e) => {
    const eventStageLower = e.event_stage.toLowerCase();
    return (
      stepNameLower.includes(eventStageLower.substring(0, 20)) ||
      eventStageLower.includes(stepNameLower.substring(0, 20))
    );
  });
  
  if (match) return match;
  
  // Try keyword matching for common patterns
  const keywords = stepNameLower.split(' ').filter((w) => w.length > 3);
  match = events.find((e) => {
    const eventStageLower = e.event_stage.toLowerCase();
    return keywords.some((keyword) => eventStageLower.includes(keyword));
  });
  
  return match || null;
}

/**
 * Migrate all shipments to the new steps-based structure
 */
async function migrateToStepsBased() {
  console.log('🚀 Starting migration to steps-based architecture...\n');

  // 1. Fetch all steps from catalog
  console.log('📋 Fetching steps catalog...');
  const { data: allSteps, error: stepsError } = await supabase
    .from('steps')
    .select('*')
    .order('step_id');

  if (stepsError || !allSteps || allSteps.length === 0) {
    console.error('❌ Error fetching steps catalog:', stepsError?.message);
    console.error('💡 Make sure you have run: npm run seed:steps');
    process.exit(1);
  }

  console.log(`✅ Found ${allSteps.length} steps in catalog\n`);

  // 2. Fetch all shipments
  console.log('📦 Fetching all shipments...');
  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('*')
    .order('shipment_id');

  if (shipmentsError) {
    console.error('❌ Error fetching shipments:', shipmentsError.message);
    process.exit(1);
  }

  if (!shipments || shipments.length === 0) {
    console.log('⚠️  No shipments found. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`✅ Found ${shipments.length} shipments to migrate\n`);

  // 3. Fetch all events grouped by shipment
  console.log('📥 Fetching all events...');
  const { data: allEvents, error: eventsError } = await supabase
    .from('shipment_events')
    .select('*')
    .order('shipment_id, event_time');

  if (eventsError) {
    console.error('❌ Error fetching events:', eventsError.message);
    process.exit(1);
  }

  // Group events by shipment_id
  const eventsByShipment = new Map<string, EventRow[]>();
  (allEvents || []).forEach((event: any) => {
    if (!eventsByShipment.has(event.shipment_id)) {
      eventsByShipment.set(event.shipment_id, []);
    }
    eventsByShipment.get(event.shipment_id)!.push({
      event_time: event.event_time,
      event_stage: event.event_stage,
      description: event.description,
      location: event.location,
    });
  });

  console.log(`✅ Found events for ${eventsByShipment.size} shipments\n`);

  // 4. Clear existing shipment_timeline (if any)
  console.log('🧹 Clearing existing shipment_timeline...');
  const { error: deleteError } = await supabase
    .from('shipment_timeline')
    .delete()
    .neq('shipment_step_id', 0); // Delete all

  if (deleteError) {
    console.error('⚠️  Error clearing shipment_timeline (may not exist yet):', deleteError.message);
  } else {
    console.log('✅ Cleared existing shipment_timeline\n');
  }

  // 5. Process each shipment
  console.log('🔄 Processing shipments...\n');
  let successCount = 0;
  let errorCount = 0;
  const batchSize = 50;
  const shipmentStepsToInsert: any[] = [];

  for (let i = 0; i < shipments.length; i++) {
    const shipment = shipments[i] as ShipmentRow;
    const events = eventsByShipment.get(shipment.shipment_id) || [];

    try {
      // Determine selection criteria
      const isInternational =
        shipment.origin_country &&
        shipment.dest_country &&
        shipment.origin_country !== shipment.dest_country;

      const criteria: StepSelectionCriteria = {
        mode: shipment.mode as 'Air' | 'Sea' | 'Road',
        originCountry: shipment.origin_country || undefined,
        destCountry: shipment.dest_country || undefined,
        originCity: shipment.origin_city || undefined,
        destCity: shipment.dest_city || undefined,
        isInternational: isInternational || undefined,
        isLongDistance: stepSelector.isLongDistance({
          mode: shipment.mode as 'Air' | 'Sea' | 'Road',
          originCountry: shipment.origin_country || undefined,
          destCountry: shipment.dest_country || undefined,
        }),
        serviceLevel: shipment.service_level || undefined,
      };

      // Select relevant steps
      const selectedSteps = stepSelector.selectStepsForShipment(
        allSteps as StepDefinition[],
        criteria,
      );

      if (selectedSteps.length === 0) {
        console.log(`⚠️  No steps selected for ${shipment.shipment_id}`);
        errorCount++;
        continue;
      }

      // Calculate timing
      const orderDate = new Date(shipment.order_date);
      const plannedEta = new Date(shipment.expected_delivery);
      const totalDuration = plannedEta.getTime() - orderDate.getTime();
      
      // Calculate total expected duration hours
      let cumulativeHours = 0;
      const totalDurationHours = selectedSteps.reduce(
        (sum, step) => sum + Number(step.expected_duration_hours || 0),
        0,
      );

      // Create shipment_timeline records
      for (let stepIndex = 0; stepIndex < selectedSteps.length; stepIndex++) {
        const step = selectedSteps[stepIndex];
        cumulativeHours += Number(step.expected_duration_hours || 0);

        // Calculate expected completion time
        const expectedCompletionTime = calculateExpectedCompletionTime(
          orderDate,
          plannedEta,
          stepIndex,
          selectedSteps.length,
          Number(step.expected_duration_hours || 0),
          cumulativeHours,
          totalDurationHours,
        );

        // Try to find matching event
        const matchingEvent = findMatchingEvent(step.step_name, events);
        const actualCompletionTime = matchingEvent
          ? new Date(matchingEvent.event_time)
          : null;

        // For first step (order created), always use order date
        let finalActualTime = actualCompletionTime;
        if (
          stepIndex === 0 &&
          step.step_name.toLowerCase().includes('order has been successfully created')
        ) {
          finalActualTime = orderDate;
        }

        shipmentStepsToInsert.push({
          shipment_id: shipment.shipment_id,
          step_id: step.step_id,
          step_order: stepIndex + 1,
          expected_completion_time: expectedCompletionTime.toISOString(),
          actual_completion_time: finalActualTime?.toISOString() || null,
          location: matchingEvent?.location || null,
          description: matchingEvent?.description || step.step_description || null,
        });
      }

      successCount++;

      // Insert in batches
      if (shipmentStepsToInsert.length >= batchSize) {
        const { error: insertError } = await supabase
          .from('shipment_timeline')
          .insert(shipmentStepsToInsert);

        if (insertError) {
          console.error(`❌ Error inserting batch:`, insertError.message);
          errorCount += Math.floor(shipmentStepsToInsert.length / selectedSteps.length);
          successCount -= Math.floor(shipmentStepsToInsert.length / selectedSteps.length);
        } else {
          console.log(`✅ Inserted batch of ${shipmentStepsToInsert.length} shipment_timeline records`);
        }
        shipmentStepsToInsert.length = 0; // Clear array
      }

      if ((i + 1) % 10 === 0) {
        console.log(`   Processed ${i + 1}/${shipments.length} shipments...`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${shipment.shipment_id}:`, error.message);
      errorCount++;
    }
  }

  // Insert remaining shipment_timeline records
  if (shipmentStepsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('shipment_steps')
      .insert(shipmentStepsToInsert);

    if (insertError) {
      console.error(`❌ Error inserting final batch:`, insertError.message);
      errorCount += Math.floor(shipmentStepsToInsert.length / 20); // Estimate
    } else {
      console.log(`✅ Inserted final batch of ${shipmentStepsToInsert.length} shipment_timeline records`);
    }
  }

  console.log('\n✅ Migration completed!');
  console.log(`   ✅ Successfully migrated: ${successCount} shipments`);
  console.log(`   ❌ Errors: ${errorCount} shipments`);
  console.log(`   📊 Total shipment_timeline records created: ${successCount * 15} (estimated)`);
}

// Run the migration
migrateToStepsBased()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

