-- ============================================================================
-- Point garden watering at the new areas (Garden Map v2). Adds area_id so a
-- watering log attaches to a garden area; the old plot_id/zone_id columns stay
-- (already nullable) for the retired plot-based history, which the new screen
-- ignores (fresh start).
-- ============================================================================

ALTER TABLE garden_watering_logs ADD COLUMN IF NOT EXISTS area_id UUID
  REFERENCES garden_areas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_garden_watering_area ON garden_watering_logs(area_id);

-- garden_watering_logs already grants to anon, authenticated (051) and its RLS
-- policy is unchanged — the new column inherits both.
