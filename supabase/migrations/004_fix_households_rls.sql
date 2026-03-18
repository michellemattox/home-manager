-- Fix households INSERT policy to explicitly target authenticated users.
-- The original WITH CHECK (TRUE) without TO authenticated can fail in Supabase
-- because no permissive policy is matched for the authenticated role.

DROP POLICY IF EXISTS "households_insert" ON households;

CREATE POLICY "households_insert" ON households
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Also fix household_members INSERT policy for the same reason.
-- This covers both the onboarding flow and the invite flow.
DROP POLICY IF EXISTS "members_insert" ON household_members;

CREATE POLICY "members_insert" ON household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);
