-- Migration 051: Explicit Data API grants for all existing public-schema tables
--
-- WHY: Supabase breaking change (effective 2026-10-30 for all existing projects).
-- New tables in the public schema will no longer be auto-exposed to the Data API
-- (PostgREST / GraphQL / supabase-js). Access now requires an explicit GRANT.
-- Grants control whether a role can touch a table AT ALL; RLS still controls which
-- ROWS that role sees. RLS on every table below is unchanged.
-- Ref: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
--
-- This migration codifies grants for the 38 tables created across 001-050 without
-- editing those already-applied migrations (per the repo convention: always add a
-- new numbered file). GRANT is idempotent, so re-running is safe.
--
-- NOTE ON ROLES: the app only ever talks to the DB as `authenticated` (AuthGate
-- forces login; the invite-by-token flow in 019 is `TO authenticated`). The 8 Edge
-- Functions use the service_role key (bypasses RLS, unaffected by this change).
-- `anon` is granted here for parity with the SLiC decision, but no RLS policy grants
-- anon any rows, so anon access stays row-blocked.
--
-- GOING FORWARD: any NEW table added in a future migration must include its own
-- grant block immediately after the CREATE TABLE statement, e.g.:
--   grant select, insert, update, delete on public.<table> to anon, authenticated;

-- 001_initial_schema.sql
grant select, insert, update, delete on public.households                    to anon, authenticated;
grant select, insert, update, delete on public.household_members             to anon, authenticated;
grant select, insert, update, delete on public.projects                      to anon, authenticated;
grant select, insert, update, delete on public.project_owners                to anon, authenticated;
grant select, insert, update, delete on public.project_updates               to anon, authenticated;
grant select, insert, update, delete on public.trips                         to anon, authenticated;
grant select, insert, update, delete on public.trip_tasks                    to anon, authenticated;
grant select, insert, update, delete on public.trip_task_owners              to anon, authenticated;
grant select, insert, update, delete on public.recurring_tasks               to anon, authenticated;
grant select, insert, update, delete on public.recurring_task_completions    to anon, authenticated;
grant select, insert, update, delete on public.service_records               to anon, authenticated;
grant select, insert, update, delete on public.idea_topics                   to anon, authenticated;
grant select, insert, update, delete on public.ideas                         to anon, authenticated;
grant select, insert, update, delete on public.device_tokens                 to anon, authenticated;

-- 007_project_subtasks_notes.sql
grant select, insert, update, delete on public.project_tasks                 to anon, authenticated;

-- 008_preferred_vendors.sql
grant select, insert, update, delete on public.preferred_vendors             to anon, authenticated;

-- 010_checklists_and_rls_fixes.sql
grant select, insert, update, delete on public.completed_checklist_items     to anon, authenticated;

-- 011_rearchitecture.sql
grant select, insert, update, delete on public.tasks                         to anon, authenticated;

-- 013/016 (household_invites — created idempotently in both)
grant select, insert, update, delete on public.household_invites             to anon, authenticated;

-- 015_goals.sql
grant select, insert, update, delete on public.goals                         to anon, authenticated;
grant select, insert, update, delete on public.goal_updates                  to anon, authenticated;

-- 025_wow_updates.sql
grant select, insert, update, delete on public.wow_updates                   to anon, authenticated;

-- 027_notification_preferences.sql
grant select, insert, update, delete on public.notification_preferences      to anon, authenticated;

-- 032_garden_phase1.sql
grant select, insert, update, delete on public.garden_plots                  to anon, authenticated;
grant select, insert, update, delete on public.garden_zones                  to anon, authenticated;
grant select, insert, update, delete on public.garden_cells                  to anon, authenticated;
grant select, insert, update, delete on public.garden_plantings              to anon, authenticated;

-- 033_garden_harvests.sql
grant select, insert, update, delete on public.garden_harvests               to anon, authenticated;

-- 034_garden_weather.sql
grant select, insert, update, delete on public.garden_weather_logs           to anon, authenticated;

-- 035_garden_amendments.sql
grant select, insert, update, delete on public.garden_amendments             to anon, authenticated;

-- 036_garden_pests.sql
grant select, insert, update, delete on public.garden_pest_logs              to anon, authenticated;

-- 037_garden_seeds.sql
grant select, insert, update, delete on public.garden_seed_inventory         to anon, authenticated;

-- 038_garden_features.sql
grant select, insert, update, delete on public.garden_journal_entries        to anon, authenticated;
grant select, insert, update, delete on public.garden_watering_logs          to anon, authenticated;

-- 040_garden_advisor.sql
grant select, insert, update, delete on public.garden_advisor_recommendations to anon, authenticated;

-- 045_gifts.sql
grant select, insert, update, delete on public.gifts                         to anon, authenticated;

-- 049_weekly_business_review.sql
grant select, insert, update, delete on public.weekly_business_reviews       to anon, authenticated;

-- 050_trip_updates.sql
grant select, insert, update, delete on public.trip_updates                  to anon, authenticated;
