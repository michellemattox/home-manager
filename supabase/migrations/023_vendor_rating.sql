-- Add rating column to preferred_vendors (1–5 scale)
-- Vendors rated 1–2 are treated as "Do Not Use Again" and excluded from project suggestions.
ALTER TABLE preferred_vendors ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
