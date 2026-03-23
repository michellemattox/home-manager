-- Garden Phase 2: harvest log

CREATE TABLE IF NOT EXISTS garden_harvests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planting_id     UUID NOT NULL REFERENCES garden_plantings(id) ON DELETE CASCADE,
  plot_id         UUID NOT NULL REFERENCES garden_plots(id) ON DELETE CASCADE,
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_value  NUMERIC,
  quantity_unit   TEXT,   -- 'lbs', 'oz', 'kg', 'count', 'bunches', 'bags', etc.
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE garden_harvests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage their garden harvests"
  ON garden_harvests FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));
