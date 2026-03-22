-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule daily reminder emails at 8:00 AM UTC every day.
-- This calls the send-reminders Edge Function which sends a digest
-- email (via Resend) + push notifications for all due/overdue tasks.
select cron.schedule(
  'daily-reminders',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://sjtlmvcxcffftsdleftf.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
