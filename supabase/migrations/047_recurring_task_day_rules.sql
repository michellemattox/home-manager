-- Persist the actual day-of-week and day-of-month repeat rules. Before this,
-- "Mon+Wed" collapsed to plain weekly (addWeeks on complete) and "3rd Tue of
-- month" collapsed to plain monthly (addMonths), dropping the nuance.

ALTER TABLE recurring_tasks
  ADD COLUMN IF NOT EXISTS days_of_week INTEGER[],
  ADD COLUMN IF NOT EXISTS nth_week INTEGER,
  ADD COLUMN IF NOT EXISTS nth_weekday INTEGER;
