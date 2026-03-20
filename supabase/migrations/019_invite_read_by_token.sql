-- =========================================
-- 019: Allow any authenticated user to read a pending invite
--      (needed so invitees can look up their invite before joining)
-- =========================================

-- The existing policy only lets household members read invites.
-- An invitee isn't a member yet, so they can't load their invite.
-- The token is a 64-char random hex string — safe to allow reading by token.

DROP POLICY IF EXISTS "invites_by_token" ON household_invites;

CREATE POLICY "invites_by_token" ON household_invites
  FOR SELECT TO authenticated
  USING (
    is_household_member(household_id)
    OR accepted_at IS NULL
  );
