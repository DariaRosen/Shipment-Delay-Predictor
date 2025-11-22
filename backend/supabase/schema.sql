-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id VARCHAR(50) UNIQUE NOT NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('Air', 'Sea', 'Road')),
  carrier_name VARCHAR(255) NOT NULL,
  service_level VARCHAR(50) NOT NULL,
  current_stage VARCHAR(255) NOT NULL,
  planned_eta TIMESTAMPTZ NOT NULL,
  days_to_eta INTEGER NOT NULL,
  last_milestone_update TIMESTAMPTZ NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('High', 'Medium', 'Low')),
  risk_reasons TEXT[] DEFAULT '{}',
  owner VARCHAR(255) NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on shipment_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_alerts_shipment_id ON alerts(shipment_id);

-- Create index on severity for filtering
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- Create index on mode for filtering
CREATE INDEX IF NOT EXISTS idx_alerts_mode ON alerts(mode);

-- Create index on carrier_name for filtering
CREATE INDEX IF NOT EXISTS idx_alerts_carrier_name ON alerts(carrier_name);

-- Create index on acknowledged for filtering
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);

-- Create index on planned_eta for date queries
CREATE INDEX IF NOT EXISTS idx_alerts_planned_eta ON alerts(planned_eta);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, for future auth)
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth needs)
CREATE POLICY "Allow all operations" ON alerts
  FOR ALL
  USING (true)
  WITH CHECK (true);

