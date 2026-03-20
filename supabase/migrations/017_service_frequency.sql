-- =========================================
-- 017: Add frequency to service_records
-- =========================================

ALTER TABLE service_records
  ADD COLUMN IF NOT EXISTS frequency TEXT
  CHECK (frequency IN ('monthly', 'quarterly', 'bi-annually', 'yearly'));
