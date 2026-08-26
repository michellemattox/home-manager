-- ============================================================================
-- 060: Foster Puppy — profiles + potty log + food/water log
-- ============================================================================
-- Household-shared (both members log to the same puppy). One puppy at a time is
-- the "current" one: `is_current` is kept unique per household by a partial
-- index, and the app flips the old current off in the same mutation.
--
-- Deactivating a puppy (adopted / moved on) sets active = FALSE and stamps
-- departed_on. History is kept — deactivated puppies drop out of the picker but
-- their logs stay queryable.
--
-- All timestamps are stored as TIMESTAMPTZ of the *actual event time*, not the
-- insert time, so back-dated entries ("he went 30 min ago") land correctly in
-- the daily report and in the projection model.
--
-- Per the 2026-10-30 Supabase change, each CREATE TABLE is followed by explicit
-- Data API grants; RLS still gates rows via is_household_member().
-- ============================================================================

-- ── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foster_puppies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  -- Date of birth drives the computed age shown in the app and the age-based
  -- bladder-capacity bound in the projection model. Approximate is fine.
  dob DATE,
  dob_is_estimate BOOLEAN NOT NULL DEFAULT FALSE,
  arrival_date DATE NOT NULL DEFAULT CURRENT_DATE,

  active BOOLEAN NOT NULL DEFAULT TRUE,
  departed_on DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.foster_puppies TO anon, authenticated;

CREATE INDEX IF NOT EXISTS foster_puppies_household_idx
  ON foster_puppies (household_id, active);

-- At most one current puppy per household.
CREATE UNIQUE INDEX IF NOT EXISTS foster_puppies_one_current_idx
  ON foster_puppies (household_id)
  WHERE is_current = TRUE;

ALTER TABLE foster_puppies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "foster_puppies_all" ON foster_puppies;
CREATE POLICY "foster_puppies_all" ON foster_puppies TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- ── Potty log ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foster_potty_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  puppy_id UUID NOT NULL REFERENCES foster_puppies(id) ON DELETE CASCADE,

  -- pee = #1, poop = #2, both = #3
  kind TEXT NOT NULL CHECK (kind IN ('pee', 'poop', 'both')),
  location TEXT NOT NULL CHECK (location IN ('walk', 'backyard', 'inside')),

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  logged_by_member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.foster_potty_logs TO anon, authenticated;

CREATE INDEX IF NOT EXISTS foster_potty_logs_puppy_time_idx
  ON foster_potty_logs (puppy_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS foster_potty_logs_household_idx
  ON foster_potty_logs (household_id, occurred_at DESC);

ALTER TABLE foster_potty_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "foster_potty_logs_all" ON foster_potty_logs;
CREATE POLICY "foster_potty_logs_all" ON foster_potty_logs TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- ── Food / water log ────────────────────────────────────────────────────────
-- Meal timing is the strongest predictor of #2 timing, so these rows feed the
-- projection model as well as the daily report.
CREATE TABLE IF NOT EXISTS foster_feeding_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  puppy_id UUID NOT NULL REFERENCES foster_puppies(id) ON DELETE CASCADE,

  kind TEXT NOT NULL CHECK (kind IN ('food', 'water', 'both')),
  amount TEXT,

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  logged_by_member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.foster_feeding_logs TO anon, authenticated;

CREATE INDEX IF NOT EXISTS foster_feeding_logs_puppy_time_idx
  ON foster_feeding_logs (puppy_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS foster_feeding_logs_household_idx
  ON foster_feeding_logs (household_id, occurred_at DESC);

ALTER TABLE foster_feeding_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "foster_feeding_logs_all" ON foster_feeding_logs;
CREATE POLICY "foster_feeding_logs_all" ON foster_feeding_logs TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));
