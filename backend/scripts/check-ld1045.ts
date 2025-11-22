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

async function checkLD1045() {
  console.log('🔍 Checking LD1045 shipment data...\n');

  try {
    // Get shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('shipment_id', 'LD1045')
      .single();

    if (shipmentError) {
      console.error('❌ Error fetching shipment:', shipmentError);
      process.exit(1);
    }

    if (!shipment) {
      console.log('ℹ️  Shipment LD1045 not found');
      return;
    }

    console.log('📦 Shipment Data:');
    console.log(`   Order Date: ${shipment.order_date}`);
    console.log(`   Expected Delivery: ${shipment.expected_delivery}`);
    console.log(`   Current Status: ${shipment.current_status}`);
    console.log(`   Mode: ${shipment.mode}`);
    console.log(`   Origin: ${shipment.origin_city}`);
    console.log(`   Destination: ${shipment.dest_city}`);
    console.log('\n');

    // Get events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', 'LD1045')
      .order('event_time', { ascending: true });

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      process.exit(1);
    }

    console.log(`📋 Events (${events?.length || 0}):`);
    if (events && events.length > 0) {
      events.forEach((event, index) => {
        const eventDate = new Date(event.event_time);
        const now = new Date();
        const daysAgo = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`\n${index + 1}. ${event.event_stage}`);
        console.log(`   Time: ${event.event_time} (${daysAgo} days ago)`);
        console.log(`   Description: ${event.description || 'N/A'}`);
      });
    } else {
      console.log('   No events found');
    }

    console.log('\n');

    // Calculate timeline
    const now = new Date();
    const orderDate = new Date(shipment.order_date);
    const expectedDelivery = new Date(shipment.expected_delivery);
    
    console.log('📊 Timeline Analysis:');
    console.log(`   Current Date: ${now.toISOString()}`);
    console.log(`   Order Date: ${orderDate.toISOString()}`);
    console.log(`   Expected Delivery: ${expectedDelivery.toISOString()}`);
    
    // Find the last completed event
    const sortedEvents = [...events || []].sort(
      (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
    );
    
    if (sortedEvents.length > 0) {
      const lastEvent = sortedEvents[0];
      const lastEventTime = new Date(lastEvent.event_time);
      const daysSinceLastEvent = Math.floor((now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`\n   Last Event: ${lastEvent.event_stage}`);
      console.log(`   Last Event Time: ${lastEventTime.toISOString()}`);
      console.log(`   Days Since Last Event: ${daysSinceLastEvent} days`);
      
      // Calculate what the expected times should be for future steps
      console.log(`\n   Expected times for future steps should be:`);
      console.log(`   - Based on last completed step: ${lastEventTime.toISOString()}`);
      console.log(`   - Not based on original ETA: ${expectedDelivery.toISOString()}`);
      
      // Check if there are steps that should happen after the last event
      const futureSteps = [
        'Import customs clearance started',
        'Import customs clearance completed',
        'Package arrived at regional carrier facility',
        'Package arrived at pick-up point',
      ];
      
      for (const stepName of futureSteps) {
        const stepEvent = events?.find(e => 
          e.event_stage.toLowerCase().includes(stepName.toLowerCase())
        );
        
        if (!stepEvent) {
          // Calculate expected time based on step duration
          let stepDurationHours = 24; // Default
          if (stepName.includes('customs clearance started')) stepDurationHours = 0; // Should happen immediately
          if (stepName.includes('customs clearance completed')) stepDurationHours = 48; // 48 hours for customs
          if (stepName.includes('regional carrier facility')) stepDurationHours = 12; // 12 hours for sea
          if (stepName.includes('pick-up point')) stepDurationHours = 8; // 8 hours for sea
          
          const expectedTime = new Date(lastEventTime.getTime() + (stepDurationHours * 60 * 60 * 1000));
          const daysDelay = Math.floor((now.getTime() - expectedTime.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`\n   "${stepName}":`);
          console.log(`      Status: Not completed`);
          console.log(`      Should be expected: ${expectedTime.toISOString()}`);
          console.log(`      Days delay (if expected time is correct): ${daysDelay} days`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkLD1045();

