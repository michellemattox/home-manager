-- Garden Journal Entries: free-form dated observations per plot/zone/planting

CREATE TABLE IF NOT EXISTS garden_journal_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  plot_id      UUID REFERENCES garden_plots(id) ON DELETE SET NULL,
  zone_id      UUID REFERENCES garden_zones(id) ON DELETE SET NULL,
  planting_id  UUID REFERENCES garden_plantings(id) ON DELETE SET NULL,
  entry_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  title        TEXT,
  body         TEXT NOT NULL,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE garden_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage garden journal entries"
  ON garden_journal_entries FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

CREATE INDEX idx_garden_journal_household ON garden_journal_entries(household_id, entry_date DESC);


-- Garden Watering Logs: track manual irrigation per plot/zone

CREATE TABLE IF NOT EXISTS garden_watering_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  plot_id      UUID REFERENCES garden_plots(id) ON DELETE SET NULL,
  zone_id      UUID REFERENCES garden_zones(id) ON DELETE SET NULL,
  water_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_min NUMERIC,       -- minutes watered
  amount_gal   NUMERIC,       -- gallons applied (optional)
  method       TEXT NOT NULL DEFAULT 'hand',  -- hand, drip, overhead, soaker
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE garden_watering_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage garden watering logs"
  ON garden_watering_logs FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

CREATE INDEX idx_garden_watering_household ON garden_watering_logs(household_id, water_date DESC);
