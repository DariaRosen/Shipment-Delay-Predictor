-- ============================================
-- DEPRECATED: This schema is no longer used
-- We use schema-normalized.sql instead (shipments + shipment_events only)
-- Steps are generated dynamically in code, not stored in database
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

-- Drop and recreate steps table to ensure clean state
DROP TABLE IF EXISTS shipment_timeline CASCADE;
DROP TABLE IF EXISTS steps CASCADE;

-- Create steps table (master catalog of all possible steps)
CREATE TABLE steps (
  step_id SERIAL PRIMARY KEY,
  step_name VARCHAR(255) NOT NULL UNIQUE,
  step_description TEXT,
  step_type VARCHAR(20) NOT NULL CHECK (step_type IN ('Common', 'Air', 'Sea', 'Road', 'Customs', 'MultiModal')),
  expected_duration_hours DECIMAL(10, 2) DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  applies_to_modes VARCHAR(50), -- Comma-separated: 'Air,Sea' or NULL for all
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shipment_timeline table (junction table - links shipments to their steps)
CREATE TABLE shipment_timeline (
  shipment_step_id SERIAL PRIMARY KEY,
  shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  step_id INTEGER NOT NULL REFERENCES steps(step_id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL, -- The sequence order for this specific shipment
  expected_completion_time TIMESTAMPTZ,
  actual_completion_time TIMESTAMPTZ,
  location VARCHAR(255),
  description TEXT, -- Can override default step description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shipment_id, step_order), -- Ensure one step per order position
  CONSTRAINT check_step_order_positive CHECK (step_order > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipments_carrier ON shipments(carrier);
CREATE INDEX IF NOT EXISTS idx_shipments_mode ON shipments(mode);
CREATE INDEX IF NOT EXISTS idx_shipments_expected_delivery ON shipments(expected_delivery);
CREATE INDEX IF NOT EXISTS idx_shipments_current_status ON shipments(current_status);
CREATE INDEX IF NOT EXISTS idx_shipments_owner ON shipments(owner);
CREATE INDEX IF NOT EXISTS idx_steps_step_type ON steps(step_type);
CREATE INDEX IF NOT EXISTS idx_steps_applies_to_modes ON steps(applies_to_modes);
CREATE INDEX IF NOT EXISTS idx_shipment_timeline_shipment_id ON shipment_timeline(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_timeline_step_id ON shipment_timeline(step_id);
CREATE INDEX IF NOT EXISTS idx_shipment_timeline_order ON shipment_timeline(shipment_id, step_order);

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

-- Create trigger to automatically update updated_at for shipment_timeline
DROP TRIGGER IF EXISTS update_shipment_timeline_updated_at ON shipment_timeline;
CREATE TRIGGER update_shipment_timeline_updated_at
  BEFORE UPDATE ON shipment_timeline
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_timeline ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
DROP POLICY IF EXISTS "Allow all operations on shipments" ON shipments;
CREATE POLICY "Allow all operations on shipments" ON shipments
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on steps" ON steps;
CREATE POLICY "Allow all operations on steps" ON steps
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on shipment_timeline" ON shipment_timeline;
CREATE POLICY "Allow all operations on shipment_timeline" ON shipment_timeline
  FOR ALL
  USING (true)
  WITH CHECK (true);

