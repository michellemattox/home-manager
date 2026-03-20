-- =========================================
-- 015: Goals & goal updates tables
-- =========================================

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  user_type TEXT NOT NULL DEFAULT 'family'
    CHECK (user_type IN ('family', 'individual')),
  member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  due_date DATE,
  reminder_frequency TEXT
    CHECK (reminder_frequency IN ('daily', 'weekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused')),
  created_by UUID REFERENCES household_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goals_all" ON goals;
CREATE POLICY "goals_all" ON goals TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

CREATE TABLE IF NOT EXISTS goal_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goal_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal_updates_all" ON goal_updates;
CREATE POLICY "goal_updates_all" ON goal_updates TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));
