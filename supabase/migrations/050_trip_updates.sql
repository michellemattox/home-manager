-- =========================================
-- 050: Trip (Activity) updates feed
-- =========================================
-- Mirrors project_updates so activities have a posting/comments stream.
-- The Weekly Business Review surfaces trips with recent updates.

create table if not exists trip_updates (
  id         uuid primary key default uuid_generate_v4(),
  trip_id    uuid not null references trips(id) on delete cascade,
  author_id  uuid references household_members(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_trip_updates_trip_id on trip_updates(trip_id);
create index if not exists idx_trip_updates_created_at on trip_updates(created_at desc);

alter table trip_updates enable row level security;

drop policy if exists "trip_updates_all" on trip_updates;
create policy "trip_updates_all" on trip_updates
  to authenticated
  using (
    exists (
      select 1 from trips t
      where t.id = trip_id and is_household_member(t.household_id)
    )
  )
  with check (
    exists (
      select 1 from trips t
      where t.id = trip_id and is_household_member(t.household_id)
    )
  );
