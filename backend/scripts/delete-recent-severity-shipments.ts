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

async function deleteRecentSeverityShipments() {
  console.log('🗑️  Deleting recently added severity shipments (LD0091 onwards)...\n');

  // Delete events first (foreign key constraint)
  const { error: deleteEventsError } = await supabase
    .from('shipment_events')
    .delete()
    .gte('shipment_id', 'LD0091');

  if (deleteEventsError) {
    console.error('❌ Error deleting events:', deleteEventsError);
    process.exit(1);
  }

  console.log('✅ Deleted events for shipments LD0091 onwards');

  // Delete shipments
  const { error: deleteShipmentsError } = await supabase
    .from('shipments')
    .delete()
    .gte('shipment_id', 'LD0091');

  if (deleteShipmentsError) {
    console.error('❌ Error deleting shipments:', deleteShipmentsError);
    process.exit(1);
  }

  console.log('✅ Deleted shipments LD0091 onwards');
  console.log('\n✅ Cleanup complete!');
}

deleteRecentSeverityShipments();

