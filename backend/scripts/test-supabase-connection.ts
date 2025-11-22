import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...\n');
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Key:', supabaseKey ? `✅ Set (${supabaseKey.substring(0, 20)}...)` : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  try {
    console.log('\n🔍 Testing database connection...');
    
    // Test query
    const { data, error } = await supabase
      .from('alerts')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error);
      process.exit(1);
    }

    console.log('✅ Connection successful!');
    
    // Get count
    const { count, error: countError } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('⚠️  Could not get count:', countError.message);
    } else {
      console.log(`📊 Found ${count} alerts in database`);
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

testConnection();

