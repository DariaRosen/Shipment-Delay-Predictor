# Migration to Normalized Schema

## Overview

We're migrating from a hardcoded `alerts` table to a normalized structure where:
- **`shipments`** table stores raw shipment data
- **`shipment_events`** table stores timeline events
- **Delays and risks are calculated dynamically** from the events

## Why This Change?

1. **More Realistic**: Matches how real logistics systems work (DHL, FedEx, UPS)
2. **Flexible**: Can add new event types without schema changes
3. **Accurate**: Delays calculated from actual event timestamps
4. **Scalable**: Better for machine learning and analytics

## New Schema Structure

### `shipments` Table
- Stores shipment metadata (origin, destination, carrier, ETA, etc.)
- No pre-calculated risk scores or severity
- These are calculated on-the-fly

### `shipment_events` Table
- Stores timeline of events (one row per event)
- Each event has: timestamp, stage name, description, location
- Events are ordered chronologically

## Migration Steps

### 1. Run New Schema

```sql
-- Run schema-normalized.sql in Supabase SQL Editor
```

### 2. Migrate Existing Data

Convert existing alerts to shipments + events:

```typescript
// Old structure (alerts table)
{
  shipmentId: 'LD1001',
  riskScore: 82,
  severity: 'High',
  riskReasons: ['StaleStatus', 'PortCongestion'],
  steps: [...]
}

// New structure (shipments + events)
// shipments table:
{
  shipment_id: 'LD1001',
  order_date: '2024-11-14T10:05:00Z',
  expected_delivery: '2024-11-22T18:00:00Z',
  carrier: 'OceanBlue',
  mode: 'Sea',
  ...
}

// shipment_events table (multiple rows):
[
  { shipment_id: 'LD1001', event_time: '2024-11-14T10:05:00Z', event_stage: 'Order created', ... },
  { shipment_id: 'LD1001', event_time: '2024-11-14T13:11:00Z', event_stage: 'Packing', ... },
  ...
]
```

### 3. Update Service Layer

The `DelayCalculatorService` calculates:
- Risk score from event timestamps
- Severity from risk score
- Risk reasons from event patterns
- Current stage from latest event

### 4. API Remains the Same

The API still returns `AlertShipment[]` but now it's calculated dynamically:

```typescript
GET /api/alerts
// Returns alerts calculated from shipments + events
```

## Benefits

1. **Real-time accuracy**: Risk scores update as events are added
2. **No stale data**: No need to manually update risk scores
3. **Better analytics**: Can analyze event patterns over time
4. **ML-ready**: Event data perfect for delay prediction models

## Example: How Delay is Calculated

```typescript
// Event timeline:
[
  { event_time: '2024-11-14T10:05:00Z', event_stage: 'Order created' },
  { event_time: '2024-11-15T05:00:00Z', event_stage: 'In transit' },
  { event_time: '2024-11-18T08:00:00Z', event_stage: 'At port' }, // Last event
]

// Current time: 2024-11-21T12:00:00Z
// Expected delivery: 2024-11-22T18:00:00Z

// Calculation:
// - Days since last event: 3.17 days → Risk: StaleStatus
// - Days to ETA: 1.25 days → Risk: AtRisk
// - Stuck at port for 3+ days → Risk: PortCongestion
// - Risk Score: 25 (time to ETA) + 25 (stale) + 10 (port) = 60
// - Severity: Medium (60 >= 40)
```

## Next Steps

1. ✅ Create normalized schema
2. ✅ Create DelayCalculatorService
3. ⏳ Update AlertsService to use new structure
4. ⏳ Create data migration script
5. ⏳ Update frontend if needed (API should remain compatible)

