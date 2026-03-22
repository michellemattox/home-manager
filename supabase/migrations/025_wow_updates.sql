-- =========================================
-- 025: Week-over-Week (WoW) updates table
-- =========================================

CREATE TABLE IF NOT EXISTS wow_updates (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start   DATE        NOT NULL,
  source_type  TEXT        NOT NULL CHECK (source_type IN ('idea', 'project', 'activity', 'goal', 'task')),
  source_id    TEXT,                   -- UUID of source record; null for items with no detail page
  source_tab   TEXT        NOT NULL,   -- expo-router segment: 'ideas' | 'projects' | 'activity' | 'goals' | 'tasks'
  title        TEXT        NOT NULL,
  summary      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wow_updates_household_week
  ON wow_updates(household_id, week_start);

ALTER TABLE wow_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wow_updates_read" ON wow_updates
  FOR SELECT TO authenticated
  USING (is_household_member(household_id));

CREATE POLICY "wow_updates_service_all" ON wow_updates
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
