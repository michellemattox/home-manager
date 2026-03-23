-- Add recurring/frequency support to goals.
-- is_recurring: whether this goal repeats on a schedule
-- frequency_type: the recurrence pattern
-- frequency_days: days between cycles (used by 'custom' type)

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS frequency_type TEXT
    CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  ADD COLUMN IF NOT EXISTS frequency_days INTEGER DEFAULT 1;
