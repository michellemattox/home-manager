-- =========================================
-- 026: Weekly WoW updates cron job
-- =========================================
-- Runs every Monday at 4:00 PM PDT (23:00 UTC).
-- Generates the Week-over-Week summary for all households.

select cron.schedule(
  'weekly-wow-updates',
  '0 23 * * 1',
  $$
  select net.http_post(
    url := 'https://sjtlmvcxcffftsdleftf.supabase.co/functions/v1/generate-wow',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
