# Risk Scoring System

## Base Scores (Based on Actual Delay)

The base score is determined **only** by actual delay (days past ETA) and original ETA timeline:

| Severity | Base Score | Condition |
|----------|------------|-----------|
| **Critical** | 90 | Actual delay of 2+ days AND original ETA was close (≤7 days from order) |
| **High** | 70 | Actual delay of 2+ days AND original ETA was far (>7 days from order) |
| **Medium** | 50 | Actual delay of 1 day AND original ETA was close (≤7 days from order) |
| **Low** | 20 | Actual delay of 1 day AND original ETA was far (>7 days from order) |
| **Minimal** | 0 | No actual delay but other risk factors present |

## Additional Risk Factor Points

Additional points are added **on top of the base score** for each risk factor:

### Operational Risk Factors (Higher Impact)

| Risk Factor | Points | Description |
|-------------|--------|-------------|
| **CustomsHold** | +8 | Shipment stuck in customs |
| **MissedDeparture** | +8 | Missed planned departure time |
| **PortCongestion** | +7 | Stuck at port due to congestion |
| **DocsMissing** | +7 | Missing documentation |
| **WeatherAlert** | +7 | Weather-related delays |
| **HubCongestion** | +6 | Stuck at hub due to congestion |
| **LongDwell** | +6 | Long dwell time in same stage |
| **CapacityShortage** | +6 | Capacity shortage issues |
| **NoPickup** | +5 | Awaiting pickup for too long |
| **Lost** | +10 | Shipment lost (canceled shipments only) |

### Status Risk Factors (Lower Impact)

| Risk Factor | Points | Description |
|-------------|--------|-------------|
| **StaleStatus** | +4 | No recent update (>1 day since last event) |

### Contextual Factors (Small Additions)

These factors only add points if there are already other risk factors present:

| Factor | Points | Condition |
|--------|--------|-----------|
| **Very Long Distance** | +2 | Distance exceeds mode-specific threshold (Air: >12,000km, Sea: >15,000km, Road: >3,000km) |
| **Long Distance** | +1 | Distance exceeds mode-specific threshold (Air: >8,000km, Sea: >10,000km, Road: >2,000km) |
| **International Shipment** | +1 | Origin and destination are in different countries |
| **Peak Season** | +1 | Order placed in November or December |
| **Weekend Processing** | +1 | Stuck at customs/port/hub on weekend |
| **Express Service** | +2 | Express shipment not meeting expectations (ETA <2 days, not in final stages) |

## Examples

### Example 1: Critical with Additional Factors
- **Actual Delay**: 3 days past ETA
- **Original ETA**: 5 days from order (close)
- **Base Score**: 90 (Critical)
- **Additional Factors**: CustomsHold (+8), International (+1)
- **Final Score**: 99

### Example 2: High with Multiple Factors
- **Actual Delay**: 2 days past ETA
- **Original ETA**: 15 days from order (far)
- **Base Score**: 70 (High)
- **Additional Factors**: PortCongestion (+7), WeatherAlert (+7), Long Distance (+1)
- **Final Score**: 85

### Example 3: Medium with Stale Status
- **Actual Delay**: 1 day past ETA
- **Original ETA**: 6 days from order (close)
- **Base Score**: 50 (Medium)
- **Additional Factors**: StaleStatus (+4)
- **Final Score**: 54

### Example 4: Minimal (No Actual Delay)
- **Actual Delay**: 0 days (not yet past ETA)
- **Base Score**: 0 (Minimal)
- **Additional Factors**: StaleStatus (+4), Long Distance (+1)
- **Final Score**: 5

## Notes

- Maximum score is capped at 100
- Healthy shipments (plenty of time, recent update, no issues) are capped at 15-25 points
- Very healthy shipments (≥10 days to ETA, ≤1 day since update, no risk reasons) get score of 0

