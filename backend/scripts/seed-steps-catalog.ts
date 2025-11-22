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

/**
 * Seed the steps catalog with all possible shipment steps
 */
async function seedStepsCatalog() {
  console.log('📋 Seeding steps catalog...\n');

  // Define all possible steps
  const steps = [
    // Common steps (apply to all modes)
    {
      step_name: 'Your order has been successfully created',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 0,
      is_required: true,
      applies_to_modes: null, // Applies to all
    },
    {
      step_name: 'Your package is currently being prepared',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 2,
      is_required: true,
      applies_to_modes: null,
    },
    {
      step_name: 'Your order is being packed',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 1,
      is_required: true,
      applies_to_modes: null,
    },
    {
      step_name: 'Package ready to be shipped by warehouse',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 0.5,
      is_required: true,
      applies_to_modes: null,
    },
    {
      step_name: 'Package left warehouse',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 1,
      is_required: true,
      applies_to_modes: null,
    },
    {
      step_name: 'Package collected by carrier',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 2,
      is_required: true,
      applies_to_modes: null,
    },
    {
      step_name: 'Package received by sorting center of origin',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 4,
      is_required: false, // May skip for local deliveries
      applies_to_modes: null,
    },
    {
      step_name: 'Package left sorting center of origin',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 6,
      is_required: false,
      applies_to_modes: null,
    },
    {
      step_name: 'Package arrived at regional carrier facility',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 6,
      is_required: false, // May have multiple sorting centers
      applies_to_modes: null,
    },
    {
      step_name: 'Package arrived at pick-up point',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 4,
      is_required: true,
      applies_to_modes: null,
    },
    {
      step_name: 'Awaiting pickup',
      step_description:
        'Your package is now available for pick up at the designated location. To ensure a smooth process, kindly take a look at the pickup instructions shared by the carrier.',
      step_type: 'Common',
      expected_duration_hours: 0,
      is_required: false,
      applies_to_modes: null,
    },
    {
      step_name: 'Package received by customer',
      step_description:
        'Your package has been successfully delivered and received by the customer.',
      step_type: 'Common',
      expected_duration_hours: 0,
      is_required: true,
      applies_to_modes: null,
    },
    {
      step_name: 'Refund customer',
      step_description:
        'Shipment was lost or stuck for more than 3 days. Refund has been processed.',
      step_type: 'Common',
      expected_duration_hours: 0,
      is_required: false,
      applies_to_modes: null,
    },

    // Air-specific steps
    {
      step_name: 'Your package arrived at airport. Awaiting transit',
      step_description: '',
      step_type: 'Air',
      expected_duration_hours: 12,
      is_required: true,
      applies_to_modes: 'Air',
    },
    {
      step_name: 'Awaiting flight',
      step_description: '',
      step_type: 'Air',
      expected_duration_hours: 12,
      is_required: true,
      applies_to_modes: 'Air',
    },
    {
      step_name: 'Package leaving origin country/region',
      step_description: '',
      step_type: 'Air',
      expected_duration_hours: 0,
      is_required: false, // Only for international
      applies_to_modes: 'Air',
    },
    {
      step_name: 'Your package arrived at local airport',
      step_description: '',
      step_type: 'Air',
      expected_duration_hours: 0,
      is_required: true,
      applies_to_modes: 'Air',
    },
    {
      step_name: 'Hub Dwell',
      step_description: '',
      step_type: 'Air',
      expected_duration_hours: 6,
      is_required: false, // Only for multi-hop flights
      applies_to_modes: 'Air',
    },

    // Sea-specific steps
    {
      step_name: 'Package arrived at port',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 24,
      is_required: true,
      applies_to_modes: 'Sea',
    },
    {
      step_name: 'Container loaded onto vessel',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 12,
      is_required: true,
      applies_to_modes: 'Sea',
    },
    {
      step_name: 'Vessel departed',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 0,
      is_required: true,
      applies_to_modes: 'Sea',
    },
    {
      step_name: 'In transit at sea',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 0,
      is_required: true,
      applies_to_modes: 'Sea',
    },
    {
      step_name: 'Vessel arrived at destination port',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 0,
      is_required: true,
      applies_to_modes: 'Sea',
    },
    {
      step_name: 'Container unloaded from vessel',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 12,
      is_required: true,
      applies_to_modes: 'Sea',
    },
    {
      step_name: 'Transshipment Hub',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 24,
      is_required: false, // Only for multi-port routes
      applies_to_modes: 'Sea',
    },
    {
      step_name: 'Awaiting Vessel',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 48,
      is_required: false,
      applies_to_modes: 'Sea',
    },

    // Road-specific steps
    {
      step_name: 'In transit',
      step_description: '',
      step_type: 'Road',
      expected_duration_hours: 0,
      is_required: true,
      applies_to_modes: 'Road',
    },
    {
      step_name: 'Crossed border',
      step_description: '',
      step_type: 'Road',
      expected_duration_hours: 0,
      is_required: false, // Only for cross-border
      applies_to_modes: 'Road',
    },
    {
      step_name: 'Border inspection',
      step_description: '',
      step_type: 'Road',
      expected_duration_hours: 12,
      is_required: false, // Only for cross-border
      applies_to_modes: 'Road',
    },
    {
      step_name: 'Out for Delivery',
      step_description: '',
      step_type: 'Road',
      expected_duration_hours: 0,
      is_required: false,
      applies_to_modes: 'Road',
    },
    {
      step_name: 'Ready for Dispatch',
      step_description: '',
      step_type: 'Road',
      expected_duration_hours: 0,
      is_required: false,
      applies_to_modes: 'Road',
    },

    // Customs steps (can apply to multiple modes)
    {
      step_name: 'Export customs clearance started',
      step_description: '',
      step_type: 'Customs',
      expected_duration_hours: 48,
      is_required: false, // Only for international
      applies_to_modes: 'Air,Sea',
    },
    {
      step_name: 'Export customs clearance complete',
      step_description: '',
      step_type: 'Customs',
      expected_duration_hours: 2,
      is_required: false,
      applies_to_modes: 'Air,Sea',
    },
    {
      step_name: 'Arrived at customs',
      step_description: '',
      step_type: 'Customs',
      expected_duration_hours: 0,
      is_required: false,
      applies_to_modes: 'Air,Sea',
    },
    {
      step_name: 'Import customs clearance started',
      step_description: '',
      step_type: 'Customs',
      expected_duration_hours: 48,
      is_required: false, // Only for international
      applies_to_modes: 'Air,Sea',
    },
    {
      step_name: 'Import customs clearance completed',
      step_description: '',
      step_type: 'Customs',
      expected_duration_hours: 2,
      is_required: false,
      applies_to_modes: 'Air,Sea',
    },
    {
      step_name: 'Awaiting Customs',
      step_description: '',
      step_type: 'Customs',
      expected_duration_hours: 24,
      is_required: false,
      applies_to_modes: 'Air,Sea',
    },
    {
      step_name: 'Customs Cleared',
      step_description: '',
      step_type: 'Customs',
      expected_duration_hours: 0,
      is_required: false,
      applies_to_modes: 'Air,Sea',
    },

    // Multi-modal steps (e.g., Sea + Road, Air + Road)
    {
      step_name: 'Your package will soon be handed over to the domestic courier company',
      step_description: '',
      step_type: 'MultiModal',
      expected_duration_hours: 24,
      is_required: false, // For international shipments with local delivery
      applies_to_modes: null, // Can apply to any mode combination
    },
    {
      step_name: 'Awaiting Docs',
      step_description: '',
      step_type: 'Common',
      expected_duration_hours: 24,
      is_required: false,
      applies_to_modes: null,
    },
    {
      step_name: 'Port Loading',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 12,
      is_required: false,
      applies_to_modes: 'Sea',
    },
    {
      step_name: 'Departed',
      step_description: '',
      step_type: 'Air',
      expected_duration_hours: 0,
      is_required: false,
      applies_to_modes: 'Air',
    },
    {
      step_name: 'At Sea',
      step_description: '',
      step_type: 'Sea',
      expected_duration_hours: 0,
      is_required: false,
      applies_to_modes: 'Sea',
    },
  ];

  // Insert steps (using upsert to avoid duplicates)
  console.log(`Inserting ${steps.length} steps into catalog...\n`);

  for (const step of steps) {
    const { data, error } = await supabase
      .from('steps')
      .upsert(
        {
          step_name: step.step_name,
          step_description: step.step_description,
          step_type: step.step_type,
          expected_duration_hours: step.expected_duration_hours,
          is_required: step.is_required,
          applies_to_modes: step.applies_to_modes,
        },
        {
          onConflict: 'step_name',
          ignoreDuplicates: false,
        },
      )
      .select();

    if (error) {
      console.error(`❌ Error inserting step "${step.step_name}":`, error.message);
    } else {
      console.log(`✅ ${step.step_name} (${step.step_type})`);
    }
  }

  console.log(`\n✅ Steps catalog seeded successfully!`);
}

// Run the seed function
seedStepsCatalog()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error seeding steps catalog:', error);
    process.exit(1);
  });

