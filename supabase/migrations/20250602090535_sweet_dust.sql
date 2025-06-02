-- Function to safely get a user's role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_value TEXT;
BEGIN
  SELECT role INTO role_value
  FROM public.user_roles
  WHERE user_id = user_id_param
  LIMIT 1;
  
  RETURN role_value;
EXCEPTION
  WHEN undefined_table THEN
    RETURN NULL;
  WHEN OTHERS THEN
    RAISE;
END;
$$;