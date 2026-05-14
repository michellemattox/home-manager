-- =========================================
-- 049: Weekly Business Review (WBR) snapshots
-- =========================================
-- Stores a weekly summary per household, generated each Monday at 4 PM PT
-- by the `generate-wbr` edge function. The snapshot is read by the Home tab.

create table if not exists weekly_business_reviews (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  week_start  date not null,
  snapshot    jsonb not null,
  generated_at timestamptz not null default now(),
  unique (household_id, week_start)
);

create index if not exists wbr_household_week_idx
  on weekly_business_reviews (household_id, week_start desc);

alter table weekly_business_reviews enable row level security;

-- Household members can read their household's WBRs.
create policy wbr_select on weekly_business_reviews
  for select using (is_household_member(household_id));

-- Only service role writes (edge function uses service key); no direct user inserts/updates.
create policy wbr_no_insert on weekly_business_reviews for insert with check (false);
create policy wbr_no_update on weekly_business_reviews for update using (false);
create policy wbr_no_delete on weekly_business_reviews for delete using (false);

-- Cron: fire Mon 23:00 UTC (PDT 4pm) and Tue 00:00 UTC (PST 4pm) so DST is covered.
-- The edge function itself confirms it's Monday 4 PM Pacific before generating,
-- and is idempotent (unique on household_id + week_start).
select cron.schedule(
  'weekly-business-review-pdt',
  '0 23 * * 1',
  $$
  select net.http_post(
    url := 'https://sjtlmvcxcffftsdleftf.supabase.co/functions/v1/generate-wbr',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'weekly-business-review-pst',
  '0 0 * * 2',
  $$
  select net.http_post(
    url := 'https://sjtlmvcxcffftsdleftf.supabase.co/functions/v1/generate-wbr',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
