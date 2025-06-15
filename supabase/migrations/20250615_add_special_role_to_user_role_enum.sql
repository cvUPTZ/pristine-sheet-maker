
-- Migration: Add 'special' role to user_role enum

-- 1. Add 'special' to the enum type if not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'special'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'special';
  END IF;
END$$;

-- 2. (Optional) Add comment for documentation
COMMENT ON TYPE user_role IS 'User roles: admin, manager, tracker, teacher, user, viewer, special';
