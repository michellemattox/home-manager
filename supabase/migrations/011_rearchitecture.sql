-- =========================================
-- 011: Re-architecture — flatten ideas, one-off tasks,
--      event linking for tasks/services, vendor linkage on events
-- =========================================

-- 1. Flatten ideas table (drop topic hierarchy, add subject/description/status)
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
  CHECK (status IN ('new', 'waitlisted', 'converted'));
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS converted_to_type TEXT
  CHECK (converted_to_type IN ('task', 'project', 'activity'));
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS converted_to_id UUID;

-- Migrate existing body → subject for any live data
UPDATE ideas SET subject = body WHERE subject IS NULL AND body IS NOT NULL;

-- =========================================
-- 2. One-off tasks table
-- =========================================
CREATE TABLE IF NOT EXISTS tasks (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id       UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  notes              TEXT,
  due_date           DATE,
  due_time           TIME,
  assigned_member_id UUID        REFERENCES household_members(id) ON DELETE SET NULL,
  linked_event_type  TEXT        CHECK (linked_event_type IN ('project', 'activity')),
  linked_event_id    UUID,
  is_completed       BOOL        NOT NULL DEFAULT FALSE,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date  ON tasks(due_date) WHERE is_completed = FALSE;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_all" ON tasks
  TO authenticated
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- =========================================
-- 3. Link recurring tasks to events
-- =========================================
ALTER TABLE recurring_tasks
  ADD COLUMN IF NOT EXISTS linked_event_type TEXT
    CHECK (linked_event_type IN ('project', 'activity'));
ALTER TABLE recurring_tasks
  ADD COLUMN IF NOT EXISTS linked_event_id UUID;

-- =========================================
-- 4. Link service records to events
-- =========================================
ALTER TABLE service_records
  ADD COLUMN IF NOT EXISTS event_type TEXT
    CHECK (event_type IN ('project', 'activity'));
ALTER TABLE service_records
  ADD COLUMN IF NOT EXISTS event_id UUID;

CREATE INDEX IF NOT EXISTS idx_service_records_event
  ON service_records(event_type, event_id)
  WHERE event_id IS NOT NULL;

-- =========================================
-- 5. Vendor linkage on projects
-- =========================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS uses_vendor BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS primary_vendor_id UUID
    REFERENCES preferred_vendors(id) ON DELETE SET NULL;

-- =========================================
-- 6. Vendor linkage on trips (activities)
-- =========================================
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS uses_vendor BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS primary_vendor_id UUID
    REFERENCES preferred_vendors(id) ON DELETE SET NULL;
