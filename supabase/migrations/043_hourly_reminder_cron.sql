-- =========================================
-- 043: Switch reminders to hourly cron
-- =========================================
-- The daily cron (migration 029) only fired at 8 AM PT, which meant only
-- users with reminder_hour = 8 ever received emails. Switching to hourly
-- so the edge function's per-user reminder_hour check actually works.

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
