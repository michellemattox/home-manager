-- =========================================
-- FIX: Add TO authenticated + WITH CHECK to policies missing them
-- =========================================

-- project_owners (missing both)
DROP POLICY IF EXISTS "project_owners_all" ON project_owners;
CREATE POLICY "project_owners_all" ON project_owners
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND is_household_member(p.household_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND is_household_member(p.household_id)
    )
  );

-- project_updates (missing both)
DROP POLICY IF EXISTS "project_updates_all" ON project_updates;
CREATE POLICY "project_updates_all" ON project_updates
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND is_household_member(p.household_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND is_household_member(p.household_id)
    )
  );

-- recurring_task_completions (missing both)
DROP POLICY IF EXISTS "task_completions_all" ON recurring_task_completions;
CREATE POLICY "task_completions_all" ON recurring_task_completions
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recurring_tasks rt
      WHERE rt.id = recurring_task_id AND is_household_member(rt.household_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recurring_tasks rt
      WHERE rt.id = recurring_task_id AND is_household_member(rt.household_id)
    )
  );

-- ideas (missing both)
DROP POLICY IF EXISTS "ideas_all" ON ideas;
CREATE POLICY "ideas_all" ON ideas
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM idea_topics it
      WHERE it.id = topic_id AND is_household_member(it.household_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM idea_topics it
      WHERE it.id = topic_id AND is_household_member(it.household_id)
    )
  );

-- =========================================
-- Named checklist columns for project_tasks
-- =========================================
ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS checklist_name TEXT NOT NULL DEFAULT 'General';

ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS assigned_member_id UUID
    REFERENCES household_members(id) ON DELETE SET NULL;

ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- =========================================
-- Named checklist columns for trip_tasks
-- =========================================
ALTER TABLE trip_tasks
  ADD COLUMN IF NOT EXISTS checklist_name TEXT NOT NULL DEFAULT 'General';

ALTER TABLE trip_tasks
  ADD COLUMN IF NOT EXISTS assigned_member_id UUID
    REFERENCES household_members(id) ON DELETE SET NULL;

ALTER TABLE trip_tasks
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- =========================================
-- Completed checklist items archive
-- =========================================
CREATE TABLE IF NOT EXISTS completed_checklist_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type   TEXT NOT NULL CHECK (source_type IN ('project', 'trip')),
  source_id     UUID NOT NULL,
  original_task_id UUID,
  title         TEXT NOT NULL,
  checklist_name TEXT NOT NULL DEFAULT 'General',
  assigned_member_id UUID REFERENCES household_members(id) ON DELETE SET NULL,
  due_date      DATE,
  completed_by  UUID REFERENCES household_members(id) ON DELETE SET NULL,
  completed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_completed_checklist_source
  ON completed_checklist_items(source_type, source_id);

ALTER TABLE completed_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completed_checklist_all" ON completed_checklist_items
  TO authenticated
  USING (
    (source_type = 'project' AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = source_id AND is_household_member(p.household_id)
    ))
    OR
    (source_type = 'trip' AND EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = source_id AND is_household_member(t.household_id)
    ))
  )
  WITH CHECK (
    (source_type = 'project' AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = source_id AND is_household_member(p.household_id)
    ))
    OR
    (source_type = 'trip' AND EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = source_id AND is_household_member(t.household_id)
    ))
  );
