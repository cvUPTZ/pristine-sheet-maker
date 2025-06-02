
-- Update the get_user_role function to check both auth metadata and profiles table
CREATE OR REPLACE FUNCTION public.get_user_role_from_auth(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  role_value TEXT;
BEGIN
  -- First try to get role from profiles table
  SELECT role INTO role_value
  FROM public.profiles
  WHERE id = user_id_param
  LIMIT 1;
  
  -- If not found in profiles, try auth metadata
  IF role_value IS NULL THEN
    SELECT raw_app_meta_data ->> 'role' INTO role_value
    FROM auth.users
    WHERE id = user_id_param
    LIMIT 1;
  END IF;
  
  -- Return the role or default to 'user'
  RETURN COALESCE(role_value, 'user');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'user';
END;
$$;

COMMENT ON FUNCTION public.get_user_role_from_auth(UUID)
IS 'Retrieves user role from profiles table first, then falls back to auth metadata. Returns "user" as default.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role_from_auth(UUID) TO authenticated;
