-- ============================================================================
-- Garden Map v2 — freeform beds, layered hardscape, vertical supports, and
-- one-marker-per-plant crops positioned in real feet.
--
-- Design notes
-- • Coordinate space is REAL FEET within each area's canvas (width_ft × length_ft).
--   Every bed / hardscape / support / crop is positioned in feet, so spacing and
--   "how many fit" are computed directly. The UI scales feet → pixels to render.
-- • Rectangles/circles use (x_ft, y_ft, width_ft, length_ft, rotation_deg);
--   for a circle, width_ft = length_ft = diameter. Irregular shapes use `points`
--   (jsonb array of {x,y} in feet). `shape` says which representation is live.
-- • The OLD garden tables (garden_plots/zones/cells/plantings + harvests, etc.)
--   are left untouched — the "carry over this crop's history?" prompt reads them.
-- • Per the 2026-10-30 Data API change, every new public table gets explicit
--   grants to anon, authenticated (RLS still gates rows via is_household_member).
-- ============================================================================

-- ── garden_areas ────────────────────────────────────────────────────────────
-- A named place you switch between (Back Yard, Front Beds, Greenhouse). Its
-- canvas size in feet defines the coordinate space everything else lives in.
CREATE TABLE IF NOT EXISTS garden_areas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  width_ft     NUMERIC NOT NULL DEFAULT 20,
  length_ft    NUMERIC NOT NULL DEFAULT 20,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE garden_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage garden areas" ON garden_areas FOR ALL
  USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_areas TO anon, authenticated;
CREATE INDEX idx_garden_areas_household ON garden_areas(household_id, sort_order);

-- ── garden_beds ─────────────────────────────────────────────────────────────
-- A freeform plantable bed/container within an area. Rect, circle, or polygon.
CREATE TABLE IF NOT EXISTS garden_beds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id      UUID NOT NULL REFERENCES garden_areas(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Bed',
  shape        TEXT NOT NULL DEFAULT 'rect' CHECK (shape IN ('rect','circle','polygon')),
  x_ft         NUMERIC NOT NULL DEFAULT 0,
  y_ft         NUMERIC NOT NULL DEFAULT 0,
  width_ft     NUMERIC,            -- circle: diameter
  length_ft    NUMERIC,
  rotation_deg NUMERIC NOT NULL DEFAULT 0,
  points       JSONB,              -- polygon vertices [{x,y}, ...] in feet
  frame_color  TEXT NOT NULL DEFAULT '#B0764A',
  notes        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE garden_beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage garden beds" ON garden_beds FOR ALL
  USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_beds TO anon, authenticated;
CREATE INDEX idx_garden_beds_area ON garden_beds(area_id);

-- ── garden_hardscape ────────────────────────────────────────────────────────
-- Non-plantable areas: gravel, wood chips, pavers, flagstone, mulch. Multiple
-- may overlap in one area (z_index orders them — e.g. pavers over wood chips).
CREATE TABLE IF NOT EXISTS garden_hardscape (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id      UUID NOT NULL REFERENCES garden_areas(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT,
  material     TEXT NOT NULL DEFAULT 'gravel'
                 CHECK (material IN ('gravel','wood_chips','pavers','flagstone','mulch','other')),
  shape        TEXT NOT NULL DEFAULT 'rect' CHECK (shape IN ('rect','circle','polygon')),
  x_ft         NUMERIC NOT NULL DEFAULT 0,
  y_ft         NUMERIC NOT NULL DEFAULT 0,
  width_ft     NUMERIC,
  length_ft    NUMERIC,
  rotation_deg NUMERIC NOT NULL DEFAULT 0,
  points       JSONB,
  z_index      INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE garden_hardscape ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage garden hardscape" ON garden_hardscape FOR ALL
  USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_hardscape TO anon, authenticated;
CREATE INDEX idx_garden_hardscape_area ON garden_hardscape(area_id);

-- ── garden_supports ─────────────────────────────────────────────────────────
-- Vertical growing structures. `support_type` drives the icon + default spacing;
-- width/length/height are all editable (prefilled from the type). A support may
-- sit inside a bed (bed_id) or free on the canvas.
CREATE TABLE IF NOT EXISTS garden_supports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id           UUID NOT NULL REFERENCES garden_areas(id) ON DELETE CASCADE,
  household_id      UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  bed_id            UUID REFERENCES garden_beds(id) ON DELETE SET NULL,
  name              TEXT,
  support_type      TEXT NOT NULL DEFAULT 'teepee'
                      CHECK (support_type IN
                        ('teepee','bean_tower','a_frame','trellis','obelisk','arch','cage','stake','other')),
  shape             TEXT NOT NULL DEFAULT 'circle' CHECK (shape IN ('rect','circle','line','polygon')),
  x_ft              NUMERIC NOT NULL DEFAULT 0,
  y_ft              NUMERIC NOT NULL DEFAULT 0,
  width_ft          NUMERIC,       -- editable footprint width  (circle: diameter)
  length_ft         NUMERIC,       -- editable footprint length
  height_ft         NUMERIC,       -- editable vertical height
  rotation_deg      NUMERIC NOT NULL DEFAULT 0,
  points            JSONB,         -- line/polygon footprint in feet
  default_spacing_in NUMERIC,      -- spacing rule for plants attached to it
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE garden_supports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage garden supports" ON garden_supports FOR ALL
  USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_supports TO anon, authenticated;
CREATE INDEX idx_garden_supports_area ON garden_supports(area_id);

-- ── garden_crops ────────────────────────────────────────────────────────────
-- One row per individual plant marker, positioned in feet. May belong to a bed
-- and/or be attached to a support. support_id is ON DELETE SET NULL so removing
-- a structure never silently destroys plant history — the app prompts whether to
-- also remove the plants. (Moving a support re-syncs its plants' positions in app.)
CREATE TABLE IF NOT EXISTS garden_crops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id             UUID NOT NULL REFERENCES garden_areas(id) ON DELETE CASCADE,
  household_id        UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  bed_id              UUID REFERENCES garden_beds(id) ON DELETE SET NULL,
  support_id          UUID REFERENCES garden_supports(id) ON DELETE SET NULL,
  plant_name          TEXT NOT NULL,
  plant_family        TEXT,
  variety             TEXT,
  x_ft                NUMERIC NOT NULL DEFAULT 0,
  y_ft                NUMERIC NOT NULL DEFAULT 0,
  spacing_in          NUMERIC,
  date_planted        DATE,
  date_removed        DATE,
  season_year         INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
  source_planting_id  UUID REFERENCES garden_plantings(id) ON DELETE SET NULL,  -- carried-over history link
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE garden_crops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage garden crops" ON garden_crops FOR ALL
  USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_crops TO anon, authenticated;
CREATE INDEX idx_garden_crops_area ON garden_crops(area_id);
CREATE INDEX idx_garden_crops_support ON garden_crops(support_id);

-- ── garden_crop_history_choices ─────────────────────────────────────────────
-- Remembers the once-per-crop "carry over history?" decision so the prompt
-- appears exactly once per crop name per household.
CREATE TABLE IF NOT EXISTS garden_crop_history_choices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  crop_key     TEXT NOT NULL,      -- normalized crop name, e.g. lower(trim(plant_name))
  decision     TEXT NOT NULL CHECK (decision IN ('carried','declined')),
  decided_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, crop_key)
);
ALTER TABLE garden_crop_history_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage garden crop history choices" ON garden_crop_history_choices FOR ALL
  USING (is_household_member(household_id)) WITH CHECK (is_household_member(household_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_crop_history_choices TO anon, authenticated;
