-- ============================================
-- Migration: Rename shipment_steps to shipment_timeline
-- ============================================

-- Rename the table
ALTER TABLE IF EXISTS shipment_steps RENAME TO shipment_timeline;

-- Rename indexes
ALTER INDEX IF EXISTS idx_shipment_steps_shipment_id RENAME TO idx_shipment_timeline_shipment_id;
ALTER INDEX IF EXISTS idx_shipment_steps_step_id RENAME TO idx_shipment_timeline_step_id;
ALTER INDEX IF EXISTS idx_shipment_steps_order RENAME TO idx_shipment_timeline_order;

-- Rename the trigger
DROP TRIGGER IF EXISTS update_shipment_steps_updated_at ON shipment_timeline;
CREATE TRIGGER update_shipment_timeline_updated_at
  BEFORE UPDATE ON shipment_timeline
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update RLS policies
DROP POLICY IF EXISTS "Allow all operations on shipment_steps" ON shipment_timeline;
CREATE POLICY "Allow all operations on shipment_timeline" ON shipment_timeline
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify the rename
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipment_timeline') THEN
    RAISE NOTICE '✅ Table renamed successfully: shipment_steps -> shipment_timeline';
  ELSE
    RAISE WARNING '⚠️  Table shipment_timeline not found. It may not exist yet.';
  END IF;
END $$;

