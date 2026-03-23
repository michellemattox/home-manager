-- Garden: fertilizing and soil amendment log per zone/plot

CREATE TABLE IF NOT EXISTS garden_amendments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id          UUID NOT NULL REFERENCES garden_plots(id) ON DELETE CASCADE,
  zone_id          UUID REFERENCES garden_zones(id) ON DELETE SET NULL,
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  amendment_type   TEXT NOT NULL DEFAULT 'fertilizer'
                     CHECK (amendment_type IN ('fertilizer','compost','lime','mulch','pest_control','foliar','other')),
  product_name     TEXT NOT NULL,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount           NUMERIC,
  unit             TEXT,   -- 'cups', 'lbs', 'oz', 'gallons', 'tablespoons', 'bags', 'applications'
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE garden_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage their garden amendments"
  ON garden_amendments FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

CREATE INDEX idx_garden_amendments_plot ON garden_amendments(plot_id);
CREATE INDEX idx_garden_amendments_zone ON garden_amendments(zone_id);
