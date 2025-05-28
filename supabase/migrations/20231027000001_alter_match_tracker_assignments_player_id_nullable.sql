-- Alter player_id to be nullable if it exists and is not already nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'match_tracker_assignments' 
    AND column_name = 'player_id'
  ) THEN
    ALTER TABLE public.match_tracker_assignments ALTER COLUMN player_id DROP NOT NULL;
    RAISE NOTICE 'Altered player_id in match_tracker_assignments to be nullable.';
  ELSE
    RAISE NOTICE 'Column player_id does not exist in match_tracker_assignments or is already nullable.';
  END IF;
END $$;

-- Note: The subtask also mentioned ensuring tracker_id is named tracker_user_id.
-- The initial migration (20231027000000_create_match_tracker_assignments_table.sql)
-- already named this column `tracker_id`.
-- The CreateMatchForm.tsx uses `tracker_user_id` in its insert statement.
-- If the column in the database is indeed `tracker_id`, then the form's insert
-- into `tracker_user_id` would fail with a "column not found" error, not a
-- "NOT NULL constraint on player_id" error.
-- Therefore, the immediate error is about `player_id`'s nullability.
-- If there's a separate issue with `tracker_id` vs `tracker_user_id`,
-- that would manifest as a different error once this player_id issue is resolved.
-- This migration will focus solely on making player_id nullable as per the primary goal.
-- The SQL for renaming `tracker_id` to `tracker_user_id` would be:
-- ALTER TABLE public.match_tracker_assignments RENAME COLUMN tracker_id TO tracker_user_id;
-- However, this is commented out as the current error points to player_id.
-- The previous migration created `tracker_id UUID REFERENCES auth.users(id)`.
-- The form tries to insert into `tracker_user_id`. This is a mismatch.
-- The original error "NOT NULL constraint failed for player_id" implies the insert reached the DB,
-- meaning column names in the INSERT statement from the form matched the table, *except* for the constraint.
-- This suggests the column in the table might actually be `tracker_user_id` despite my earlier migration.
-- Let's assume the table has `tracker_user_id` and `player_id` (which is NOT NULL).
-- The fix is to make `player_id` nullable.
-- If the table *actually* has `tracker_id` (from my migration) and the form inserts to `tracker_user_id`,
-- the form's insert would fail before hitting the player_id constraint.
-- The problem description implies the insert *is* happening but failing on player_id.
-- This means `tracker_user_id` must be the correct column name in the DB.
-- My previous migration `20231027000000_create_match_tracker_assignments_table.sql` defined `tracker_id`.
-- This implies that migration might not have run as expected, or the table was created differently.
-- For this step, I will *only* alter player_id. If a `tracker_user_id` column doesn't exist, that's a separate problem.
-- The error "Cannot write a value to a column `tracker_user_id` that does not exist" would appear if it didn't.
-- The error "violates not-null constraint" for "player_id" means the insert is finding all columns listed in the INSERT statement.
-- The form inserts: { match_id: newMatchData.id, tracker_user_id: data.assigned_tracker_id }
-- This confirms `tracker_user_id` exists in the table.

-- The original migration had:
-- tracker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
-- assigned_player_id TEXT, -- For now, using TEXT. Could be an INTEGER if a global player ID system exists.
-- The error message mentions `player_id` not `assigned_player_id`.
-- Let's assume the column name is `player_id` and not `assigned_player_id`.
-- The SQL provided in the task uses `player_id`. I will stick to that.
-- If my earlier migration used `assigned_player_id`, and the table has that, this DO $$ block for `player_id` will do nothing.
-- The previous migration script used `assigned_player_id TEXT,`

-- Re-checking the previous migration (20231027000000...):
-- It defined `assigned_player_id TEXT, -- For now, using TEXT.`
-- It also defined `tracker_id UUID REFERENCES auth.users(id)`.

-- The current error is: "insert into "public"."match_tracker_assignments" ("match_id", "tracker_user_id") values ($1, $2) - NOT NULL constraint failed for column player_id"
-- This error indicates:
-- 1. The table `match_tracker_assignments` is being inserted into.
-- 2. The columns `match_id` and `tracker_user_id` exist in the table and are being provided values.
-- 3. There is a column named `player_id` (not `assigned_player_id`) that has a NOT NULL constraint, and no value is being provided for it.

-- So, the migration needs to target `player_id`.
-- The previous migration I created (20231027000000...) seems to differ from the actual table schema causing the error.
-- The SQL provided in this task is correct for making `player_id` nullable.
