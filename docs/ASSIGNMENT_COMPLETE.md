# LogiDog Shipment Delay Predictor - Complete Assignment Documentation

## Part 1: In-Depth Problem Understanding and Logical Solution Proposal

### 1. Analysis of Delay Factors

#### Operational Factors (Internal to LogiDog)

**1. Stale Status / Lack of Updates**
- **Description**: Shipments that haven't received milestone updates for extended periods (3+ days)
- **Impact**: Indicates potential tracking gaps or shipment stagnation
- **Example**: A shipment last updated 5 days ago while still in transit

**2. Hub Congestion**
- **Description**: Shipments stuck at sorting centers or distribution hubs for extended periods
- **Impact**: Bottlenecks in the distribution network prevent timely movement
- **Example**: Package at hub for >1 day when average is 6 hours

**3. Long Dwell Time**
- **Description**: Shipments remaining in the same stage/location for too long (2+ days)
- **Impact**: Indicates processing delays or operational inefficiencies
- **Example**: Container at port for 3 days when it should move within 24 hours

**4. Missed Departure Windows**
- **Description**: Shipments that missed scheduled departure times (planes, vessels, trucks)
- **Impact**: Cascading delays as shipments wait for next available departure
- **Example**: ETA passed but shipment not yet delivered

**5. Documentation Issues**
- **Description**: Missing or incomplete documentation (customs forms, shipping labels, etc.)
- **Impact**: Prevents customs clearance and causes delays at borders
- **Example**: Missing customs documentation blocks international shipment

**6. Capacity Shortages**
- **Description**: Insufficient carrier capacity or warehouse space
- **Impact**: Shipments cannot be processed or transported on schedule
- **Example**: No available cargo space on scheduled flight

#### External Factors (Outside LogiDog's Control)

**1. Customs Holds**
- **Description**: Shipments detained by customs authorities for inspection or documentation review
- **Impact**: Can cause delays of days or weeks, especially for international shipments
- **Example**: Shipment stuck at customs for >1 day

**2. Port Congestion**
- **Description**: Overcrowded ports with limited berth availability
- **Impact**: Vessels wait days before unloading, delaying container pickup
- **Example**: Shipment at port for >2 days when average is 12 hours

**3. Weather Alerts**
- **Description**: Severe weather conditions (storms, hurricanes, snow) affecting transportation
- **Impact**: Grounds flights, closes ports, blocks roads
- **Example**: Hurricane delays sea shipments, snowstorm blocks road transport

**4. Carrier Delays**
- **Description**: Third-party carrier (airline, shipping line, trucking company) experiencing operational issues
- **Impact**: Directly affects delivery timelines
- **Example**: Airline mechanical issues delay cargo flights

**5. No Pickup / Delivery Attempts**
- **Description**: Recipient unavailable or delivery location inaccessible
- **Impact**: Multiple delivery attempts required, extending delivery time
- **Example**: Package awaiting pickup for >1 day

**6. Lost Shipments**
- **Description**: Shipments that are lost or misplaced in the supply chain
- **Impact**: Complete delivery failure requiring investigation and potential replacement
- **Example**: Shipment stuck in same stage for 30+ days with no updates

### 2. Early Delay Identification Logic

#### Flowchart Description

```
START
  ↓
Get Shipment Data (order_date, expected_delivery, events, current_status)
  ↓
Is order_date in the future?
  ├─ YES → Mark as "future" shipment, return (no alert)
  └─ NO → Continue
  ↓
Calculate days_to_ETA = (expected_delivery - today)
Calculate days_since_last_event = (today - last_event_time)
  ↓
Initialize risk_reasons = []
Initialize risk_score = 0
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 1: Stale Status                          │
│ IF days_since_last_event > 3 days              │
│   → Add "StaleStatus" to risk_reasons          │
│   → Add 40 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 2: Missed Delivery                       │
│ IF expected_delivery < today AND                │
│    last_event NOT "delivered"                   │
│   → Add "MissedDeparture" to risk_reasons       │
│   → Add 50 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 3: Long Dwell Time                       │
│ Calculate stage_dwell_time                      │
│ IF stage_dwell_time > 2 days                    │
│   → Add "LongDwell" to risk_reasons             │
│   → Add 25 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 4: Customs Hold                          │
│ IF last_event contains "customs" AND            │
│    days_since_last_event > 1 day                │
│   → Add "CustomsHold" to risk_reasons           │
│   → Add 10 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 5: Port Congestion                        │
│ IF last_event contains "port" AND               │
│    days_since_last_event > 2 days               │
│   → Add "PortCongestion" to risk_reasons        │
│   → Add 10 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 6: Hub Congestion                        │
│ IF last_event contains "hub" AND               │
│    days_since_last_event > 1 day                │
│   → Add "HubCongestion" to risk_reasons         │
│   → Add 10 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 7: No Pickup                             │
│ IF last_event contains "pickup" AND             │
│    days_since_last_event > 1 day                │
│   → Add "NoPickup" to risk_reasons              │
│   → Add 10 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 8: Weather Alert                         │
│ IF last_event contains "weather" OR             │
│    description contains "weather"               │
│   → Add "WeatherAlert" to risk_reasons          │
│   → Add 10 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 9: Capacity Shortage                     │
│ IF last_event contains "capacity" OR            │
│    last_event contains "shortage"               │
│   → Add "CapacityShortage" to risk_reasons     │
│   → Add 10 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 10: Documentation Missing                 │
│ IF last_event contains "doc" OR                 │
│    last_event contains "document"               │
│   → Add "DocsMissing" to risk_reasons           │
│   → Add 10 points to risk_score                 │
└─────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────┐
│ CHECK 11: Shipment Canceled                    │
│ IF stuck in same stage > 30 days AND            │
│    days_past_ETA > 14 days                     │
│   → Mark as "canceled"                          │
│   → Add "Lost" to risk_reasons                  │
│   → Set risk_score = 100                        │
└─────────────────────────────────────────────────┘
  ↓
Calculate final risk_score:
  - Base: days_to_ETA < 0 → +50, < 1 day → +40, < 2 days → +25, < 3 days → +15
  - Stale status: days_since_last_event > 5 → +40, > 3 → +25, > 1 → +10
  - Add 10 points per risk_reason
  - Cap at 100
  ↓
Determine severity:
  - risk_score >= 70 → "High"
  - risk_score >= 40 → "Medium"
  - risk_score < 40 → "Low"
  ↓
Return Alert with risk_reasons, risk_score, severity
  ↓
END
```

#### Textual Description

The system identifies at-risk shipments through a multi-step rule-based analysis:

1. **Future Shipment Check**: If the order date is in the future, the shipment is marked as "future" and excluded from alerts.

2. **Time-Based Risk Calculation**: 
   - Calculate days remaining until expected delivery (days_to_ETA)
   - Calculate days since last milestone update (days_since_last_event)

3. **Risk Factor Detection**: The system checks for 11 specific risk conditions:
   - **Stale Status**: No updates for 3+ days
   - **Missed Delivery**: ETA passed but not delivered
   - **Long Dwell**: Stuck in same stage for 2+ days
   - **Customs Hold**: In customs for 1+ day
   - **Port Congestion**: At port for 2+ days
   - **Hub Congestion**: At hub for 1+ day
   - **No Pickup**: Awaiting pickup for 1+ day
   - **Weather Alert**: Weather-related delays mentioned
   - **Capacity Shortage**: Capacity issues mentioned
   - **Documentation Missing**: Documentation issues mentioned
   - **Shipment Canceled**: Stuck 30+ days AND 14+ days past ETA

4. **Risk Score Calculation**: 
   - Base score from time to ETA (0-50 points)
   - Additional points for stale status (0-40 points)
   - 10 points per risk reason detected
   - Capped at 100 points maximum

5. **Severity Assignment**: 
   - High: risk_score ≥ 70
   - Medium: risk_score ≥ 40
   - Low: risk_score < 40

6. **Alert Generation**: Only shipments with status "in_progress" and risk_score > 0 or risk_reasons.length > 0 are included in alerts.

### 3. Guiding Questions for Discussion and Analysis

#### What types of data could serve as strong indicators for accurate delay prediction?

**1. Temporal Data**
- **Order Date**: When the shipment was created
- **Expected Delivery Date (ETA)**: Planned delivery date
- **Last Milestone Update**: Timestamp of most recent event
- **Event Timestamps**: Historical timeline of all events
- **Rationale**: Time-based metrics are critical for identifying delays. Comparing actual progress against expected timelines reveals bottlenecks.

**2. Location/Stage Data**
- **Current Stage**: Current shipment status (e.g., "In Transit", "At Customs", "Out for Delivery")
- **Event Locations**: Geographic locations of events
- **Origin/Destination**: Shipment route endpoints
- **Rationale**: Location data helps identify where delays occur (ports, customs, hubs) and assess route complexity.

**3. Dwell Time Metrics**
- **Stage Dwell Time**: How long shipment has been in current stage
- **Location Dwell Time**: Time spent at specific locations
- **Average Stage Duration**: Historical averages for comparison
- **Rationale**: Extended dwell times indicate congestion or processing issues at specific points in the supply chain.

**4. Mode and Route Characteristics**
- **Transportation Mode**: Air, Sea, or Road
- **International vs Domestic**: Cross-border shipments face additional complexity
- **Distance**: Route length affects baseline delivery time
- **Rationale**: Different modes and routes have different risk profiles and expected timelines.

**5. Carrier and Service Level**
- **Carrier Name**: Different carriers have different performance
- **Service Level**: Express vs Standard affects expectations
- **Rationale**: Historical carrier performance and service level commitments help set realistic expectations.

**6. Event Descriptions**
- **Event Stage Names**: Structured status updates
- **Event Descriptions**: Free-text descriptions with additional context
- **Rationale**: Text analysis can reveal weather alerts, capacity issues, documentation problems, and other contextual factors.

**7. Historical Patterns**
- **Historical Delay Rates**: Past performance by route, carrier, mode
- **Seasonal Patterns**: Time-of-year variations
- **Rationale**: Historical data helps identify patterns and predict likely delays based on similar past shipments.

#### Which data fields would be critical for training an ML model?

**Essential Features for ML Training:**

**1. Temporal Features**
- `days_to_eta`: Days remaining until expected delivery
- `days_since_last_event`: Time since last update
- `days_since_order`: Time since order creation
- `stage_dwell_time`: Time in current stage
- `time_of_year`: Seasonal indicator (month, quarter)
- `day_of_week`: Weekday vs weekend indicator
- **Why**: Time-based features are the strongest predictors of delays. ML models can learn complex temporal patterns.

**2. Categorical Features**
- `mode`: Air, Sea, Road (one-hot encoded)
- `carrier`: Carrier name (encoded or embedded)
- `service_level`: Express, Standard, etc.
- `current_stage`: Current shipment status (encoded)
- `origin_country/city`: Origin location
- `dest_country/city`: Destination location
- `is_international`: Boolean flag
- **Why**: Categorical features capture operational and route characteristics that affect delay probability.

**3. Historical/Statistical Features**
- `carrier_avg_delay_rate`: Historical delay rate for this carrier
- `route_avg_delay_rate`: Historical delay rate for this route
- `mode_avg_delay_rate`: Historical delay rate for this mode
- `stage_avg_duration`: Average time spent in current stage
- `similar_shipments_delay_rate`: Delay rate for similar shipments
- **Why**: Historical patterns provide strong predictive signals. ML models excel at learning from aggregated historical data.

**4. Event-Based Features**
- `event_count`: Total number of events so far
- `events_in_last_24h`: Recent activity indicator
- `has_customs_event`: Boolean for customs involvement
- `has_port_event`: Boolean for port involvement
- `event_description_keywords`: Extracted keywords (weather, capacity, docs, etc.)
- **Why**: Event patterns and frequencies indicate shipment health and potential issues.

**5. Derived Features**
- `progress_percentage`: Estimated progress based on stage
- `expected_vs_actual_ratio`: Comparison of expected vs actual timeline
- `risk_score`: Current calculated risk score (if using hybrid approach)
- `delay_probability`: Historical probability for similar shipments
- **Why**: Derived features combine multiple signals and can capture complex relationships.

**6. External Data (Future Enhancement)**
- `weather_severity`: Weather conditions along route
- `port_congestion_index`: Real-time port congestion data
- `customs_processing_time`: Average customs clearance time for route
- `carrier_performance_score`: Real-time carrier performance metrics
- **Why**: External data provides context that internal data cannot capture, improving prediction accuracy.

**Target Variable for Training:**
- `is_delayed`: Boolean (1 if delivered > 24 hours after ETA, 0 otherwise)
- `delay_hours`: Continuous (actual delay in hours)
- `delay_category`: Categorical (No Delay, Minor Delay <24h, Major Delay >24h)

#### Alert Triggering Approach: Rule-Based vs Dynamic Analysis

**Rule-Based Approach (Current Implementation)**

**Advantages:**
1. **Transparency**: Rules are explicit and understandable. Operations teams can see exactly why an alert was triggered.
2. **Predictability**: Same conditions always produce same results. Easy to test and validate.
3. **Fast Implementation**: Can be built quickly without requiring historical data or model training.
4. **Interpretability**: Each alert can be explained in plain language (e.g., "Alert triggered because shipment hasn't updated in 3 days").
5. **Control**: Business rules can be adjusted immediately based on operational needs.
6. **No Training Data Required**: Works immediately with any data, even for new routes or carriers.
7. **Regulatory Compliance**: Easier to explain and justify decisions to stakeholders.

**Disadvantages:**
1. **Limited Complexity**: Cannot capture complex, non-linear relationships between factors.
2. **Static Thresholds**: Fixed thresholds (e.g., "3 days") may not adapt to different contexts (e.g., sea vs air shipments).
3. **Manual Tuning**: Requires manual adjustment of thresholds based on experience, which may not be optimal.
4. **False Positives**: May trigger alerts for shipments that are actually on track but have unusual patterns.
5. **Missed Patterns**: Cannot discover hidden patterns in data that humans haven't identified.

**Dynamic Analysis Approach (ML/Statistical Model)**

**Advantages:**
1. **Adaptive Learning**: Model learns from historical data and adapts to changing patterns automatically.
2. **Complex Pattern Recognition**: Can identify non-linear relationships and interactions between multiple factors.
3. **Context-Aware**: Can adjust predictions based on route, carrier, season, and other contextual factors.
4. **Continuous Improvement**: Model performance improves as more data becomes available.
5. **Reduced False Positives**: Better at distinguishing between normal variations and actual delays.
6. **Predictive Power**: Can predict delays before they become obvious, enabling earlier intervention.

**Disadvantages:**
1. **Black Box Problem**: Model decisions may be difficult to interpret and explain.
2. **Data Requirements**: Requires substantial historical data for training, which may not be available initially.
3. **Training Complexity**: Requires data science expertise, model selection, hyperparameter tuning.
4. **Maintenance Overhead**: Models need retraining as patterns change, monitoring for drift.
5. **Initial Development Time**: Longer development cycle compared to rule-based systems.
6. **Cold Start Problem**: Poor performance for new routes, carriers, or scenarios without historical data.

**Justification for Rule-Based Approach (Current Choice)**

For this initial logistics system, **rule-based approach is the optimal choice** for the following reasons:

1. **Rapid Deployment**: The system can be deployed immediately without waiting for historical data collection or model training. This addresses the urgent business need for delay detection.

2. **Interpretability is Critical**: Operations teams need to understand why an alert was triggered to take appropriate action. Rule-based alerts provide clear, actionable explanations (e.g., "Shipment stuck at customs for 2 days").

3. **Business Rule Alignment**: The rules directly reflect operational knowledge and business logic. For example, "if shipment is at customs for >1 day, alert" aligns with operational understanding of customs processing times.

4. **Flexibility for New Scenarios**: Rule-based systems work immediately for new routes, carriers, or shipment types without requiring retraining.

5. **Foundation for Future ML**: The rule-based system serves as a baseline and can be enhanced with ML later. The data collected from rule-based alerts can be used to train ML models in the future.

6. **Hybrid Approach Path**: The current implementation can evolve into a hybrid system where:
   - Rule-based alerts handle common, well-understood scenarios
   - ML model provides additional risk scoring for complex cases
   - Rules provide interpretability while ML provides predictive power

**Future Evolution Path:**

1. **Phase 1 (Current)**: Pure rule-based system for immediate deployment
2. **Phase 2**: Collect data and build ML model in parallel
3. **Phase 3**: Hybrid system with rule-based alerts + ML risk scoring
4. **Phase 4**: ML model learns from rule-based alert outcomes to improve predictions

This phased approach allows the system to provide value immediately while building toward a more sophisticated solution.

---

## Part 2: User Interface (UX/UI) Design for a Primary Alerts Screen

### Visual Design Description

The At-Risk Shipments Dashboard is a single-screen interface designed for operations teams to quickly identify and act on shipments at risk of delay. The design follows a clean, modern layout with a teal color scheme that conveys professionalism and urgency.

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: "At-Risk Shipments" | Count | Last Updated Timestamp   │
├─────────────────────────────────────────────────────────────────┤
│  Summary Cards (3 cards in a row):                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Total At-Risk│  │ Alerts by    │  │ Top Risk     │          │
│  │ Shipments    │  │ Severity     │  │ Causes       │          │
│  │ [Count]      │  │ [Donut Chart]│  │ [Bar Chart]  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  Filters Bar (4 filters in a row):                              │
│  [Search] [Risk Score] [Mode] [Carrier]                        │
├─────────────────────────────────────────────────────────────────┤
│  Alerts Table:                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Risk │ Shipment│ Lane │ Mode │ Carrier │ Stage │ ETA │...│  │
│  │ Score│ ID      │      │      │         │       │     │   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ [82] │ LD1001  │ ...  │ 🚢   │ ...     │ ...   │ ... │...│  │
│  │ [90] │ LD1002  │ ...  │ ✈️   │ ...     │ ...   │ ... │...│  │
│  │ ...  │ ...     │ ...  │ ...  │ ...     │ ...   │ ... │...│  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Components

**1. Header Section**
- **Title**: "At-Risk Shipments" in large, bold teal text
- **Subtitle**: Dynamic count of shipments requiring attention
- **Last Updated**: Timestamp showing when data was last refreshed

**2. Summary Cards**
- **Total At-Risk Shipments**: Large number display with high-priority count
- **Alerts by Severity**: Donut chart showing distribution (High/Medium/Low)
- **Top Risk Causes**: Horizontal bar chart showing most common risk factors

**3. Filtering and Search Capabilities**
- **Search**: Text input for Shipment ID, origin, or destination (with search history)
- **Risk Score Filter**: Dropdown (All, High, Medium, Low)
- **Mode Filter**: Dropdown (All, Air, Sea, Road)
- **Carrier Filter**: Dynamic dropdown populated from available carriers

**4. Alerts Table**
- **Columns**: Risk Score, Shipment ID, Lane (Origin → Destination), Mode, Carrier, Current Stage, ETA, Risk Factors, Owner
- **Visual Indicators**:
  - **Risk Score Badges**: Color-coded (Red=High, Orange=Medium, Green=Low)
  - **Mode Icons**: ✈️ (Air), 🚢 (Sea), 🚚 (Road)
  - **Risk Factor Icons**: 🕒 (Stale Status), 🚢 (Port Congestion), 📋 (Customs Hold), etc.
- **Interactivity**: Rows are clickable to view shipment details

**5. Visual Indicators**
- **Color Coding**: 
  - Red badges for High severity (risk score ≥ 70)
  - Orange badges for Medium severity (risk score 40-69)
  - Green badges for Low severity (risk score < 40)
- **Icons**: Mode-specific icons and risk factor icons for quick visual scanning
- **Hover Effects**: Table rows highlight on hover to indicate clickability

### Real-time Data Updates

**Chosen Approach: Polling with React Query**

**Implementation**: The system uses **HTTP polling with React Query (TanStack Query)** for data updates.

**How it works:**
1. Frontend makes HTTP GET requests to `/api/alerts` endpoint
2. React Query automatically refetches data at configurable intervals (default: 30 seconds)
3. Data is cached client-side to reduce server load
4. Manual refresh available via user interaction
5. Optimistic updates for immediate feedback on user actions

**Justification:**

1. **Simplicity**: HTTP polling is straightforward to implement and debug. No need for WebSocket infrastructure or Server-Sent Events setup.

2. **Reliability**: HTTP requests are stateless and work through firewalls, proxies, and load balancers without special configuration.

3. **Scalability**: For this initial system, polling every 30 seconds provides near-real-time updates without overwhelming the server. The backend can handle hundreds of concurrent requests efficiently.

4. **Caching Benefits**: React Query provides intelligent caching, reducing unnecessary network requests and improving performance.

5. **Progressive Enhancement Path**: Can easily upgrade to WebSockets or Server-Sent Events (SSE) later if real-time requirements increase, without changing the API contract.

6. **Cost-Effective**: No additional infrastructure needed (unlike WebSocket servers or message queues).

**Alternative Approaches Considered:**

- **WebSockets**: Provides true real-time updates but adds complexity, requires persistent connections, and may not be necessary for 30-second update intervals.
- **Server-Sent Events (SSE)**: Simpler than WebSockets but still requires persistent connections and server-side event management.
- **Long Polling**: More efficient than short polling but adds complexity and doesn't provide significant benefits for this use case.

**Future Evolution**: As the system scales, we can implement:
- **Phase 1 (Current)**: HTTP polling every 30 seconds
- **Phase 2**: Reduce polling interval to 10-15 seconds for critical alerts
- **Phase 3**: Implement SSE for high-priority alerts only
- **Phase 4**: Full WebSocket implementation if sub-second updates are required

### Data Structure for Display

**Chosen Approach: Denormalized Structure**

**Example Data Structure:**

```json
{
  "data": [
    {
      "shipmentId": "LD1001",
      "origin": "Shanghai",
      "destination": "Los Angeles",
      "mode": "Sea",
      "carrierName": "OceanBlue",
      "serviceLevel": "Std",
      "currentStage": "Port Loading",
      "plannedEta": "2025-11-22T18:00:00Z",
      "daysToEta": 3,
      "lastMilestoneUpdate": "2025-11-15T05:00:00Z",
      "riskScore": 82,
      "severity": "High",
      "riskReasons": ["StaleStatus", "PortCongestion"],
      "owner": "west-coast-team",
      "acknowledged": false
    }
  ],
  "meta": {
    "lastUpdated": "2025-11-19T12:00:00.000Z",
    "count": 1
  }
}
```

**Advantages of Denormalized Structure for This Scenario:**

1. **Single Query Performance**: All data needed for display is in one response. No need for multiple database joins or additional API calls.

2. **Frontend Simplicity**: Frontend can render the table immediately without additional data fetching or client-side joins.

3. **Reduced Network Overhead**: One HTTP request retrieves all necessary data, reducing latency and bandwidth usage.

4. **Caching Efficiency**: React Query can cache the complete alert object, making subsequent renders instant.

5. **Read-Optimized**: Dashboard is primarily read-heavy. Denormalization optimizes for the most common operation (displaying alerts).

6. **Calculated Fields Included**: Risk score, severity, and risk reasons are pre-calculated on the backend, avoiding client-side computation.

7. **API Simplicity**: Single endpoint returns complete, ready-to-display data structure.

**Trade-offs:**

- **Data Redundancy**: Some data (like carrier name) is repeated across multiple shipments, but this is minimal compared to the performance benefits.
- **Update Complexity**: When shipment data changes, the denormalized alert must be recalculated, but this happens on the backend during alert calculation.
- **Storage**: Slightly more storage used, but alerts are calculated on-the-fly, not stored, so this is not a concern.

**Why Not Normalized?**

A normalized structure would require:
- Multiple API calls (shipments, events, carriers, etc.)
- Client-side joins and data assembly
- More complex state management
- Slower initial load time
- More complex caching logic

For a dashboard that primarily displays aggregated, calculated data, denormalization is the optimal choice.

---

## Part 3: Sample Data and Integration

### Sample Data (JSON Format)

```json
[
  {
    "shipmentId": "LD1001",
    "origin": "Shanghai",
    "destination": "Los Angeles",
    "mode": "Sea",
    "carrierName": "OceanBlue",
    "serviceLevel": "Std",
    "currentStage": "Port Loading",
    "plannedEta": "2025-11-22T18:00:00Z",
    "daysToEta": 3,
    "lastMilestoneUpdate": "2025-11-15T05:00:00Z",
    "riskScore": 82,
    "severity": "High",
    "riskReasons": ["StaleStatus", "PortCongestion"],
    "owner": "west-coast-team",
    "acknowledged": false,
    "orderDate": "2025-11-17T00:00:00Z"
  },
  {
    "shipmentId": "LD1002",
    "origin": "Berlin",
    "destination": "Chicago",
    "mode": "Air",
    "carrierName": "SkyBridge",
    "serviceLevel": "Express",
    "currentStage": "Awaiting Customs",
    "plannedEta": "2025-11-19T12:00:00Z",
    "daysToEta": 0,
    "lastMilestoneUpdate": "2025-11-18T04:30:00Z",
    "riskScore": 90,
    "severity": "High",
    "riskReasons": ["CustomsHold"],
    "owner": "air-expedite",
    "acknowledged": false,
    "orderDate": "2025-11-20T00:00:00Z"
  },
  {
    "shipmentId": "LD1003",
    "origin": "Ho Chi Minh",
    "destination": "Houston",
    "mode": "Sea",
    "carrierName": "BlueWave",
    "serviceLevel": "Std",
    "currentStage": "In Transit",
    "plannedEta": "2025-11-30T00:00:00Z",
    "daysToEta": 11,
    "lastMilestoneUpdate": "2025-11-18T08:00:00Z",
    "riskScore": 35,
    "severity": "Low",
    "riskReasons": [],
    "owner": "gulf-team",
    "acknowledged": false,
    "orderDate": "2025-11-13T00:00:00Z"
  },
  {
    "shipmentId": "LD1004",
    "origin": "Newark",
    "destination": "Toronto",
    "mode": "Road",
    "carrierName": "NorthDrive",
    "serviceLevel": "Priority",
    "currentStage": "Ready for Dispatch",
    "plannedEta": "2025-11-19T20:00:00Z",
    "daysToEta": 1,
    "lastMilestoneUpdate": "2025-11-17T22:00:00Z",
    "riskScore": 76,
    "severity": "High",
    "riskReasons": ["MissedDeparture"],
    "owner": "road-east",
    "acknowledged": false,
    "orderDate": "2025-11-18T00:00:00Z"
  },
  {
    "shipmentId": "LD1005",
    "origin": "Mumbai",
    "destination": "London",
    "mode": "Air",
    "carrierName": "AeroLink",
    "serviceLevel": "Express",
    "currentStage": "In Transit",
    "plannedEta": "2025-11-20T14:00:00Z",
    "daysToEta": 1,
    "lastMilestoneUpdate": "2025-11-19T10:00:00Z",
    "riskScore": 45,
    "severity": "Medium",
    "riskReasons": ["LongDwell"],
    "owner": "air-expedite",
    "acknowledged": false,
    "orderDate": "2025-11-15T00:00:00Z"
  },
  {
    "shipmentId": "LD1006",
    "origin": "Tokyo",
    "destination": "Seattle",
    "mode": "Sea",
    "carrierName": "PacificStar",
    "serviceLevel": "Std",
    "currentStage": "At Port",
    "plannedEta": "2025-11-25T00:00:00Z",
    "daysToEta": 6,
    "lastMilestoneUpdate": "2025-11-16T12:00:00Z",
    "riskScore": 65,
    "severity": "Medium",
    "riskReasons": ["PortCongestion"],
    "owner": "west-coast-team",
    "acknowledged": false,
    "orderDate": "2025-11-10T00:00:00Z"
  },
  {
    "shipmentId": "LD1007",
    "origin": "Shenzhen",
    "destination": "Rotterdam",
    "mode": "Sea",
    "carrierName": "OceanBlue",
    "serviceLevel": "Std",
    "currentStage": "In Transit at Sea",
    "plannedEta": "2025-12-05T00:00:00Z",
    "daysToEta": 16,
    "lastMilestoneUpdate": "2025-11-19T14:00:00Z",
    "riskScore": 15,
    "severity": "Low",
    "riskReasons": [],
    "owner": "europe-team",
    "acknowledged": false,
    "orderDate": "2025-11-03T00:00:00Z"
  },
  {
    "shipmentId": "LD1008",
    "origin": "Dubai",
    "destination": "New York",
    "mode": "Air",
    "carrierName": "SkyBridge",
    "serviceLevel": "Express",
    "currentStage": "Awaiting Pickup",
    "plannedEta": "2025-11-21T08:00:00Z",
    "daysToEta": 2,
    "lastMilestoneUpdate": "2025-11-19T06:00:00Z",
    "riskScore": 55,
    "severity": "Medium",
    "riskReasons": ["NoPickup"],
    "owner": "air-expedite",
    "acknowledged": false,
    "orderDate": "2025-11-17T00:00:00Z"
  },
  {
    "shipmentId": "LD1009",
    "origin": "Barcelona",
    "destination": "Miami",
    "mode": "Sea",
    "carrierName": "Mediterranean",
    "serviceLevel": "Std",
    "currentStage": "Customs Clearance",
    "plannedEta": "2025-11-24T00:00:00Z",
    "daysToEta": 5,
    "lastMilestoneUpdate": "2025-11-18T09:00:00Z",
    "riskScore": 70,
    "severity": "High",
    "riskReasons": ["CustomsHold", "StaleStatus"],
    "owner": "east-coast-team",
    "acknowledged": false,
    "orderDate": "2025-11-13T00:00:00Z"
  },
  {
    "shipmentId": "LD1010",
    "origin": "Singapore",
    "destination": "Sydney",
    "mode": "Air",
    "carrierName": "AeroLink",
    "serviceLevel": "Express",
    "currentStage": "Out for Delivery",
    "plannedEta": "2025-11-20T16:00:00Z",
    "daysToEta": 1,
    "lastMilestoneUpdate": "2025-11-19T15:00:00Z",
    "riskScore": 25,
    "severity": "Low",
    "riskReasons": [],
    "owner": "asia-pacific",
    "acknowledged": false,
    "orderDate": "2025-11-18T00:00:00Z"
  },
  {
    "shipmentId": "LD1011",
    "origin": "Los Angeles",
    "destination": "Vancouver",
    "mode": "Road",
    "carrierName": "NorthDrive",
    "serviceLevel": "Priority",
    "currentStage": "At Hub",
    "plannedEta": "2025-11-21T12:00:00Z",
    "daysToEta": 2,
    "lastMilestoneUpdate": "2025-11-18T08:00:00Z",
    "riskScore": 60,
    "severity": "Medium",
    "riskReasons": ["HubCongestion"],
    "owner": "road-west",
    "acknowledged": false,
    "orderDate": "2025-11-16T00:00:00Z"
  },
  {
    "shipmentId": "LD1012",
    "origin": "Frankfurt",
    "destination": "São Paulo",
    "mode": "Air",
    "carrierName": "SkyBridge",
    "serviceLevel": "Express",
    "currentStage": "Weather Delay",
    "plannedEta": "2025-11-22T10:00:00Z",
    "daysToEta": 3,
    "lastMilestoneUpdate": "2025-11-19T11:00:00Z",
    "riskScore": 75,
    "severity": "High",
    "riskReasons": ["WeatherAlert", "StaleStatus"],
    "owner": "air-expedite",
    "acknowledged": false,
    "orderDate": "2025-11-16T00:00:00Z"
  },
  {
    "shipmentId": "LD1013",
    "origin": "Hong Kong",
    "destination": "Amsterdam",
    "mode": "Sea",
    "carrierName": "PacificStar",
    "serviceLevel": "Std",
    "currentStage": "Documentation Review",
    "plannedEta": "2025-11-28T00:00:00Z",
    "daysToEta": 9,
    "lastMilestoneUpdate": "2025-11-17T14:00:00Z",
    "riskScore": 80,
    "severity": "High",
    "riskReasons": ["DocsMissing", "StaleStatus"],
    "owner": "europe-team",
    "acknowledged": false,
    "orderDate": "2025-11-08T00:00:00Z"
  },
  {
    "shipmentId": "LD1014",
    "origin": "Chicago",
    "destination": "Mexico City",
    "mode": "Road",
    "carrierName": "NorthDrive",
    "serviceLevel": "Priority",
    "currentStage": "In Transit",
    "plannedEta": "2025-11-23T18:00:00Z",
    "daysToEta": 4,
    "lastMilestoneUpdate": "2025-11-19T09:00:00Z",
    "riskScore": 30,
    "severity": "Low",
    "riskReasons": [],
    "owner": "road-south",
    "acknowledged": false,
    "orderDate": "2025-11-15T00:00:00Z"
  },
  {
    "shipmentId": "LD1015",
    "origin": "Seoul",
    "destination": "Paris",
    "mode": "Air",
    "carrierName": "AeroLink",
    "serviceLevel": "Express",
    "currentStage": "Capacity Issue",
    "plannedEta": "2025-11-21T20:00:00Z",
    "daysToEta": 2,
    "lastMilestoneUpdate": "2025-11-18T16:00:00Z",
    "riskScore": 65,
    "severity": "Medium",
    "riskReasons": ["CapacityShortage"],
    "owner": "air-expedite",
    "acknowledged": false,
    "orderDate": "2025-11-17T00:00:00Z"
  }
]
```

### Delay Scenarios Demonstrated

1. **LD1001**: Stale Status + Port Congestion (High risk - 82)
2. **LD1002**: Customs Hold (High risk - 90, ETA passed)
3. **LD1004**: Missed Departure (High risk - 76)
4. **LD1005**: Long Dwell Time (Medium risk - 45)
5. **LD1006**: Port Congestion (Medium risk - 65)
6. **LD1008**: No Pickup (Medium risk - 55)
7. **LD1009**: Customs Hold + Stale Status (High risk - 70)
8. **LD1011**: Hub Congestion (Medium risk - 60)
9. **LD1012**: Weather Alert + Stale Status (High risk - 75)
10. **LD1013**: Documentation Missing + Stale Status (High risk - 80)
11. **LD1015**: Capacity Shortage (Medium risk - 65)

### API Design

#### Communication Protocol

**Protocol**: HTTP/HTTPS REST API

**Base URL**: `http://localhost:3001/api` (development) or `https://api.logidog.com/api` (production)

**Content Type**: `application/json`

**Authentication**: (Future implementation - currently open)

#### Endpoints

##### 1. Get All Alerts

**Endpoint**: `GET /api/alerts`

**Description**: Retrieves a list of at-risk shipments with optional filtering

**Query Parameters**:
- `severity` (optional): `High` | `Medium` | `Low` - Filter by risk severity
- `mode` (optional): `Air` | `Sea` | `Road` - Filter by transportation mode
- `carrier` (optional): `string` - Filter by carrier name (case-insensitive partial match)
- `search` (optional): `string` - Search by shipment ID, origin, or destination (case-insensitive partial match)

**Request Example**:
```
GET /api/alerts?severity=High&mode=Sea&carrier=OceanBlue
```

**Response Format**:
```json
{
  "data": [
    {
      "shipmentId": "LD1001",
      "origin": "Shanghai",
      "destination": "Los Angeles",
      "mode": "Sea",
      "carrierName": "OceanBlue",
      "serviceLevel": "Std",
      "currentStage": "Port Loading",
      "plannedEta": "2025-11-22T18:00:00Z",
      "daysToEta": 3,
      "lastMilestoneUpdate": "2025-11-15T05:00:00Z",
      "orderDate": "2025-11-17T00:00:00Z",
      "riskScore": 82,
      "severity": "High",
      "riskReasons": ["StaleStatus", "PortCongestion"],
      "owner": "west-coast-team",
      "acknowledged": false,
      "acknowledgedBy": null,
      "acknowledgedAt": null,
      "status": "in_progress"
    }
  ],
  "meta": {
    "lastUpdated": "2025-11-19T12:00:00.000Z",
    "count": 1
  }
}
```

**Response Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Server error

##### 2. Get Single Alert

**Endpoint**: `GET /api/alerts/:shipmentId`

**Description**: Retrieves detailed information for a specific shipment

**Path Parameters**:
- `shipmentId` (required): Shipment identifier (e.g., "LD1001")

**Request Example**:
```
GET /api/alerts/LD1001
```

**Response Format**: Same as single item in `data` array above, but includes `steps` array for timeline:

```json
{
  "shipmentId": "LD1001",
  "origin": "Shanghai",
  "destination": "Los Angeles",
  "mode": "Sea",
  "carrierName": "OceanBlue",
  "serviceLevel": "Std",
  "currentStage": "Port Loading",
  "plannedEta": "2025-11-22T18:00:00Z",
  "daysToEta": 3,
  "lastMilestoneUpdate": "2025-11-15T05:00:00Z",
  "orderDate": "2025-11-17T00:00:00Z",
  "riskScore": 82,
  "severity": "High",
  "riskReasons": ["StaleStatus", "PortCongestion"],
  "owner": "west-coast-team",
  "acknowledged": false,
  "status": "in_progress",
  "steps": [
    {
      "stepName": "Your order has been successfully created",
      "expectedCompletionTime": "2025-11-17T00:00:00Z",
      "actualCompletionTime": "2025-11-17T00:00:00Z",
      "stepOrder": 1
    },
    {
      "stepName": "Container loaded onto vessel",
      "expectedCompletionTime": "2025-11-18T12:00:00Z",
      "actualCompletionTime": "2025-11-18T12:00:00Z",
      "stepOrder": 2
    }
  ]
}
```

**Response Status Codes**:
- `200 OK`: Success
- `404 Not Found`: Shipment not found
- `500 Internal Server Error`: Server error

##### 3. Acknowledge Alert

**Endpoint**: `POST /api/alerts/acknowledge`

**Description**: Marks a shipment alert as acknowledged by a user

**Request Body**:
```json
{
  "shipmentId": "LD1001",
  "userId": "daria.ops"
}
```

**Request Example**:
```
POST /api/alerts/acknowledge
Content-Type: application/json

{
  "shipmentId": "LD1001",
  "userId": "daria.ops"
}
```

**Response Format**:
```json
{
  "success": true,
  "message": "Alert acknowledged successfully",
  "data": {
    "shipmentId": "LD1001",
    "acknowledged": true,
    "acknowledgedBy": "daria.ops",
    "acknowledgedAt": "2025-11-19T12:30:00.000Z"
  }
}
```

**Response Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid request body
- `404 Not Found`: Shipment not found
- `500 Internal Server Error`: Server error

#### API Design Principles

1. **RESTful**: Uses standard HTTP methods (GET, POST) and status codes
2. **Stateless**: Each request contains all information needed
3. **JSON Format**: All requests and responses use JSON
4. **Error Handling**: Consistent error response format
5. **Filtering**: Query parameters for flexible data retrieval
6. **Pagination Ready**: Meta object includes count for future pagination

---

## Part 4: Implement Delay Logic

### Code Implementation

```typescript
/**
 * Determines if a shipment is at risk of delay based on multiple factors
 * @param shipmentData - Shipment object with all relevant data
 * @returns true if shipment is at risk, false otherwise
 */
function isShipmentAtRisk(shipmentData: {
  shipmentId: string;
  plannedEta: string; // ISO 8601 date string
  lastMilestoneUpdate: string; // ISO 8601 date string
  currentStage: string;
  events?: Array<{
    event_time: string;
    event_stage: string;
  }>;
}): boolean {
  const now = new Date();
  const expectedDelivery = new Date(shipmentData.plannedEta);
  const lastUpdate = new Date(shipmentData.lastMilestoneUpdate);
  
  // Calculate time differences
  const daysToEta = Math.ceil((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Risk Factor 1: Stale Status - No update in 3+ days
  if (daysSinceLastUpdate > 3) {
    return true;
  }
  
  // Risk Factor 2: Missed Delivery - ETA passed but not delivered
  if (expectedDelivery < now && 
      !shipmentData.currentStage.toLowerCase().includes('delivered') &&
      !shipmentData.currentStage.toLowerCase().includes('received')) {
    return true;
  }
  
  // Risk Factor 3: Late Final Mile - ETA within 3 days but not in delivery stage
  if (daysToEta >= 0 && daysToEta <= 3 && 
      !shipmentData.currentStage.toLowerCase().includes('out for delivery') &&
      !shipmentData.currentStage.toLowerCase().includes('delivery')) {
    return true;
  }
  
  // Risk Factor 4: Long Dwell Time - Stuck in same stage
  if (shipmentData.events && shipmentData.events.length > 0) {
    const latestEvent = shipmentData.events
      .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())[0];
    
    const latestEventTime = new Date(latestEvent.event_time);
    const timeInCurrentStage = (now.getTime() - latestEventTime.getTime()) / (1000 * 60 * 60 * 24);
    
    // Check if stuck in same stage for more than 2 days
    if (timeInCurrentStage > 2 && 
        latestEvent.event_stage.toLowerCase() === shipmentData.currentStage.toLowerCase()) {
      return true;
    }
  }
  
  // Risk Factor 5: Customs Hold - Stuck in customs for more than 1 day
  if (shipmentData.currentStage.toLowerCase().includes('customs') && 
      daysSinceLastUpdate > 1) {
    return true;
  }
  
  // Risk Factor 6: Port Congestion - Stuck at port for more than 2 days
  if (shipmentData.currentStage.toLowerCase().includes('port') && 
      daysSinceLastUpdate > 2) {
    return true;
  }
  
  // If none of the risk factors are triggered, shipment is not at risk
  return false;
}

// Example 1: Shipment at risk (Stale Status)
const shipment1 = {
  shipmentId: "LD1001",
  plannedEta: "2025-11-22T18:00:00Z",
  lastMilestoneUpdate: "2025-11-15T05:00:00Z", // 4 days ago
  currentStage: "Port Loading",
  events: [
    {
      event_time: "2025-11-15T05:00:00Z",
      event_stage: "Port Loading"
    }
  ]
};

console.log("Shipment LD1001 at risk?", isShipmentAtRisk(shipment1));
// Output: true (Stale Status - no update in 4 days)

// Example 2: Shipment at risk (Missed Delivery)
const shipment2 = {
  shipmentId: "LD1002",
  plannedEta: "2025-11-19T12:00:00Z", // ETA passed
  lastMilestoneUpdate: "2025-11-18T04:30:00Z",
  currentStage: "Awaiting Customs", // Not delivered
  events: [
    {
      event_time: "2025-11-18T04:30:00Z",
      event_stage: "Awaiting Customs"
    }
  ]
};

console.log("Shipment LD1002 at risk?", isShipmentAtRisk(shipment2));
// Output: true (Missed Delivery - ETA passed but not delivered)

// Example 3: Shipment NOT at risk (On track)
const shipment3 = {
  shipmentId: "LD1003",
  plannedEta: "2025-11-30T00:00:00Z", // 11 days away
  lastMilestoneUpdate: "2025-11-18T08:00:00Z", // Updated yesterday
  currentStage: "In Transit",
  events: [
    {
      event_time: "2025-11-18T08:00:00Z",
      event_stage: "In Transit"
    }
  ]
};

console.log("Shipment LD1003 at risk?", isShipmentAtRisk(shipment3));
// Output: false (No risk factors triggered - on track)
```

### Example Output

```
Shipment LD1001 at risk? true
Shipment LD1002 at risk? true
Shipment LD1003 at risk? false
```

### Explanation

**Example 1 (LD1001)**: Returns `true` because:
- Last update was 4 days ago (exceeds 3-day threshold for Stale Status)
- This triggers the first risk factor check

**Example 2 (LD1002)**: Returns `true` because:
- Expected delivery date has passed (November 19, but today is November 19+)
- Current stage is "Awaiting Customs" (not delivered)
- This triggers the Missed Delivery risk factor

**Example 3 (LD1003)**: Returns `false` because:
- ETA is 11 days away (plenty of time)
- Last update was recent (yesterday)
- Current stage is appropriate for timeline
- No risk factors are triggered

---

## Summary

This complete assignment documentation covers all four parts:

1. **Part 1**: In-depth problem understanding with delay factor analysis, early identification logic (flowchart and textual), and comprehensive answers to guiding questions about data indicators, ML model features, and alert triggering approach justification.

2. **Part 2**: Complete UI/UX design with visual layout, filtering/search capabilities, visual indicators, real-time data updates approach (HTTP polling with React Query), and data structure choice (denormalized) with detailed justification.

3. **Part 3**: Sample data with 15+ shipments demonstrating various delay scenarios, complete API design with 3 endpoints, request/response formats, and communication protocol.

4. **Part 4**: Working code implementation of `isShipmentAtRisk()` function with 3 example calls demonstrating both "at risk" and "not at risk" scenarios with expected outputs and explanations.

All requirements for the homework assignment have been met and documented comprehensively.

