# Adding Medium and Low Severity Shipments

This guide explains how to add shipments that will result in Medium and Low severity alerts to populate all 5 severity categories in the pie chart.

## Steps

1. **Run the script to add shipments:**
   ```bash
   cd backend
   npm run add:medium-low
   ```

   This will add:
   - 8 Medium severity shipments (risk score 40-59)
   - 10 Low severity shipments (risk score 20-39)

2. **Recalculate alert data:**
   After adding the shipments, you need to calculate and store their alert data. Call the recalculate endpoint:

   **If running locally:**
   ```bash
   curl -X POST http://localhost:3000/api/alerts/recalculate
   ```

   **Or in browser console on your deployed site:**
   ```javascript
   fetch('/api/alerts/recalculate', { method: 'POST' })
     .then(r => r.json())
     .then(data => console.log(`✅ Updated ${data.updated} shipments!`))
   ```

## What the Script Does

The script creates shipments with:
- **Medium Severity**: 2-3 days delayed past ETA, with risk factors like customs hold, port congestion, or hub delays
- **Low Severity**: 1 day delayed past ETA, with minor delays in transit

These shipments are designed to calculate to risk scores in the Medium (40-59) and Low (20-39) ranges.

## Verify Results

After running the script and recalculation:
1. Refresh your alerts dashboard
2. Check the "Alerts by Severity" pie chart
3. You should now see all 5 categories: Critical, High, Medium, Low, and Minimal

