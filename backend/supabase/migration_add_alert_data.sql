-- Migration: Add calculated alert data columns to shipments table
-- This ensures both alerts table and detail page read from the same source

-- Add columns to store calculated alert data
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS calculated_risk_score INTEGER,
ADD COLUMN IF NOT EXISTS calculated_severity VARCHAR(20) CHECK (calculated_severity IN ('Critical', 'High', 'Medium', 'Low', 'Minimal')),
ADD COLUMN IF NOT EXISTS calculated_risk_reasons JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS calculated_risk_factor_points JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS calculated_status VARCHAR(20) CHECK (calculated_status IN ('completed', 'in_progress', 'canceled', 'future')),
ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS calculated_current_stage VARCHAR(255),
ADD COLUMN IF NOT EXISTS calculated_days_to_eta INTEGER;

-- Create index for filtering by severity
CREATE INDEX IF NOT EXISTS idx_shipments_calculated_severity ON shipments(calculated_severity);

-- Create index for filtering by calculated risk score
CREATE INDEX IF NOT EXISTS idx_shipments_calculated_risk_score ON shipments(calculated_risk_score);

-- Create index for filtering by calculated status
CREATE INDEX IF NOT EXISTS idx_shipments_calculated_status ON shipments(calculated_status);

