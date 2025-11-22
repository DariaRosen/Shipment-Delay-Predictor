-- ============================================
-- Cleanup: Drop unused tables (steps and shipment_timeline)
-- Keeping only shipment_events for actual events
-- ============================================

-- Drop shipment_timeline table (if exists)
DROP TABLE IF EXISTS shipment_timeline CASCADE;

-- Drop steps table (if exists)
DROP TABLE IF EXISTS steps CASCADE;

-- Verify tables are dropped
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipment_timeline') THEN
    RAISE NOTICE '✅ shipment_timeline table dropped';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'steps') THEN
    RAISE NOTICE '✅ steps table dropped';
  END IF;
END $$;

