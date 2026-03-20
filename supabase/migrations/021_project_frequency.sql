-- Add recurring frequency to projects so templates can be tagged as
-- weekly / monthly / bi-annually / annually.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS frequency TEXT;
