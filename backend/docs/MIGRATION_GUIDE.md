# Migration Guide: Steps-Based Architecture

This guide explains how to migrate from the event-based system to the new steps-based architecture.

## Prerequisites

1. **Backup your database** (recommended)
2. Ensure you have Supabase credentials in `.env`
3. Make sure you're on the latest codebase

## Migration Steps

### Step 1: Create New Tables

Run the new schema in your Supabase SQL Editor:

```bash
# Copy the contents of backend/supabase/schema-steps-based.sql
# Paste and execute in Supabase SQL Editor
```

Or if you have `psql` access:

```bash
psql -h your-db-host -U postgres -d postgres -f backend/supabase/schema-steps-based.sql
```

### Step 2: Seed Steps Catalog

Populate the master steps catalog:

```bash
cd backend
npm run seed:steps
```

This will create ~40+ step definitions in the `steps` table.

**Expected output:**
```
📋 Seeding steps catalog...
Inserting 40 steps into catalog...
✅ Your order has been successfully created (Common)
✅ Your package is currently being prepared (Common)
...
✅ Steps catalog seeded successfully!
```

### Step 3: Migrate Existing Shipments

Convert all existing shipments to use the new steps-based structure:

```bash
npm run migrate:steps
```

This script will:
1. Fetch all shipments from the database
2. Select relevant steps for each shipment based on:
   - Mode (Air/Sea/Road)
   - International vs Domestic
   - Distance
   - Service level
3. Match existing events to steps
4. Create `shipment_steps` records with proper ordering and timing

**Expected output:**
```
🚀 Starting migration to steps-based architecture...
📋 Fetching steps catalog...
✅ Found 40 steps in catalog
📦 Fetching all shipments...
✅ Found 100 shipments to migrate
📥 Fetching all events...
✅ Found events for 100 shipments
🧹 Clearing existing shipment_steps...
✅ Cleared existing shipment_steps
🔄 Processing shipments...
   Processed 10/100 shipments...
   Processed 20/100 shipments...
...
✅ Migration completed!
   ✅ Successfully migrated: 100 shipments
   ❌ Errors: 0 shipments
   📊 Total shipment_steps created: 1500 (estimated)
```

### Step 4: Verify Migration

Check that shipment_steps were created:

```sql
-- Check total shipment_steps
SELECT COUNT(*) FROM shipment_steps;

-- Check steps for a specific shipment
SELECT 
  ss.step_order,
  s.step_name,
  ss.expected_completion_time,
  ss.actual_completion_time
FROM shipment_steps ss
JOIN steps s ON ss.step_id = s.step_id
WHERE ss.shipment_id = 'LD1001'
ORDER BY ss.step_order;
```

## What Gets Migrated

### For Each Shipment:

1. **Step Selection**: Based on shipment characteristics
   - Road NYC → Boston: ~10 steps (no customs)
   - Air Shanghai → LA: ~21 steps (with customs)
   - Sea multi-port: ~22 steps (with transshipment)

2. **Timing**: 
   - Expected times calculated from order date to ETA
   - Actual times matched from existing events
   - First step always uses order date

3. **Event Matching**:
   - Exact name matches
   - Partial/fuzzy matches
   - Keyword matching for common patterns

## Rollback (If Needed)

If you need to rollback:

```sql
-- Remove shipment_steps
DELETE FROM shipment_steps;

-- Keep the steps catalog (it's harmless)
-- Keep shipments table (unchanged)
-- Keep shipment_events table (unchanged, can be used for reference)
```

## Troubleshooting

### Error: "No steps found in catalog"
**Solution**: Run `npm run seed:steps` first

### Error: "No shipments found"
**Solution**: Make sure you have shipments in the database. Run `npm run add:shipments` if needed.

### Error: "Step selection returned 0 steps"
**Solution**: Check that the shipment has valid mode, origin, and destination data.

### Migration is slow
**Solution**: The script processes in batches. For large datasets, you may want to:
- Process in smaller chunks
- Run during off-peak hours
- Increase batch size in the script

## Next Steps After Migration

1. **Update Backend Services**: Modify `alerts.service.ts` to read from `shipment_steps` instead of generating steps
2. **Update Frontend**: Ensure timeline component works with the new structure
3. **Test**: Verify that shipment timelines display correctly
4. **Monitor**: Check for any missing steps or timing issues

## Architecture Benefits

After migration, you'll have:

✅ **Flexible step selection** - Different shipments get different step sequences  
✅ **Multi-modal support** - Can handle Sea+Road, Air+Road combinations  
✅ **Scalable** - Easy to add new step types  
✅ **Maintainable** - Steps defined once, referenced many times  
✅ **Realistic** - Steps match actual shipment routes  

## Support

If you encounter issues:
1. Check the error messages in the console
2. Verify database schema matches `schema-steps-based.sql`
3. Ensure steps catalog is populated
4. Check that shipments have valid data (mode, origin, destination)

