-- =========================================
-- 018: Allow authenticated users to insert themselves into household_members
--      when accepting a valid household invite
-- =========================================

DROP POLICY IF EXISTS "members_insert_via_invite" ON household_members;

CREATE POLICY "members_insert_via_invite" ON household_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id::text = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM household_invites
      WHERE household_invites.household_id::text = household_members.household_id::text
        AND household_invites.email = (auth.jwt() ->> 'email')
        AND household_invites.accepted_at IS NULL
    )
  );
