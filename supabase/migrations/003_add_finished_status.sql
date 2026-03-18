-- Add 'finished' as a valid project status.
-- If the projects.status column has a CHECK constraint, drop and recreate it.
-- Run this in the Supabase SQL editor.

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('planned', 'in_progress', 'on_hold', 'completed', 'finished'));
