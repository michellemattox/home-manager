-- ============================================================================
-- 063: Foster Puppy — weigh-in log
-- ============================================================================
-- Weight is recorded against a calendar DATE, not a timestamp: you weigh a
-- puppy once in a while, not at a moment that matters. `weighed_on` defaults to
-- today (PT is applied app-side via getTodayPT) and stays editable, so a
-- Tuesday vet visit can be entered on Thursday and still land on Tuesday.
--
-- Deliberately NO unique constraint on (puppy_id, weighed_on): a bad reading is
-- corrected by adding a second entry or deleting the first, and a vet weight
-- plus a home-scale weight on the same day are both worth keeping.
--
-- Unlike the potty and feeding logs — which the app only queries for the last
-- 21 days — weigh-ins are read for the puppy's whole stay, because growth only
-- means anything across weeks.
--
-- Purely additive. No existing table, column, constraint or row is touched.
-- Per the 2026-10-30 Supabase change, the CREATE TABLE is followed by explicit
-- Data API grants; RLS still gates rows via is_household_member().
-- ============================================================================

CREATE TABLE IF NOT EXISTS foster_weight_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  puppy_id UUID NOT NULL REFERENCES foster_puppies(id) ON DELETE CASCADE,

  -- Decimal pounds. numeric(5,2) covers 0.01–999.99 lb, which is every dog.
  -- The positive check catches an empty/garbled input reaching the DB.
  weight_lbs NUMERIC(5,2) NOT NULL CHECK (weight_lbs > 0 AND weight_lbs < 400),

  weighed_on DATE NOT NULL DEFAULT CURRENT_DATE,

  notes TEXT,
  logged_by_member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.foster_weight_logs TO anon, authenticated;

-- created_at breaks the tie when two weigh-ins share a date, so "latest weight"
-- is deterministic and matches the order the app renders.
CREATE INDEX IF NOT EXISTS foster_weight_logs_puppy_date_idx
  ON foster_weight_logs (puppy_id, weighed_on DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS foster_weight_logs_household_idx
  ON foster_weight_logs (household_id, weighed_on DESC);

ALTER TABLE foster_weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "foster_weight_logs_all" ON foster_weight_logs;
CREATE POLICY "foster_weight_logs_all" ON foster_weight_logs TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));
