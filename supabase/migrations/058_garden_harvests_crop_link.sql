-- ============================================================================
-- Per-plant harvest logging for Garden Map v2.
-- garden_harvests was built for the old model (planting_id + plot_id, both NOT
-- NULL). Relax those so a harvest can instead attach to a v2 crop, and add
-- crop_id + a denormalized crop_name so analytics can group new-model harvests
-- without joining the old plantings table.
-- ============================================================================

ALTER TABLE garden_harvests ALTER COLUMN planting_id DROP NOT NULL;
ALTER TABLE garden_harvests ALTER COLUMN plot_id DROP NOT NULL;

ALTER TABLE garden_harvests ADD COLUMN IF NOT EXISTS crop_id UUID
  REFERENCES garden_crops(id) ON DELETE CASCADE;
ALTER TABLE garden_harvests ADD COLUMN IF NOT EXISTS crop_name TEXT;

CREATE INDEX IF NOT EXISTS idx_garden_harvests_crop ON garden_harvests(crop_id);

-- garden_harvests already grants to anon, authenticated (migration 051) and its
-- RLS policy is unchanged — the new columns inherit both.
