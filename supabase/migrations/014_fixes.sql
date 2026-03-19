-- =========================================
-- 014: Bug fixes
-- =========================================

-- 1. Drop FK constraint on ideas.topic_id so we can store household_id directly.
--    (topic_id column is reused to store household_id for backward compat.)
ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_topic_id_fkey;

-- 2. Allow household members to be deleted by any member of the household.
--    Admin enforcement is handled at the application layer.
DROP POLICY IF EXISTS "members_delete" ON household_members;
CREATE POLICY "members_delete" ON household_members
  FOR DELETE USING (is_household_member(household_id));
