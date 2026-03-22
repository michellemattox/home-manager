-- =========================================
-- 028: Fix reminder cron — run hourly
-- =========================================
-- Drop the old fixed-time daily cron and replace with hourly.
-- The Edge Function itself decides which users to notify based on
-- their stored reminder_hour preference.

-- Safe unschedule: only removes the job if it exists (no error if missing)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-reminders';

SELECT cron.schedule(
  'hourly-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sjtlmvcxcffftsdleftf.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
