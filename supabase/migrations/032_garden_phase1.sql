-- Garden Phase 1: plots, zones, sparse cell grid, and plantings

-- ── garden_plots ──────────────────────────────────────────────────────────────
-- One per physical garden area (e.g., "Main Veggie Bed", "Side Yard")
CREATE TABLE IF NOT EXISTS garden_plots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  cols         INTEGER NOT NULL DEFAULT 10,
  rows         INTEGER NOT NULL DEFAULT 20,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE garden_plots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage their garden plots"
  ON garden_plots FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- ── garden_zones ──────────────────────────────────────────────────────────────
-- Named zones within a plot (e.g., "Tomato Row", "Walkway", "Pea Trellis")
CREATE TABLE IF NOT EXISTS garden_zones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id      UUID NOT NULL REFERENCES garden_plots(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  zone_type    TEXT NOT NULL DEFAULT 'bed' CHECK (zone_type IN ('bed', 'walkway', 'container', 'other')),
  color        TEXT NOT NULL DEFAULT '#84cc16',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE garden_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage their garden zones"
  ON garden_zones FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- ── garden_cells ──────────────────────────────────────────────────────────────
-- Sparse storage: only cells that are assigned to a zone are stored.
-- (col, row) are 0-indexed. Unassigned cells are unplanted ground.
CREATE TABLE IF NOT EXISTS garden_cells (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id      UUID NOT NULL REFERENCES garden_plots(id) ON DELETE CASCADE,
  zone_id      UUID REFERENCES garden_zones(id) ON DELETE SET NULL,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  col          INTEGER NOT NULL,
  row          INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plot_id, col, row)
);

ALTER TABLE garden_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage their garden cells"
  ON garden_cells FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- ── garden_plantings ──────────────────────────────────────────────────────────
-- What is actually growing in a zone (or container) during a given season.
CREATE TABLE IF NOT EXISTS garden_plantings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id         UUID NOT NULL REFERENCES garden_plots(id) ON DELETE CASCADE,
  zone_id         UUID REFERENCES garden_zones(id) ON DELETE SET NULL,
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  plant_name      TEXT NOT NULL,
  plant_family    TEXT,      -- Solanaceae, Brassicaceae, Leguminosae, etc.
  variety         TEXT,
  date_planted    DATE,
  date_removed    DATE,
  season_year     INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE garden_plantings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage their garden plantings"
  ON garden_plantings FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));
