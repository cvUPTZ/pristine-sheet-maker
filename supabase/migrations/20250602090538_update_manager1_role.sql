
-- Update manager1@gmail.com role to manager
UPDATE public.profiles 
SET role = 'manager', updated_at = NOW()
WHERE email = 'manager1@gmail.com';

-- If the user doesn't exist in profiles but exists in auth.users, 
-- we can also update the auth metadata as a fallback
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "manager"}'::jsonb
WHERE email = 'manager1@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'manager1@gmail.com'
);

-- Log the change for verification
DO $$
DECLARE
  user_found BOOLEAN := FALSE;
BEGIN
  -- Check if user was updated in profiles
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE email = 'manager1@gmail.com' AND role = 'manager'
  ) INTO user_found;
  
  IF user_found THEN
    RAISE NOTICE 'Successfully updated manager1@gmail.com role to manager in profiles table';
  ELSE
    -- Check if user exists in auth.users
    SELECT EXISTS(
      SELECT 1 FROM auth.users 
      WHERE email = 'manager1@gmail.com' 
      AND raw_app_meta_data->>'role' = 'manager'
    ) INTO user_found;
    
    IF user_found THEN
      RAISE NOTICE 'Successfully updated manager1@gmail.com role to manager in auth metadata';
    ELSE
      RAISE NOTICE 'User manager1@gmail.com not found in either profiles or auth.users tables';
    END IF;
  END IF;
END $$;
