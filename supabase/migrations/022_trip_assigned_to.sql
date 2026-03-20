-- Add assigned_to field to trips so activities can be assigned to
-- a specific member or the whole household ("all").
ALTER TABLE trips ADD COLUMN IF NOT EXISTS assigned_to TEXT;
