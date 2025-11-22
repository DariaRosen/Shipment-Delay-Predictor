# Delay Risk Rules Engine & Scoring System

## Overview

This document defines the comprehensive rules engine and ML-style scoring system for predicting shipment delays. The system uses a multi-factor approach combining operational data, historical patterns, and contextual factors.

## Risk Factors & Rules

### 1. Temporal Risk Factors

#### 1.1 Stale Status (No Recent Updates)
**Rule**: `IF days_since_last_event > threshold THEN add_risk`

**Thresholds**:
- `days_since_last_event > 5 days` → **High Risk** (40 points)
- `days_since_last_event > 3 days` → **Medium Risk** (25 points)
- `days_since_last_event > 1 day` → **Low Risk** (10 points)

**Rationale**: Lack of updates indicates potential tracking gaps or shipment stagnation.

#### 1.2 Time to ETA Pressure
**Rule**: `IF days_to_ETA < threshold AND current_stage != final_stage THEN add_risk`

**Thresholds**:
- `days_to_ETA < 0` (past ETA) → **Critical Risk** (50 points)
- `days_to_ETA < 1 day` → **High Risk** (40 points)
- `days_to_ETA < 2 days` → **Medium Risk** (25 points)
- `days_to_ETA < 3 days` → **Low Risk** (15 points)

**Rationale**: Shipments close to ETA that haven't reached final stages are at high risk.

#### 1.3 Long Dwell Time
**Rule**: `IF stage_dwell_time > threshold THEN add_risk`

**Thresholds**:
- `stage_dwell_time > 2 days` → **Medium Risk** (25 points)

**Rationale**: Extended time in the same stage indicates processing delays or bottlenecks.

### 2. Location-Based Risk Factors

#### 2.1 Customs Hold
**Rule**: `IF current_stage contains "customs" AND days_since_last_event > threshold THEN add_risk`

**Thresholds**:
- `days_since_last_event > 1 day` → **High Risk** (10 points + base risk)

**Rationale**: Customs delays are common bottlenecks, especially for international shipments.

#### 2.2 Port Congestion
**Rule**: `IF current_stage contains "port" AND days_since_last_event > threshold THEN add_risk`

**Thresholds**:
- `days_since_last_event > 2 days` → **Medium Risk** (10 points + base risk)

**Rationale**: Port congestion can cause significant delays, especially during peak seasons.

#### 2.3 Hub Congestion
**Rule**: `IF current_stage contains "hub" AND days_since_last_event > threshold THEN add_risk`

**Thresholds**:
- `days_since_last_event > 1 day` → **Medium Risk** (10 points + base risk)

**Rationale**: Sorting centers can become bottlenecks during high-volume periods.

#### 2.4 No Pickup
**Rule**: `IF current_stage contains "pickup" AND days_since_last_event > threshold THEN add_risk`

**Thresholds**:
- `days_since_last_event > 1 day` → **Medium Risk** (10 points + base risk)

**Rationale**: Awaiting pickup indicates recipient unavailability or delivery issues.

### 3. Route & Distance Risk Factors

#### 3.1 Distance-Based Risk
**Rule**: `IF distance > threshold THEN add_risk`

**Distance Calculation**: Great Circle Distance between origin and destination cities

**Thresholds** (by mode):
- **Air**: 
  - `distance > 8000 km` → **Low Risk** (5 points)
  - `distance > 12000 km` → **Medium Risk** (10 points)
- **Sea**: 
  - `distance > 10000 km` → **Low Risk** (5 points)
  - `distance > 15000 km` → **Medium Risk** (10 points)
- **Road**: 
  - `distance > 2000 km` → **Low Risk** (5 points)
  - `distance > 3000 km` → **Medium Risk** (10 points)

**Rationale**: Longer distances increase exposure to delays, weather, and operational issues.

#### 3.2 International vs Domestic
**Rule**: `IF origin_country != destination_country THEN add_risk`

**Risk Points**: 5 points

**Rationale**: International shipments face additional complexity (customs, border crossings, documentation).

#### 3.3 Route Complexity
**Rule**: `IF route_requires_multiple_transfers THEN add_risk`

**Risk Points**: 5-10 points (based on number of transfers)

**Rationale**: Multiple transfers increase points of failure and delay opportunities.

### 4. Mode-Specific Risk Factors

#### 4.1 Air Mode Risks
- **Weather Delays**: Check for weather alerts in route
- **Capacity Shortages**: Check for capacity-related events
- **Airport Congestion**: Check for airport-specific delays

#### 4.2 Sea Mode Risks
- **Port Congestion**: Extended time at port
- **Vessel Delays**: Missed departure windows
- **Weather at Sea**: Severe weather affecting shipping lanes

#### 4.3 Road Mode Risks
- **Border Delays**: Extended time at border crossings
- **Weather**: Road closures due to weather
- **Traffic Congestion**: Major traffic delays

### 5. Carrier & Service Level Factors

#### 5.1 Carrier Performance (Historical)
**Rule**: `IF carrier_avg_delay_rate > threshold THEN add_risk`

**Thresholds**:
- `delay_rate > 20%` → **Medium Risk** (10 points)
- `delay_rate > 30%` → **High Risk** (15 points)

**Rationale**: Historical carrier performance is a strong predictor of future delays.

#### 5.2 Service Level Mismatch
**Rule**: `IF service_level == "Express" AND days_to_ETA < expected_express_delivery THEN add_risk`

**Risk Points**: 10 points

**Rationale**: Express shipments have higher expectations and tighter timelines.

### 6. Operational Risk Factors

#### 6.1 Missed Departure
**Rule**: `IF expected_delivery < now AND current_stage != "delivered" THEN add_risk`

**Risk Points**: 50 points (Critical)

**Rationale**: Shipments past ETA that aren't delivered are critical alerts.

#### 6.2 Documentation Issues
**Rule**: `IF event_description contains "document" OR "doc" OR "paperwork" THEN add_risk`

**Risk Points**: 10 points

**Rationale**: Documentation problems cause delays, especially at customs.

#### 6.3 Capacity Shortage
**Rule**: `IF event_description contains "capacity" OR "shortage" OR "full" THEN add_risk`

**Risk Points**: 10 points

**Rationale**: Capacity issues prevent timely processing and transportation.

#### 6.4 Weather Alerts
**Rule**: `IF event_description contains "weather" OR "storm" OR "hurricane" THEN add_risk`

**Risk Points**: 10 points

**Rationale**: Weather events can cause significant delays across all modes.

### 7. Seasonal & Contextual Factors

#### 7.1 Peak Season
**Rule**: `IF month IN [November, December] THEN add_risk`

**Risk Points**: 5 points

**Rationale**: Holiday seasons increase volume and congestion.

#### 7.2 Day of Week
**Rule**: `IF day_of_week IN [Saturday, Sunday] AND current_stage requires_processing THEN add_risk`

**Risk Points**: 3 points

**Rationale**: Weekend processing may be limited.

## Scoring Algorithm

### Base Risk Score Calculation

```typescript
riskScore = 0

// Temporal factors
riskScore += calculateTemporalRisk(daysToEta, daysSinceLastEvent, stageDwellTime)

// Location factors
riskScore += calculateLocationRisk(currentStage, daysSinceLastEvent)

// Route factors
riskScore += calculateRouteRisk(distance, isInternational, mode)

// Mode-specific factors
riskScore += calculateModeRisk(mode, events)

// Carrier factors
riskScore += calculateCarrierRisk(carrier, historicalDelayRate)

// Operational factors
riskScore += calculateOperationalRisk(events, expectedDelivery, now)

// Seasonal factors
riskScore += calculateSeasonalRisk(orderDate, currentDate)

// Cap at 100
riskScore = Math.min(100, riskScore)
```

### Severity Classification

- **High Risk**: `riskScore >= 70`
- **Medium Risk**: `riskScore >= 40`
- **Low Risk**: `riskScore < 40`

### Risk Reasons Assignment

Risk reasons are assigned based on which rules are triggered:
- Each rule that triggers adds its corresponding risk reason
- Multiple reasons can be assigned to a single shipment
- Reasons are prioritized by severity

## Factor Analysis

### Critical Factors (High Predictive Power)

1. **Time to ETA** (Weight: 0.25)
   - Strongest predictor of delay risk
   - Directly correlates with urgency

2. **Stale Status** (Weight: 0.20)
   - Indicates tracking gaps or stagnation
   - High correlation with actual delays

3. **Current Stage vs Expected Progress** (Weight: 0.15)
   - Compares actual progress to expected timeline
   - Identifies shipments behind schedule

4. **Location-Based Delays** (Weight: 0.15)
   - Customs, ports, hubs are common bottlenecks
   - High impact on delivery time

5. **Historical Carrier Performance** (Weight: 0.10)
   - Past performance predicts future delays
   - Useful for proactive risk assessment

### Secondary Factors (Moderate Predictive Power)

6. **Distance** (Weight: 0.05)
   - Longer routes have more exposure to delays
   - Mode-specific thresholds

7. **International Status** (Weight: 0.03)
   - Additional complexity and documentation
   - Border crossing delays

8. **Service Level** (Weight: 0.02)
   - Express shipments have tighter timelines
   - Higher expectations

9. **Seasonal Factors** (Weight: 0.02)
   - Peak seasons increase congestion
   - Weather patterns

10. **Operational Events** (Weight: 0.03)
    - Weather alerts, capacity issues, documentation problems
    - Real-time indicators

## Implementation Strategy

### Phase 1: Enhanced Rules Engine (Current)
- Implement comprehensive rule set
- Add distance calculation
- Enhance scoring algorithm
- Improve risk reason assignment

### Phase 2: Historical Data Integration
- Track carrier performance metrics
- Calculate route-specific delay rates
- Build historical patterns database

### Phase 3: ML Model Integration
- Train ML model on historical data
- Combine rule-based and ML predictions
- Continuous learning from outcomes

### Phase 4: Real-Time Data Integration
- Weather API integration
- Port congestion data
- Traffic and border crossing status

## Example Scoring

### Example 1: High-Risk Shipment
- **Days to ETA**: -2 (past ETA)
- **Days since last event**: 4 days
- **Current stage**: "Awaiting Customs"
- **Distance**: 12,000 km (international)
- **Mode**: Sea

**Calculation**:
- Time to ETA: 50 points (past ETA)
- Stale Status: 25 points (4 days)
- Customs Hold: 10 points
- Distance: 10 points (long distance)
- International: 5 points
- **Total**: 100 points (capped) → **High Risk**

### Example 2: Low-Risk Shipment
- **Days to ETA**: 15 days
- **Days since last event**: 0.5 days
- **Current stage**: "In Transit"
- **Distance**: 5,000 km (domestic)
- **Mode**: Air

**Calculation**:
- Time to ETA: 0 points (plenty of time)
- Stale Status: 0 points (recent update)
- Distance: 0 points (moderate distance)
- International: 0 points (domestic)
- **Total**: 0 points → **Low Risk** (no alert)

## Future Enhancements

1. **Machine Learning Integration**
   - Train models on historical delay data
   - Feature engineering from all factors
   - Ensemble methods combining multiple models

2. **External Data Sources**
   - Real-time weather APIs
   - Port congestion indices
   - Carrier performance APIs
   - Traffic and border crossing data

3. **Predictive Analytics**
   - Early warning system (predict delays before they occur)
   - Risk trend analysis
   - Proactive intervention recommendations

4. **Dynamic Thresholds**
   - Adjust thresholds based on historical patterns
   - Mode-specific and route-specific thresholds
   - Seasonal adjustments

