-- =========================================
-- 044: Add last_digest_sent_at + clean up stale cron jobs
-- =========================================
-- Prevents duplicate digest emails when pg_net retries a request.
-- The edge function checks this timestamp and skips users who were
-- already emailed within the current hour.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ;

-- Clean up any stale reminder cron jobs to ensure only hourly-reminders exists
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-reminders';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-daily-reminders';
