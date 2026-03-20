-- =========================================
-- 018: Allow authenticated users to insert themselves into household_members
--      when accepting a valid household invite
-- =========================================

CREATE POLICY "members_insert_via_invite" ON household_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM household_invites
      WHERE household_invites.household_id = household_members.household_id
        AND household_invites.email = auth.email()
        AND household_invites.accepted_at IS NULL
    )
  );
