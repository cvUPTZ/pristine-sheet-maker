
-- Add manager role to the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';

-- Update any existing functions that might reference the enum values
-- to ensure they work with the new manager role

-- Update the get_user_role_from_auth function to handle manager role properly
CREATE OR REPLACE FUNCTION public.get_user_role_from_auth(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    WHERE id = user_id_param;
  END IF;
  
  RETURN role_value;
EXCEPTION
  WHEN undefined_table THEN
    -- Fallback to auth metadata if profiles table doesn't exist
    SELECT raw_app_meta_data ->> 'role' INTO role_value
    FROM auth.users
    WHERE id = user_id_param;
    RETURN role_value;
  WHEN OTHERS THEN
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.get_user_role_from_auth(UUID) 
IS 'Gets user role from profiles table first, then falls back to auth metadata. Now supports manager role.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role_from_auth(UUID) TO authenticated;
