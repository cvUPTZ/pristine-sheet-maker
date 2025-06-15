
-- Add a new column to store custom permissions for users
ALTER TABLE public.profiles
ADD COLUMN custom_permissions JSONB NULL;

COMMENT ON COLUMN public.profiles.custom_permissions IS 'Stores custom, user-specific permission overrides as a JSONB object.';
