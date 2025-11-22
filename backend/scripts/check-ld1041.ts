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

async function checkLD1041() {
  console.log('🔍 Checking LD1041 shipment data...\n');

  try {
    // Get shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('shipment_id', 'LD1041')
      .single();

    if (shipmentError) {
      console.error('❌ Error fetching shipment:', shipmentError);
      process.exit(1);
    }

    if (!shipment) {
      console.log('ℹ️  Shipment LD1041 not found');
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
      .eq('shipment_id', 'LD1041')
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

    // Calculate expected times for steps
    const now = new Date();
    const orderDate = new Date(shipment.order_date);
    const expectedDelivery = new Date(shipment.expected_delivery);
    
    console.log('📊 Timeline Analysis:');
    console.log(`   Current Date: ${now.toISOString()}`);
    console.log(`   Order Date: ${orderDate.toISOString()}`);
    console.log(`   Expected Delivery: ${expectedDelivery.toISOString()}`);
    
    // Find the "Crossed border" event
    const crossedBorderEvent = events?.find(e => 
      e.event_stage.toLowerCase().includes('crossed border')
    );
    
    if (crossedBorderEvent) {
      const crossedBorderTime = new Date(crossedBorderEvent.event_time);
      console.log(`\n   "Crossed border" completed: ${crossedBorderTime.toISOString()}`);
      
      // Check subsequent steps
      const subsequentSteps = [
        'Border inspection',
        'Package arrived at regional carrier facility',
        'Package arrived at pick-up point',
      ];
      
      for (const stepName of subsequentSteps) {
        const stepEvent = events?.find(e => 
          e.event_stage.toLowerCase().includes(stepName.toLowerCase())
        );
        
        if (!stepEvent) {
          // Step hasn't happened yet - calculate expected time
          // These steps should happen shortly after crossing border (within hours)
          // But if they're showing 71 days delay, the expected time must be wrong
          console.log(`\n   "${stepName}":`);
          console.log(`      Status: Not completed`);
          console.log(`      Expected: Should be shortly after crossing border`);
        } else {
          const stepTime = new Date(stepEvent.event_time);
          const daysAfterBorder = Math.floor((stepTime.getTime() - crossedBorderTime.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`\n   "${stepName}":`);
          console.log(`      Completed: ${stepTime.toISOString()}`);
          console.log(`      Days after border: ${daysAfterBorder}`);
        }
      }
      
      // Calculate delay
      const daysSinceBorder = Math.floor((now.getTime() - crossedBorderTime.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`\n   Days since crossing border: ${daysSinceBorder} days`);
      
      // The issue: if expected times for subsequent steps are on the same day as crossing border,
      // and today is 71 days later, they'll show 71 days delay
      console.log(`\n   ⚠️  Issue: If expected times for subsequent steps are set to Sep 12, 2025`);
      console.log(`      (same day as crossing border), and today is Nov 22-23, 2025,`);
      console.log(`      they will show ~71 days delay even though they should happen`);
      console.log(`      shortly after crossing border (within hours/days).`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkLD1041();

