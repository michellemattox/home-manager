-- Add germination tracking to garden_plantings.
-- Captures first-growth observation date, start method, seedling count,
-- and notes. Days-to-germination is computed client-side from date_planted.

ALTER TABLE garden_plantings
  ADD COLUMN IF NOT EXISTS germination_date    DATE,
  ADD COLUMN IF NOT EXISTS start_type          TEXT CHECK (start_type IN ('direct_sow', 'transplant')),
  ADD COLUMN IF NOT EXISTS seedlings_emerged   INTEGER,
  ADD COLUMN IF NOT EXISTS germination_notes   TEXT;
