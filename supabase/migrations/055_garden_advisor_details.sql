-- 055_garden_advisor_details.sql
-- Adds an optional `details` column to garden_advisor_recommendations.
-- The short `recommendation` text stays on the Garden Today card; `details`
-- holds longer supporting text (e.g. succession-planting suggestions for
-- harvest recs) that flows into the task Notes when a rec is accepted.

alter table public.garden_advisor_recommendations
  add column if not exists details text;

-- Existing tables already covered by 051 grants; no new grant needed since
-- this only adds a column to an existing table.
