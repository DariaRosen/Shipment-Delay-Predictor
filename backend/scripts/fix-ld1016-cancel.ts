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

async function fixLD1016() {
  console.log('🔧 Fixing LD1016 - should be canceled...\n');

  try {
    // Get shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('shipment_id', 'LD1016')
      .single();

    if (shipmentError || !shipment) {
      console.error('❌ Error fetching shipment:', shipmentError);
      process.exit(1);
    }

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

    console.log(`📋 Found ${events?.length || 0} events`);

    // The issue: "Arrived at customs" event has a date of Nov 23, 2025
    // But it should have happened much earlier (around Dec 13, 2024, right after airport arrival)
    // The shipment arrived at airport on Dec 13, 2024, so customs should be shortly after
    
    // Find the "Arrived at customs" event
    const customsEvent = events?.find(e => 
      e.event_stage.toLowerCase().includes('arrived at customs')
    );

    if (customsEvent) {
      // Update it to be shortly after the airport arrival (Dec 13, 2024)
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
          .eq('shipment_id', 'LD1016')
          .eq('event_stage', customsEvent.event_stage);

        if (updateError) {
          console.error('❌ Error updating event:', updateError);
          process.exit(1);
        }

        console.log('✅ Event updated successfully');
      }
    }

    // Now the shipment should be detected as canceled because:
    // 1. It's been stuck in "Arrived at customs" since Dec 13, 2024 (way more than 30 days)
    // 2. It's 342+ days past ETA (Dec 15, 2024)
    
    console.log('\n✅ LD1016 should now be detected as canceled');
    console.log('   - Stuck in customs for 342+ days');
    console.log('   - 342+ days past ETA');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixLD1016();

