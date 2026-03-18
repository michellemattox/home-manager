-- Add category and budget tracking to projects.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_cost_cents INTEGER NOT NULL DEFAULT 0;
