-- =========================================
-- 029: Switch reminders back to once-daily
-- =========================================
-- Drop the hourly cron; users receive exactly 1 email per day
-- (at 3 PM UTC = 8 AM PDT). Frequency preference (daily / every 2 days /
-- weekly / monthly) still controls which days they get the email.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'hourly-reminders';

SELECT cron.schedule(
  'daily-reminders',
  '0 15 * * *',
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
