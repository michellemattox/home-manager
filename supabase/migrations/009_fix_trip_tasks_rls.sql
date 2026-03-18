-- Fix trip_tasks: missing WITH CHECK meant inserts were blocked
DROP POLICY IF EXISTS "trip_tasks_all" ON trip_tasks;
CREATE POLICY "trip_tasks_all" ON trip_tasks
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_id AND is_household_member(t.household_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_id AND is_household_member(t.household_id)
    )
  );

-- Fix trip_task_owners similarly
DROP POLICY IF EXISTS "trip_task_owners_all" ON trip_task_owners;
CREATE POLICY "trip_task_owners_all" ON trip_task_owners
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_tasks tt
      JOIN trips t ON t.id = tt.trip_id
      WHERE tt.id = trip_task_id AND is_household_member(t.household_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_tasks tt
      JOIN trips t ON t.id = tt.trip_id
      WHERE tt.id = trip_task_id AND is_household_member(t.household_id)
    )
  );
