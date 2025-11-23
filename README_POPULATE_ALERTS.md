# Populate Alert Data

After running the database migration, you need to populate the calculated alert data.

## Option 1: Using the Browser (After Deployment)

1. Deploy your app to Vercel
2. Open your browser console on your deployed site
3. Run:
```javascript
fetch('/api/alerts/recalculate', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log(`✅ Updated ${data.updated} shipments`))
```

## Option 2: Using the Script (Local)

1. Make sure your Next.js dev server is running:
```bash
cd frontend
npm run dev
```

2. In another terminal, run:
```bash
node scripts/populate-alert-data.js
```

Or set a custom API URL:
```bash
API_URL=https://your-domain.vercel.app node scripts/populate-alert-data.js
```

## Option 3: Using curl

```bash
curl -X POST http://localhost:3000/api/alerts/recalculate
```

Or for deployed site:
```bash
curl -X POST https://your-domain.vercel.app/api/alerts/recalculate
```

## What Happens

- Calculates risk scores, severities, and risk factors for all shipments
- Stores them in the `calculated_*` columns in the database
- Both `/api/alerts` and `/api/alerts/[shipmentId]` will now read from the same source
- Eliminates any mismatches between the alerts table and detail pages

## Auto-Refresh

The system automatically refreshes stale data (>1 hour old) when shipments are accessed, so you don't need to manually recalculate constantly.

