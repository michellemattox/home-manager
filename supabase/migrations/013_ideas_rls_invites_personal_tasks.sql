-- =========================================
-- 013: Fix ideas RLS, household_invites table, personal tasks
-- =========================================

-- 1. Fix ideas RLS — topic_id now stores household_id directly
--    Update policy to allow both the new pattern (topic_id = household_id)
--    and legacy pattern (topic_id = idea_topics.id)
DROP POLICY IF EXISTS "ideas_all" ON ideas;
CREATE POLICY "ideas_all" ON ideas
  TO authenticated
  USING (
    is_household_member(topic_id)
    OR EXISTS (
      SELECT 1 FROM idea_topics it
      WHERE it.id = topic_id AND is_household_member(it.household_id)
    )
  )
  WITH CHECK (
    is_household_member(topic_id)
    OR EXISTS (
      SELECT 1 FROM idea_topics it
      WHERE it.id = topic_id AND is_household_member(it.household_id)
    )
  );

-- 2. Add is_personal to tasks and recurring_tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recurring_tasks ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Household invites table (email-based invites with named roles)
CREATE TABLE IF NOT EXISTS household_invites (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  name         TEXT        NOT NULL DEFAULT '',
  role         TEXT        NOT NULL DEFAULT 'editor'
                           CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by   UUID        REFERENCES household_members(id) ON DELETE SET NULL,
  token        TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (household_id, email)
);

CREATE INDEX IF NOT EXISTS idx_invites_household ON household_invites(household_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON household_invites(token);

ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_household" ON household_invites
  TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- 4. Expand household_members role constraint to include editor/viewer
ALTER TABLE household_members DROP CONSTRAINT IF EXISTS household_members_role_check;
ALTER TABLE household_members
  ADD CONSTRAINT household_members_role_check
  CHECK (role IN ('admin', 'editor', 'viewer', 'member'));
