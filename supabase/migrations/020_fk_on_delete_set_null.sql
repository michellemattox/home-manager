-- =========================================
-- 020: Fix FK constraints referencing household_members
--      to use ON DELETE SET NULL so that removing a member
--      doesn't fail due to assigned tasks/records.
-- =========================================

-- recurring_tasks.assigned_member_id
ALTER TABLE recurring_tasks
  DROP CONSTRAINT IF EXISTS recurring_tasks_assigned_member_id_fkey;
ALTER TABLE recurring_tasks
  ADD CONSTRAINT recurring_tasks_assigned_member_id_fkey
  FOREIGN KEY (assigned_member_id) REFERENCES household_members(id) ON DELETE SET NULL;

-- recurring_task_completions.completed_by
ALTER TABLE recurring_task_completions
  DROP CONSTRAINT IF EXISTS recurring_task_completions_completed_by_fkey;
ALTER TABLE recurring_task_completions
  ADD CONSTRAINT recurring_task_completions_completed_by_fkey
  FOREIGN KEY (completed_by) REFERENCES household_members(id) ON DELETE SET NULL;

-- projects.created_by
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE projects
  ADD CONSTRAINT projects_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES household_members(id) ON DELETE SET NULL;

-- project_updates.author_id
ALTER TABLE project_updates
  DROP CONSTRAINT IF EXISTS project_updates_author_id_fkey;
ALTER TABLE project_updates
  ADD CONSTRAINT project_updates_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES household_members(id) ON DELETE SET NULL;

-- trips.created_by
ALTER TABLE trips
  DROP CONSTRAINT IF EXISTS trips_created_by_fkey;
ALTER TABLE trips
  ADD CONSTRAINT trips_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES household_members(id) ON DELETE SET NULL;

-- ideas.author_id
ALTER TABLE ideas
  DROP CONSTRAINT IF EXISTS ideas_author_id_fkey;
ALTER TABLE ideas
  ADD CONSTRAINT ideas_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES household_members(id) ON DELETE SET NULL;
