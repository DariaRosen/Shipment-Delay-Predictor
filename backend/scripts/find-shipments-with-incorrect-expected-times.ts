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

async function findShipmentsWithIncorrectExpectedTimes() {
  console.log('🔍 Finding shipments with incorrect expected times...\n');

  try {
    // Get all shipments
    const { data: shipments, error: fetchError } = await supabase
      .from('shipments')
      .select('shipment_id, order_date, expected_delivery, current_status, mode')
      .order('shipment_id', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching shipments:', fetchError);
      process.exit(1);
    }

    if (!shipments || shipments.length === 0) {
      console.log('ℹ️  No shipments found');
      return;
    }

    console.log(`📦 Checking ${shipments.length} shipments...\n`);

    const now = new Date();
    const problematicShipments: Array<{
      shipmentId: string;
      issue: string;
      lastCompletedEvent: string;
      lastCompletedTime: string;
      expectedDelivery: string;
      daysPastEta: number;
    }> = [];

    for (const shipment of shipments) {
      try {
        // Skip future shipments
        const orderDate = new Date(shipment.order_date);
        if (orderDate > now) {
          continue;
        }

        // Skip canceled shipments
        if (shipment.current_status && shipment.current_status.toLowerCase().includes('canceled')) {
          continue;
        }

        // Get events
        const { data: events, error: eventsError } = await supabase
          .from('shipment_events')
          .select('*')
          .eq('shipment_id', shipment.shipment_id)
          .order('event_time', { ascending: true });

        if (eventsError || !events || events.length === 0) {
          continue;
        }

        // Find the last completed event
        const sortedEvents = [...events].sort(
          (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
        );
        
        // Skip if last event is refund/canceled/completed
        const lastEvent = sortedEvents[0];
        const lastEventStage = lastEvent.event_stage.toLowerCase();
        if (
          lastEventStage.includes('refund') ||
          lastEventStage.includes('canceled') ||
          lastEventStage.includes('package received by customer') ||
          lastEventStage.includes('delivered')
        ) {
          continue;
        }

        const lastEventTime = new Date(lastEvent.event_time);
        const expectedDelivery = new Date(shipment.expected_delivery);
        const daysPastEta = Math.floor((now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24));

        // Check if the expected delivery is very close to the last event time
        // This indicates that subsequent steps have expected times on the same day
        const timeDiff = expectedDelivery.getTime() - lastEventTime.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // If ETA is within 24 hours of last event but shipment is 14+ days past ETA,
        // this indicates the expected times are wrong
        if (hoursDiff < 24 && daysPastEta >= 14) {
          problematicShipments.push({
            shipmentId: shipment.shipment_id,
            issue: `Expected delivery (${expectedDelivery.toISOString()}) is only ${Math.floor(hoursDiff)} hours after last event (${lastEventTime.toISOString()}), but shipment is ${daysPastEta} days past ETA`,
            lastCompletedEvent: lastEvent.event_stage,
            lastCompletedTime: lastEventTime.toISOString(),
            expectedDelivery: expectedDelivery.toISOString(),
            daysPastEta: daysPastEta,
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${shipment.shipment_id}:`, error);
      }
    }

    if (problematicShipments.length === 0) {
      console.log('✅ No shipments found with incorrect expected times');
    } else {
      console.log(`⚠️  Found ${problematicShipments.length} shipments with incorrect expected times:\n`);
      
      problematicShipments.forEach((shipment, index) => {
        console.log(`${index + 1}. ${shipment.shipmentId}`);
        console.log(`   Last Completed: ${shipment.lastCompletedEvent} (${shipment.lastCompletedTime})`);
        console.log(`   Expected Delivery: ${shipment.expectedDelivery}`);
        console.log(`   Days Past ETA: ${shipment.daysPastEta} days`);
        console.log(`   Issue: ${shipment.issue}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findShipmentsWithIncorrectExpectedTimes();

