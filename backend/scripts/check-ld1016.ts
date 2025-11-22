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

async function checkLD1016() {
  console.log('🔍 Checking LD1016 shipment data...\n');

  try {
    // Get shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('shipment_id', 'LD1016')
      .single();

    if (shipmentError) {
      console.error('❌ Error fetching shipment:', shipmentError);
      process.exit(1);
    }

    if (!shipment) {
      console.log('ℹ️  Shipment LD1016 not found');
      return;
    }

    console.log('📦 Shipment Data:');
    console.log(JSON.stringify(shipment, null, 2));
    console.log('\n');

    // Get events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', 'LD1016')
      .order('event_time', { ascending: true });

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      process.exit(1);
    }

    console.log(`📋 Events (${events?.length || 0}):`);
    if (events && events.length > 0) {
      events.forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.event_stage}`);
        console.log(`   Time: ${event.event_time}`);
        console.log(`   Description: ${event.description || 'N/A'}`);
        console.log(`   Location: ${event.location || 'N/A'}`);
      });
    } else {
      console.log('   No events found');
    }

    console.log('\n');

    // Calculate cancellation conditions
    const now = new Date();
    const orderDate = new Date(shipment.order_date);
    const expectedDelivery = new Date(shipment.expected_delivery);
    const daysPastEta = (now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24);

    console.log('📊 Cancellation Analysis:');
    console.log(`   Order Date: ${orderDate.toISOString()}`);
    console.log(`   Expected Delivery: ${expectedDelivery.toISOString()}`);
    console.log(`   Current Date: ${now.toISOString()}`);
    console.log(`   Days Past ETA: ${Math.floor(daysPastEta)} days`);
    console.log(`   Current Status: ${shipment.current_status}`);

    // Check dwell time
    if (events && events.length > 0) {
      const sortedEvents = [...events].sort(
        (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
      );
      const latestEvent = sortedEvents[0];
      const latestEventTime = new Date(latestEvent.event_time);
      const daysSinceLastEvent = (now.getTime() - latestEventTime.getTime()) / (1000 * 60 * 60 * 24);

      console.log(`   Latest Event: ${latestEvent.event_stage} at ${latestEventTime.toISOString()}`);
      console.log(`   Days Since Last Event: ${Math.floor(daysSinceLastEvent)} days`);

      // Check if stuck in same stage
      const sameStageEvents = events.filter(
        (e) => e.event_stage.toLowerCase() === latestEvent.event_stage.toLowerCase(),
      );
      if (sameStageEvents.length > 1) {
        const firstSameStageEvent = sameStageEvents.sort(
          (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime(),
        )[0];
        const firstSameStageTime = new Date(firstSameStageEvent.event_time);
        const dwellTime = (now.getTime() - firstSameStageTime.getTime()) / (1000 * 60 * 60 * 24);
        console.log(`   Dwell Time in "${latestEvent.event_stage}": ${Math.floor(dwellTime)} days`);
        console.log(`   Should be canceled: ${dwellTime > 30 && daysPastEta >= 14 ? 'YES ✅' : 'NO ❌'}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkLD1016();

