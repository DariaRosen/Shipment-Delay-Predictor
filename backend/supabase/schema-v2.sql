-- ============================================
-- LogiDog Shipment Delay Predictor - Schema V2
-- Normalized structure: shipments + events
-- Delays and risks calculated dynamically
-- ============================================

-- Create shipments table (main shipment metadata)
CREATE TABLE IF NOT EXISTS shipments (
  shipment_id VARCHAR(50) PRIMARY KEY,
  order_date TIMESTAMPTZ NOT NULL,
  origin_country VARCHAR(100),
  origin_city VARCHAR(100),
  dest_country VARCHAR(100),
  dest_city VARCHAR(100),
  expected_delivery TIMESTAMPTZ,
  current_status VARCHAR(100),
  carrier VARCHAR(100),
  service_level VARCHAR(50),
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('Air', 'Sea', 'Road')),
  priority_level VARCHAR(20) DEFAULT 'normal',
  owner VARCHAR(255),
  last_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shipment_events table (timeline of events)
CREATE TABLE IF NOT EXISTS shipment_events (
  event_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL,
  event_stage VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shipment_id, event_time, event_stage)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipments_carrier ON shipments(carrier);
CREATE INDEX IF NOT EXISTS idx_shipments_mode ON shipments(mode);
CREATE INDEX IF NOT EXISTS idx_shipments_expected_delivery ON shipments(expected_delivery);
CREATE INDEX IF NOT EXISTS idx_shipments_current_status ON shipments(current_status);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_event_time ON shipment_events(shipment_id, event_time DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at for shipments
DROP TRIGGER IF EXISTS update_shipments_updated_at ON shipments;
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
DROP POLICY IF EXISTS "Allow all operations on shipments" ON shipments;
CREATE POLICY "Allow all operations on shipments" ON shipments
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on shipment_events" ON shipment_events;
CREATE POLICY "Allow all operations on shipment_events" ON shipment_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Helper Views for Dynamic Risk Calculation
-- ============================================

-- View: Calculate delays and risks from events
CREATE OR REPLACE VIEW shipment_risk_analysis AS
WITH latest_events AS (
  SELECT DISTINCT ON (shipment_id)
    shipment_id,
    event_time,
    event_stage,
    location
  FROM shipment_events
  ORDER BY shipment_id, event_time DESC
),
event_gaps AS (
  SELECT 
    s.shipment_id,
    s.expected_delivery,
    s.order_date,
    le.event_time AS last_event_time,
    le.event_stage AS current_stage,
    le.location,
    NOW() - le.event_time AS time_since_last_event,
    s.expected_delivery - NOW() AS time_to_eta,
    CASE 
      WHEN le.event_time < s.expected_delivery - INTERVAL '2 days' THEN true
      ELSE false
    END AS is_delayed,
    CASE
      WHEN NOW() - le.event_time > INTERVAL '3 days' THEN 'StaleStatus'
      WHEN s.expected_delivery - NOW() < INTERVAL '1 day' AND le.event_stage NOT LIKE '%delivered%' THEN 'AtRisk'
      ELSE NULL
    END AS risk_indicator
  FROM shipments s
  LEFT JOIN latest_events le ON s.shipment_id = le.shipment_id
)
SELECT 
  s.*,
  era.time_since_last_event,
  era.time_to_eta,
  era.is_delayed,
  era.risk_indicator,
  era.current_stage,
  era.location AS last_location,
  -- Calculate risk score (0-100)
  CASE
    WHEN era.is_delayed THEN 80
    WHEN era.time_since_last_event > INTERVAL '3 days' THEN 70
    WHEN era.time_to_eta < INTERVAL '1 day' AND era.current_stage NOT LIKE '%delivered%' THEN 60
    WHEN era.time_to_eta < INTERVAL '2 days' THEN 40
    ELSE 20
  END AS calculated_risk_score,
  -- Determine severity
  CASE
    WHEN era.is_delayed OR era.time_since_last_event > INTERVAL '3 days' THEN 'High'
    WHEN era.time_to_eta < INTERVAL '2 days' AND era.current_stage NOT LIKE '%delivered%' THEN 'Medium'
    ELSE 'Low'
  END AS calculated_severity
FROM shipments s
LEFT JOIN event_gaps era ON s.shipment_id = era.shipment_id;

