-- Add 'no_repeat' as a valid frequency_type for one-time tasks.
-- When a task with frequency_type = 'no_repeat' is marked done, the app
-- sets is_active = false instead of advancing the due date.

ALTER TABLE recurring_tasks
  DROP CONSTRAINT IF EXISTS recurring_tasks_frequency_type_check;

ALTER TABLE recurring_tasks
  ADD CONSTRAINT recurring_tasks_frequency_type_check
  CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom', 'no_repeat'));
