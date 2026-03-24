-- Garden pest & disease observation log
CREATE TABLE IF NOT EXISTS garden_pest_logs (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id     uuid NOT NULL,
  plot_id          uuid NOT NULL REFERENCES garden_plots(id) ON DELETE CASCADE,
  zone_id          uuid REFERENCES garden_zones(id) ON DELETE SET NULL,
  planting_id      uuid REFERENCES garden_plantings(id) ON DELETE SET NULL,
  observation_date date NOT NULL DEFAULT CURRENT_DATE,
  log_type         text NOT NULL DEFAULT 'pest'
                   CHECK (log_type IN ('pest','disease','deficiency','observation')),
  name             text NOT NULL,
  severity         int  CHECK (severity BETWEEN 1 AND 5),
  treatment        text,
  notes            text,
  resolved         boolean NOT NULL DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE garden_pest_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_members_pest_logs" ON garden_pest_logs
  USING (is_household_member(household_id));

CREATE INDEX garden_pest_logs_plot_idx      ON garden_pest_logs(plot_id);
CREATE INDEX garden_pest_logs_household_idx ON garden_pest_logs(household_id);
