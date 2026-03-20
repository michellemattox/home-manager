-- =========================================
-- 016: Consolidated RLS + delete policy fixes
-- Run this if migrations 011–014 were not all applied.
-- All statements are idempotent.
-- =========================================

-- 1. Drop FK constraint on ideas.topic_id (from 014)
ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_topic_id_fkey;

-- 2. Fix ideas RLS — topic_id stores household_id directly (from 013)
DROP POLICY IF EXISTS "ideas_all" ON ideas;
CREATE POLICY "ideas_all" ON ideas TO authenticated
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

-- 3. is_personal columns (from 013)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recurring_tasks ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. ideas new columns (from 011)
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
  CHECK (status IN ('new', 'waitlisted', 'converted'));
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS converted_to_type TEXT
  CHECK (converted_to_type IN ('task', 'project', 'activity'));
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS converted_to_id UUID;
UPDATE ideas SET subject = body WHERE subject IS NULL;

-- 5. household_invites table (from 013)
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
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invites_household" ON household_invites;
CREATE POLICY "invites_household" ON household_invites TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- 6. household_members: expand role enum + DELETE policy (from 013 + 014)
ALTER TABLE household_members DROP CONSTRAINT IF EXISTS household_members_role_check;
ALTER TABLE household_members
  ADD CONSTRAINT household_members_role_check
  CHECK (role IN ('admin', 'editor', 'viewer', 'member'));

DROP POLICY IF EXISTS "members_delete" ON household_members;
CREATE POLICY "members_delete" ON household_members
  FOR DELETE USING (is_household_member(household_id));

-- 7. project_tasks: ensure DELETE policy exists
DROP POLICY IF EXISTS "project_tasks_delete" ON project_tasks;
CREATE POLICY "project_tasks_delete" ON project_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND is_household_member(p.household_id)
    )
  );

-- 8. recurring_tasks: ensure DELETE policy exists
DROP POLICY IF EXISTS "recurring_tasks_delete" ON recurring_tasks;
CREATE POLICY "recurring_tasks_delete" ON recurring_tasks
  FOR DELETE USING (is_household_member(household_id));

-- 9. tasks (one-off): ensure DELETE policy exists
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (is_household_member(household_id));
