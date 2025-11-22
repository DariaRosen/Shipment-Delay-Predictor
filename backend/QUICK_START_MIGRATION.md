# Quick Start: Migration to Normalized Schema

## ⚠️ Error: Tables Not Found

If you see this error:
```
Could not find the table 'public.shipments' in the schema cache
```

**You need to create the tables first!**

## Step 1: Create the Tables

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Open the file: `backend/supabase/schema-normalized.sql`
4. Copy **ALL** the SQL content
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

You should see: "Success. No rows returned"

## Step 2: Verify Tables Were Created

Run this check script:
```bash
cd backend
npx ts-node -r dotenv/config scripts/check-schema.ts
```

You should see:
```
✅ shipments table: ✅ Exists
✅ shipment_events table: ✅ Exists
```

## Step 3: Run the Migration

Now run the migration:
```bash
npm run migrate:normalized
```

## Alternative: Check in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Table Editor**
2. You should see:
   - ✅ `shipments` table
   - ✅ `shipment_events` table

If you don't see them, go back to Step 1.

## What the Schema Creates

- **`shipments`** table: Stores shipment metadata
- **`shipment_events`** table: Stores timeline events
- Indexes for performance
- Triggers for auto-updating timestamps
- Row Level Security policies

## Still Having Issues?

1. Make sure you're in the correct Supabase project
2. Check your `.env` file has the correct `SUPABASE_URL`
3. Verify you have the correct permissions (Service Role Key)

