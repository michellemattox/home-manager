-- =========================================
-- 048: Persist notify_member_ids on notification_preferences
-- =========================================
-- The Settings UI lets a user pick which members' items should appear in
-- their daily digest ("All" + individual member chips). Until now this
-- selection lived only in client-side Zustand storage, so the digest cron
-- had no way to honor it and fell back to a heuristic (recipient's own
-- items + unassigned). This caused "all caught up" emails when items were
-- assigned to other household members.
--
-- Stored as JSONB array of strings: ["all"] (default) or member UUIDs.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS notify_member_ids JSONB NOT NULL DEFAULT '["all"]'::jsonb;
