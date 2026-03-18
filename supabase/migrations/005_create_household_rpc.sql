-- Atomic function to create a household and its first admin member.
-- SECURITY DEFINER runs as the function owner, bypassing RLS for the
-- bootstrap step where the user isn't yet a member of the household.
CREATE OR REPLACE FUNCTION create_household_with_member(
  p_name        TEXT,
  p_zip_code    TEXT,
  p_user_id     TEXT,
  p_display_name TEXT,
  p_color_hex   TEXT DEFAULT '#2563EB'
)
RETURNS households
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household households;
BEGIN
  INSERT INTO households (name, zip_code)
  VALUES (p_name, p_zip_code)
  RETURNING * INTO v_household;

  INSERT INTO household_members (household_id, user_id, display_name, role, color_hex)
  VALUES (v_household.id, p_user_id, p_display_name, 'admin', p_color_hex);

  RETURN v_household;
END;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION create_household_with_member FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_household_with_member TO authenticated;
