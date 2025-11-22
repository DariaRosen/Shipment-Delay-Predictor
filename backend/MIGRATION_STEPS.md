# Migration to Normalized Schema - Step by Step

## Overview

This guide will help you migrate from the old `alerts` table structure to the new normalized `shipments` + `shipment_events` structure where delays are calculated dynamically.

## Prerequisites

- Supabase project set up
- `.env` file configured with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Backend server can connect to Supabase

## Step 1: Run the New Schema

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `backend/supabase/schema-normalized.sql`
3. Paste and run the SQL
4. Verify tables are created:
   - `shipments` table
   - `shipment_events` table

## Step 2: Run the Migration Script

```bash
cd backend
npm run migrate:normalized
```

This script will:
- Check if old `alerts` table exists
- If exists: Convert alerts + steps to shipments + events
- If not exists: Use sample data from `sample-alerts.ts`
- Insert all data into new normalized tables

## Step 3: Verify the Migration

1. Check Supabase Dashboard → Table Editor
2. Verify `shipments` table has data
3. Verify `shipment_events` table has events for each shipment
4. Check that events are ordered chronologically

## Step 4: Test the API

1. Start the backend server:
   ```bash
   npm run start:dev
   ```

2. Test the alerts endpoint:
   ```bash
   curl http://localhost:3001/api/alerts
   ```

3. Verify that:
   - Alerts are returned with calculated risk scores
   - Risk scores are calculated dynamically (not hardcoded)
   - Events are included in the `steps` array

## Step 5: (Optional) Clean Up Old Tables

Once you've verified everything works, you can drop the old tables:

```sql
-- Run in Supabase SQL Editor
DROP TABLE IF EXISTS shipment_steps;
DROP TABLE IF EXISTS alerts;
```

**⚠️ Only do this after verifying the new structure works!**

## How It Works Now

### Before (Hardcoded)
```typescript
// Risk score stored in database
{
  shipmentId: 'LD1001',
  riskScore: 82,  // Hardcoded
  severity: 'High',  // Hardcoded
  riskReasons: ['StaleStatus', 'PortCongestion']  // Hardcoded
}
```

### After (Dynamic)
```typescript
// Risk score calculated from events
const events = [
  { event_time: '2024-11-14T10:05:00Z', event_stage: 'Order created' },
  { event_time: '2024-11-18T08:00:00Z', event_stage: 'At port' }, // Last event
];

// Calculation:
// - Days since last event: 3 days → StaleStatus
// - Stuck at port: PortCongestion
// - Risk Score: Calculated dynamically
// - Severity: Based on risk score
```

## Troubleshooting

### Error: "Table shipments does not exist"
- Make sure you ran `schema-normalized.sql` first

### Error: "Missing Supabase environment variables"
- Check your `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### No events showing up
- Check that `shipment_events` table has data
- Verify events have correct `shipment_id` foreign keys

### Risk scores seem wrong
- Check event timestamps are correct
- Verify `expected_delivery` dates in shipments table
- The calculation is based on:
  - Time since last event
  - Time to ETA
  - Event stage patterns

## Benefits

✅ **Real-time accuracy**: Risk scores update as events are added  
✅ **No stale data**: No need to manually update risk scores  
✅ **Better analytics**: Can analyze event patterns over time  
✅ **ML-ready**: Event data perfect for delay prediction models  
✅ **More realistic**: Matches how real logistics systems work

