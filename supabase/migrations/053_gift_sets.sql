-- =========================================
-- 053: Gift Sets (Gifts tab)
-- =========================================
-- Items that should be purchased together "as a set". A set is identified by a
-- shared, case-sensitive set_name within the same list (same recipient, or the
-- shared Home list). Grouping is done client-side by (recipient_member_id, set_name).
-- No new table needed — a nullable column on gifts keeps all existing CRUD intact.

ALTER TABLE gifts ADD COLUMN IF NOT EXISTS set_name TEXT;

CREATE INDEX IF NOT EXISTS gifts_set_idx
  ON gifts (household_id, recipient_member_id, set_name)
  WHERE set_name IS NOT NULL;
