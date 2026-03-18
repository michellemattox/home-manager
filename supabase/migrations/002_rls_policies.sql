-- =========================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================

-- Helper function: check if current user belongs to a household
CREATE OR REPLACE FUNCTION is_household_member(hid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid
      AND user_id = auth.uid()::TEXT
      AND invite_token IS NULL  -- only fully joined members
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_task_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- =========================================
-- HOUSEHOLDS
-- =========================================
CREATE POLICY "households_select" ON households
  FOR SELECT USING (is_household_member(id));

CREATE POLICY "households_insert" ON households
  FOR INSERT WITH CHECK (TRUE);  -- any authenticated user can create

CREATE POLICY "households_update" ON households
  FOR UPDATE USING (is_household_member(id));

-- =========================================
-- HOUSEHOLD MEMBERS
-- =========================================
CREATE POLICY "members_select" ON household_members
  FOR SELECT USING (is_household_member(household_id) OR user_id = auth.uid()::TEXT);

CREATE POLICY "members_insert" ON household_members
  FOR INSERT WITH CHECK (TRUE);  -- needed for invite flow

CREATE POLICY "members_update" ON household_members
  FOR UPDATE USING (user_id = auth.uid()::TEXT OR is_household_member(household_id));

-- =========================================
-- PROJECTS
-- =========================================
CREATE POLICY "projects_all" ON projects
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "project_owners_all" ON project_owners
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND is_household_member(p.household_id)
    )
  );

CREATE POLICY "project_updates_all" ON project_updates
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND is_household_member(p.household_id)
    )
  );

-- =========================================
-- TRAVEL
-- =========================================
CREATE POLICY "trips_all" ON trips
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "trip_tasks_all" ON trip_tasks
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_id AND is_household_member(t.household_id)
    )
  );

CREATE POLICY "trip_task_owners_all" ON trip_task_owners
  USING (
    EXISTS (
      SELECT 1 FROM trip_tasks tt
      JOIN trips t ON t.id = tt.trip_id
      WHERE tt.id = trip_task_id AND is_household_member(t.household_id)
    )
  );

-- =========================================
-- RECURRING TASKS
-- =========================================
CREATE POLICY "recurring_tasks_all" ON recurring_tasks
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "task_completions_all" ON recurring_task_completions
  USING (
    EXISTS (
      SELECT 1 FROM recurring_tasks rt
      WHERE rt.id = recurring_task_id AND is_household_member(rt.household_id)
    )
  );

-- =========================================
-- SERVICE RECORDS
-- =========================================
CREATE POLICY "service_records_all" ON service_records
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

-- =========================================
-- IDEAS
-- =========================================
CREATE POLICY "idea_topics_all" ON idea_topics
  USING (is_household_member(household_id))
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "ideas_all" ON ideas
  USING (
    EXISTS (
      SELECT 1 FROM idea_topics it
      WHERE it.id = topic_id AND is_household_member(it.household_id)
    )
  );

-- =========================================
-- DEVICE TOKENS
-- =========================================
CREATE POLICY "device_tokens_own" ON device_tokens
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);
