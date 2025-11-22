-- ============================================
-- LogiDog Shipment Delay Predictor - Main Schema
-- Uses shipment_events for actual events
-- Steps are generated dynamically in code
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
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMPTZ,
  last_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shipment_events table (timeline of actual events)
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
CREATE INDEX IF NOT EXISTS idx_shipments_owner ON shipments(owner);
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
