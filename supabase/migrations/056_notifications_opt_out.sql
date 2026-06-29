-- =========================================
-- 056: Master email opt-out on notification_preferences
-- =========================================
-- Settings → Notifications → Frequency now has a "Turn off Notifications"
-- button that lets a member opt out of ALL reminder emails without losing
-- their other preferences (overdue/due-soon toggles, time, frequency, member
-- filter). When false, the send-reminders cron skips this member entirely.
--
-- Defaults to true so existing members keep receiving their digest.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true;
