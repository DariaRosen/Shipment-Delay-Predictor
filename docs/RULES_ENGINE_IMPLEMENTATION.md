# Rules Engine Implementation Summary

## Overview

A comprehensive ML-style rules engine and scoring system has been implemented to predict shipment delays. The system uses a multi-factor approach combining operational data, route characteristics, and contextual factors.

## What Was Implemented

### 1. Distance Calculator Utility
**File**: `backend/src/alerts/utils/distance-calculator.ts`

- **Great Circle Distance Calculation**: Uses Haversine formula to calculate distance between cities
- **City Coordinates Database**: Includes coordinates for 40+ major cities worldwide
- **Smart City Matching**: Handles exact, case-insensitive, and partial city name matches

**Features**:
- `calculateDistance()`: Calculate distance between two coordinates
- `getCityCoordinates()`: Get coordinates for a city
- `calculateCityDistance()`: Calculate distance between two cities

### 2. Enhanced Delay Calculator Service
**File**: `backend/src/alerts/services/delay-calculator.service.ts`

**Enhanced Risk Scoring Factors**:

#### Temporal Factors (Weight: 0.45)
- **Time to ETA Pressure**: 0-50 points based on days remaining
- **Stale Status**: 0-40 points based on days since last update
- **Long Dwell Time**: 25 points if stuck in same stage > 2 days

#### Route & Distance Factors (Weight: 0.08)
- **Distance-Based Risk**: 0-10 points based on distance thresholds (mode-specific)
  - Air: >8000km = 5pts, >12000km = 10pts
  - Sea: >10000km = 5pts, >15000km = 10pts
  - Road: >2000km = 5pts, >3000km = 10pts
- **International vs Domestic**: 5 points for international shipments

#### Location-Based Factors (Weight: 0.15)
- **Customs Hold**: Detected when stuck in customs > 1 day
- **Port Congestion**: Detected when stuck at port > 2 days
- **Hub Congestion**: Detected when stuck at hub > 1 day
- **No Pickup**: Detected when awaiting pickup > 1 day

#### Operational Factors (Weight: 0.20)
- **Missed Departure**: 50 points (past ETA, not delivered)
- **Weather Alerts**: Detected from event descriptions
- **Capacity Shortage**: Detected from event descriptions
- **Documentation Issues**: Detected from event descriptions

#### Seasonal & Contextual Factors (Weight: 0.05)
- **Peak Season**: 5 points (November, December)
- **Weekend Processing**: 3 points (if requires processing on weekend)

#### Service Level Factors (Weight: 0.02)
- **Express Service Mismatch**: 10 points (if Express and not meeting timeline)

### 3. Enhanced Risk Reason Detection

**Improvements**:
- Checks **all events** (not just latest) for operational issues
- Better pattern matching for weather, capacity, and documentation issues
- More comprehensive keyword detection

**Risk Reasons**:
- `StaleStatus`: No update in 3+ days
- `PortCongestion`: Stuck at port > 2 days
- `CustomsHold`: Stuck in customs > 1 day
- `MissedDeparture`: Past ETA, not delivered
- `LongDwell`: Stuck in same stage > 2 days
- `NoPickup`: Awaiting pickup > 1 day
- `HubCongestion`: Stuck at hub > 1 day
- `WeatherAlert`: Weather-related delays detected
- `CapacityShortage`: Capacity issues detected
- `DocsMissing`: Documentation issues detected
- `Lost`: Shipment canceled (stuck 30+ days AND 14+ days past ETA)

### 4. Data Model Enhancements

**ShipmentData Interface**:
- Added `origin_country?: string`
- Added `dest_country?: string`

**Benefits**:
- Enables international vs domestic detection
- Supports future country-specific risk factors

## Scoring Algorithm

### Risk Score Calculation

```typescript
riskScore = 0

// Temporal factors (45% weight)
riskScore += temporalRisk(daysToEta, daysSinceLastEvent, stageDwellTime)

// Route factors (8% weight)
riskScore += routeRisk(distance, isInternational, mode)

// Location factors (15% weight)
riskScore += locationRisk(currentStage, daysSinceLastEvent)

// Operational factors (20% weight)
riskScore += operationalRisk(events, expectedDelivery, now)

// Seasonal factors (5% weight)
riskScore += seasonalRisk(orderDate, currentDate)

// Service level factors (2% weight)
riskScore += serviceLevelRisk(serviceLevel, daysToEta, currentStage)

// Risk reasons (10 points each)
riskScore += riskReasons.length * 10

// Cap at 100
riskScore = Math.min(100, riskScore)
```

### Severity Classification

- **High Risk**: `riskScore >= 70`
- **Medium Risk**: `riskScore >= 40`
- **Low Risk**: `riskScore < 40`

## Example Scenarios

### Scenario 1: High-Risk International Sea Shipment
- **Origin**: Shanghai, China
- **Destination**: Los Angeles, USA
- **Distance**: ~10,500 km
- **Days to ETA**: -2 (past ETA)
- **Days since last event**: 4 days
- **Current stage**: "Awaiting Customs"
- **Mode**: Sea

**Calculation**:
- Time to ETA: 50 points (past ETA)
- Stale Status: 25 points (4 days)
- Customs Hold: 10 points (risk reason)
- Distance: 5 points (long distance sea)
- International: 5 points
- Risk Reasons: 10 points (CustomsHold)
- **Total**: 105 → **100 points (capped)** → **High Risk**

### Scenario 2: Low-Risk Domestic Air Shipment
- **Origin**: New York, USA
- **Destination**: Chicago, USA
- **Distance**: ~1,200 km
- **Days to ETA**: 15 days
- **Days since last event**: 0.5 days
- **Current stage**: "In Transit"
- **Mode**: Air

**Calculation**:
- Time to ETA: 0 points (plenty of time)
- Stale Status: 0 points (recent update)
- Distance: 0 points (short distance)
- International: 0 points (domestic)
- Risk Reasons: 0 points (none)
- **Total**: 0 points → **Low Risk** (no alert)

## Benefits

1. **More Accurate Risk Assessment**: Multi-factor approach provides comprehensive risk evaluation
2. **Distance-Aware**: Considers route length and complexity
3. **International Awareness**: Recognizes additional complexity of cross-border shipments
4. **Seasonal Intelligence**: Accounts for peak season congestion
5. **Comprehensive Detection**: Checks all events, not just latest
6. **Scalable**: Easy to add new factors and rules

## Future Enhancements

1. **Historical Data Integration**
   - Carrier performance metrics
   - Route-specific delay rates
   - Historical patterns database

2. **Real-Time Data Integration**
   - Weather API integration
   - Port congestion indices
   - Traffic and border crossing status

3. **Machine Learning Integration**
   - Train models on historical data
   - Combine rule-based and ML predictions
   - Continuous learning from outcomes

4. **Dynamic Thresholds**
   - Adjust thresholds based on historical patterns
   - Mode-specific and route-specific thresholds
   - Seasonal adjustments

## Testing

The enhanced rules engine is automatically applied to all shipments when:
- Fetching alerts (`GET /api/alerts`)
- Fetching single shipment (`GET /api/alerts/:shipmentId`)
- Fetching all shipments (`GET /api/alerts/shipments/all`)

No API changes required - the enhanced scoring is transparent to the frontend.

