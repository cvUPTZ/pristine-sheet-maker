-- 1. Create user_event_assignments table
CREATE TABLE user_event_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add unique constraint
ALTER TABLE user_event_assignments
ADD CONSTRAINT unique_user_event_type UNIQUE (user_id, event_type);

-- 3. Define RLS policies
-- Enable RLS for the table
ALTER TABLE user_event_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can perform all operations
-- Assumption: A function like `is_admin()` or a way to check `auth.jwt() ->> 'user_role' = 'admin'` exists.
-- For now, using a placeholder function `is_admin()`. This might need adjustment based on the actual role system.
CREATE POLICY "Allow admin full access"
ON user_event_assignments
FOR ALL
USING ((SELECT public.get_user_role(auth.uid())) = 'admin')
WITH CHECK ((SELECT public.get_user_role(auth.uid())) = 'admin');

-- Policy: Authenticated users can select their own assignments
CREATE POLICY "Allow authenticated users to select their own assignments"
ON user_event_assignments
FOR SELECT
USING (auth.uid() = user_id);

-- Relevant files for understanding existing database schema or user roles:
-- supabase/functions/get_user_role.sql
