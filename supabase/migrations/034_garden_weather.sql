-- Garden: daily weather snapshot per household (OpenWeatherMap)

CREATE TABLE IF NOT EXISTS garden_weather_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  log_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  zip_code       TEXT NOT NULL,
  rainfall_mm    NUMERIC DEFAULT 0,
  temp_high_f    NUMERIC,
  temp_low_f     NUMERIC,
  condition_main TEXT,    -- "Rain", "Clear", "Clouds"
  condition_desc TEXT,    -- "light rain", "overcast clouds"
  icon           TEXT,    -- OWM icon code e.g. "10d"
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, log_date)
);

ALTER TABLE garden_weather_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage their garden weather logs"
  ON garden_weather_logs FOR ALL
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));
