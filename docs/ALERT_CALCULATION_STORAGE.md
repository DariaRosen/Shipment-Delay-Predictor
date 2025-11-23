# Alert Calculation Storage

To ensure 100% consistency between the alerts table and detail pages, calculated alert data is now stored in the database.

## Database Migration

Run the migration to add calculated alert columns to the `shipments` table:

```sql
-- Run this in your Supabase SQL editor
-- File: backend/supabase/migration_add_alert_data.sql
```

This adds the following columns:
- `calculated_risk_score` - The calculated risk score
- `calculated_severity` - The severity level (Critical, High, Medium, Low, Minimal)
- `calculated_risk_reasons` - JSON array of risk reasons
- `calculated_risk_factor_points` - JSON array of risk factor point breakdowns
- `calculated_status` - Calculated status (completed, in_progress, canceled, future)
- `calculated_current_stage` - Current stage from calculation
- `calculated_days_to_eta` - Days to ETA
- `calculated_at` - Timestamp of when calculation was performed

## How It Works

1. **Both API routes** (`/api/alerts` and `/api/alerts/[shipmentId]`) read from the stored `calculated_*` columns
2. **If data is missing or stale** (older than 1 hour), it calculates on-the-fly and stores it
3. **This ensures both pages always show identical data** from the same database source

## Initial Population

After running the migration, populate calculated data for all shipments:

```bash
# Call the recalculate endpoint
curl -X POST https://your-domain.com/api/alerts/recalculate
```

Or in the browser console:
```javascript
fetch('/api/alerts/recalculate', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

## Periodic Updates

The data automatically refreshes when:
- A shipment is accessed and the stored data is stale (>1 hour old)
- You manually call `/api/alerts/recalculate`

You can set up a cron job (e.g., via Vercel Cron) to periodically recalculate:
```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/alerts/recalculate",
    "schedule": "0 * * * *" // Every hour
  }]
}
```

## Benefits

✅ **100% Consistency** - Both alerts table and detail page read from same DB source
✅ **Performance** - No redundant calculations on every request
✅ **Reliability** - Data doesn't vary based on calculation timing
✅ **Flexibility** - Can be manually refreshed or scheduled

