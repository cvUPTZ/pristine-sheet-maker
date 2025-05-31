-- Function to retrieve a user's role from their app metadata.
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
-- Set a search_path to ensure that the function can find the auth.users table.
-- This is important for SECURITY DEFINER functions.
SET search_path = public, auth, extensions
AS $$
-- Description: Retrieves the role of a user based on the p_user_id.
--              The role is expected to be stored in the raw_app_meta_data->>'role'
--              field of the auth.users table.
-- Parameters:
--   p_user_id: The UUID of the user whose role is to be fetched.
-- Returns: The user's role as TEXT, or NULL if not found or user does not exist.
-- Security: SECURITY DEFINER is used because this function needs to access the
--           auth.users table, which is typically restricted. The function is designed
--           to only return the role, minimizing data exposure.
    SELECT raw_app_meta_data ->> 'role'
    FROM auth.users
    WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION public.get_user_role(UUID)
IS 'Retrieves the role of a user (e.g., ''admin'', ''tracker'') from the auth.users.raw_app_meta_data field. Returns TEXT or NULL. Assumes role is stored as raw_app_meta_data ->> ''role''. SECURITY DEFINER.';

-- Grant execute permission on this function to authenticated users,
-- or specific roles, as needed for RLS policies or other functions.
-- For example, if RLS policies for 'authenticated' users need to check their own role
-- or if other functions callable by users need this.
-- Be cautious with granting permissions broadly if not necessary.
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
-- If only service_role or other specific roles should use it, grant more restrictively:
-- GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO service_role;

-- Example of setting a role for a user (run this in SQL editor, not part of migration usually):
-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
-- WHERE id = 'your-user-id';
--
-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"role": "tracker"}'::jsonb
-- WHERE id = 'another-user-id';
