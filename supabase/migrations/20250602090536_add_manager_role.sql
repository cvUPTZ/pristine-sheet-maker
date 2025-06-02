
-- Add manager role support to the database

-- First, let's update any existing user role checks to include 'manager'
-- This ensures backward compatibility

-- Update any role-based RLS policies that might need to include manager
-- Note: This is a placeholder - actual policies would depend on your specific setup

-- Add a comment to document the manager role
COMMENT ON COLUMN profiles.role IS 'User role: admin, manager, tracker, teacher, user, viewer';

-- If you have any role validation constraints, update them to include manager
-- Example (uncomment if you have such constraints):
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
--   CHECK (role IN ('admin', 'manager', 'tracker', 'teacher', 'user', 'viewer'));

-- Update the get_user_role function to handle manager role properly
-- (The function should already work with any string value, but this ensures it's documented)

-- Create a view or helper for manager-specific permissions if needed
CREATE OR REPLACE FUNCTION public.user_has_manager_access(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('admin', 'manager')
  FROM profiles
  WHERE id = user_id_param;
$$;

COMMENT ON FUNCTION public.user_has_manager_access(UUID) 
IS 'Check if user has manager-level access (admin or manager role)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_manager_access(UUID) TO authenticated;

-- Create a helper function to check if user has admin-level access
CREATE OR REPLACE FUNCTION public.user_has_admin_access(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'admin'
  FROM profiles
  WHERE id = user_id_param;
$$;

COMMENT ON FUNCTION public.user_has_admin_access(UUID) 
IS 'Check if user has admin-level access (admin role only)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_admin_access(UUID) TO authenticated;
