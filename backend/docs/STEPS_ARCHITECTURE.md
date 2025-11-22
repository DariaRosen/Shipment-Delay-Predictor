# Steps-Based Architecture

## Overview

The new steps-based architecture provides flexible, dynamic step selection for shipments based on their characteristics (mode, distance, international vs domestic, etc.).

## Database Schema

### 1. `steps` Table (Master Catalog)
A catalog of all possible shipment steps that can occur.

**Columns:**
- `step_id` (SERIAL PRIMARY KEY)
- `step_name` (VARCHAR(255) UNIQUE) - e.g., "Your order has been successfully created"
- `step_description` (TEXT) - Optional description
- `step_type` (VARCHAR(20)) - One of: `Common`, `Air`, `Sea`, `Road`, `Customs`, `MultiModal`
- `expected_duration_hours` (DECIMAL) - Expected time for this step
- `is_required` (BOOLEAN) - Whether this step is always required
- `applies_to_modes` (VARCHAR(50)) - Comma-separated modes (e.g., "Air,Sea") or NULL for all

**Example:**
```sql
step_id: 1
step_name: "Your order has been successfully created"
step_type: "Common"
expected_duration_hours: 0
is_required: true
applies_to_modes: NULL  -- Applies to all modes
```

### 2. `shipment_steps` Table (Junction Table)
Links shipments to their relevant steps with timing and status information.

**Columns:**
- `shipment_step_id` (SERIAL PRIMARY KEY)
- `shipment_id` (VARCHAR(50) FK → shipments)
- `step_id` (INTEGER FK → steps)
- `step_order` (INTEGER) - Sequence order (1, 2, 3, ...)
- `expected_completion_time` (TIMESTAMPTZ)
- `actual_completion_time` (TIMESTAMPTZ) - NULL if not completed yet
- `location` (VARCHAR(255)) - Optional location
- `description` (TEXT) - Can override default step description

**Example:**
```sql
shipment_id: "LD1001"
step_id: 1  -- "Your order has been successfully created"
step_order: 1
expected_completion_time: "2025-11-17T10:00:00Z"
actual_completion_time: "2025-11-17T10:00:00Z"  -- Already completed
```

## Step Selection Logic

Steps are selected based on:

1. **Mode** (Air, Sea, Road)
   - Air shipments get Air-specific steps (airport, flight, etc.)
   - Sea shipments get Sea-specific steps (port, vessel, etc.)
   - Road shipments get Road-specific steps (transit, border, etc.)

2. **International vs Domestic**
   - International shipments get customs steps
   - Domestic shipments skip customs

3. **Distance**
   - Long-distance shipments may get additional sorting centers
   - Short-distance shipments may skip intermediate steps

4. **Service Level**
   - Express shipments may have fewer steps (direct routes)
   - Standard shipments may have more steps (consolidation hubs)

## Example Scenarios

### Scenario 1: Road Delivery (Same City)
**Steps Selected:**
1. Your order has been successfully created
2. Your package is currently being prepared
3. Your order is being packed
4. Package ready to be shipped by warehouse
5. Package left warehouse
6. Package collected by carrier
7. In transit (Road)
8. Out for Delivery
9. Package arrived at pick-up point
10. Package received by customer

**Total: ~10 steps** (no customs, no sorting centers)

### Scenario 2: Air International (Shanghai → Los Angeles)
**Steps Selected:**
1. Your order has been successfully created
2. Your package is currently being prepared
3. Your order is being packed
4. Package ready to be shipped by warehouse
5. Package left warehouse
6. Package collected by carrier
7. Package received by sorting center of origin
8. Package left sorting center of origin
9. Your package arrived at airport. Awaiting transit
10. Export customs clearance started
11. Export customs clearance complete
12. Awaiting flight
13. Package leaving origin country/region
14. Your package arrived at local airport
15. Arrived at customs
16. Import customs clearance started
17. Import customs clearance completed
18. Your package will soon be handed over to the domestic courier company
19. Package arrived at regional carrier facility
20. Package arrived at pick-up point
21. Package received by customer

**Total: ~21 steps** (includes customs, multiple sorting centers)

### Scenario 3: Sea Multi-Port (Shanghai → Rotterdam → Hamburg)
**Steps Selected:**
1. Your order has been successfully created
2. ... (preparation steps)
3. Package arrived at port
4. Container loaded onto vessel
5. Vessel departed
6. In transit at sea
7. Transshipment Hub (Rotterdam)
8. Vessel arrived at destination port (Hamburg)
9. Container unloaded from vessel
10. ... (delivery steps)
11. Package received by customer

**Total: ~22 steps** (includes transshipment hub)

## Benefits

1. **Flexibility**: Different shipments get different step sequences based on their route
2. **Scalability**: Easy to add new step types without code changes
3. **Maintainability**: Steps are defined once in the catalog, referenced many times
4. **Multi-Modal Support**: Can handle complex routes (e.g., Sea + Road, Air + Road)
5. **Realistic Timelines**: Steps are selected based on actual shipment characteristics

## Migration Path

1. Run `schema-steps-based.sql` to create new tables
2. Run `npm run seed:steps` to populate the steps catalog
3. Migrate existing shipments to use the new structure
4. Update backend services to use step selection logic

## Usage

```typescript
// Select steps for a shipment
const criteria: StepSelectionCriteria = {
  mode: 'Air',
  originCountry: 'CN',
  destCountry: 'US',
  isInternational: true,
  isLongDistance: true,
};

const selectedSteps = stepSelector.selectStepsForShipment(allSteps, criteria);

// Create shipment_steps records
for (let i = 0; i < selectedSteps.length; i++) {
  await createShipmentStep({
    shipment_id: 'LD1001',
    step_id: selectedSteps[i].step_id,
    step_order: i + 1,
    expected_completion_time: calculateExpectedTime(orderDate, eta, i),
  });
}
```

