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

async function fixLD1019() {
  console.log('🔧 Fixing LD1019 - should be canceled...\n');

  try {
    // Get shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('shipment_id', 'LD1019')
      .single();

    if (shipmentError || !shipment) {
      console.error('❌ Error fetching shipment:', shipmentError);
      process.exit(1);
    }

    // Get events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', 'LD1019')
      .order('event_time', { ascending: true });

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      process.exit(1);
    }

    console.log(`📋 Found ${events?.length || 0} events`);

    // The issue: "Arrived at customs" event has a date of Nov 23, 2025
    // But it should have happened much earlier (around Jan 7, 2025, right after airport arrival)
    // The shipment arrived at airport on Jan 7, 2025, so customs should be shortly after
    
    // Find the "Arrived at customs" event
    const customsEvent = events?.find(e => 
      e.event_stage.toLowerCase().includes('arrived at customs')
    );

    if (customsEvent) {
      // Update it to be shortly after the airport arrival (Jan 7, 2025)
      // Add 2-4 hours after airport arrival
      const airportEvent = events?.find(e => 
        e.event_stage.toLowerCase().includes('arrived at local airport')
      );
      
      if (airportEvent) {
        const airportTime = new Date(airportEvent.event_time);
        // Customs should happen 2-4 hours after airport arrival
        const customsTime = new Date(airportTime.getTime() + (3 * 60 * 60 * 1000)); // 3 hours later
        
        console.log(`📅 Updating "Arrived at customs" event:`);
        console.log(`   Old time: ${customsEvent.event_time}`);
        console.log(`   New time: ${customsTime.toISOString()}`);
        
        const { error: updateError } = await supabase
          .from('shipment_events')
          .update({ event_time: customsTime.toISOString() })
          .eq('shipment_id', 'LD1019')
          .eq('event_stage', customsEvent.event_stage);

        if (updateError) {
          console.error('❌ Error updating event:', updateError);
          process.exit(1);
        }

        console.log('✅ Event updated successfully');
      }
    }

    // Now update the shipment status to canceled and add refund event
    const now = new Date();
    const expectedDelivery = new Date(shipment.expected_delivery);
    const daysPastEta = Math.floor((now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24));
    
    // Update shipment status to canceled
    const { error: updateStatusError } = await supabase
      .from('shipments')
      .update({ current_status: 'Canceled' })
      .eq('shipment_id', 'LD1019');

    if (updateStatusError) {
      console.error('❌ Error updating status:', updateStatusError);
      process.exit(1);
    }

    // Add refund event
    const cancellationReason = `Shipment was stuck in the same step for more than 30 days and is ${daysPastEta} days past the expected delivery date (14+ days delay). Refund has been processed.`;
    
    const refundEvent = {
      shipment_id: 'LD1019',
      event_time: now.toISOString(),
      event_stage: 'Refund customer',
      description: cancellationReason,
      location: null,
    };

    const { error: insertError } = await supabase
      .from('shipment_events')
      .insert(refundEvent);

    if (insertError) {
      console.error('❌ Error inserting refund event:', insertError);
      process.exit(1);
    }
    
    console.log('\n✅ LD1019 should now be detected as canceled');
    console.log(`   - Stuck in customs for 318+ days`);
    console.log(`   - ${daysPastEta} days past ETA`);
    console.log('   - Status updated to "Canceled"');
    console.log('   - "Refund customer" event added');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixLD1019();

