CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
-- Description: Retrieves the role of a user based on the p_user_id.
--              The role is expected to be stored in the raw_app_meta_data->>'role'
--              field of the auth.users table. Defaults to 'user' if no role is set or user not found.
SELECT COALESCE(
    (SELECT raw_app_meta_data ->> 'role'
     FROM auth.users
     WHERE id = p_user_id),
    'user' -- Default role if not found or NULL
);
$$;

COMMENT ON FUNCTION public.get_user_role(UUID)
IS 'Retrieves the role of a user from auth.users.raw_app_meta_data, defaulting to ''user''. SECURITY DEFINER.';

-- Ensure permissions are still granted
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
