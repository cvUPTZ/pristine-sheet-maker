-- Create the matches table
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    home_team_name TEXT NOT NULL,
    away_team_name TEXT NOT NULL,
    match_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'published', 'live', 'completed', 'archived'
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that calls this function before any update on the matches table
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS for the matches table
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_match_date ON public.matches(match_date);
CREATE INDEX idx_matches_created_by ON public.matches(created_by);

-- Define RLS Policies for matches table

-- Policy 1 (Admins): Admins can perform all operations (SELECT, INSERT, UPDATE, DELETE).
CREATE POLICY "Allow admin full access"
ON public.matches
FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin')
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Policy 2 (Authenticated Users Read): Authenticated users can SELECT matches where status is 'published' OR status is 'live'.
CREATE POLICY "Allow authenticated users to read published/live matches"
ON public.matches
FOR SELECT
TO authenticated
USING (status = 'published' OR status = 'live');

-- Policy 3 (Trackers Update Status): Trackers should be able to update status and description of 'live' or 'published' matches.
-- Note: This policy grants permission to update rows. Column-specific update permissions 
-- (e.g., allowing trackers to update only 'status' and 'description') would typically be managed 
-- via column-level privileges (`GRANT UPDATE(status, description) ON public.matches TO ...`) 
-- or by using an RPC function that performs partial updates. This RLS policy focuses on row selection.
CREATE POLICY "Allow trackers to update live/published matches"
ON public.matches
FOR UPDATE
TO authenticated
USING (public.get_user_role(auth.uid()) = 'tracker' AND (status = 'live' OR status = 'published'))
WITH CHECK (public.get_user_role(auth.uid()) = 'tracker' AND (status = 'live' OR status = 'published'));

-- Policy 4 (Creators can update/delete their own drafts): Users can only update/delete matches where created_by matches their auth.uid() AND status is 'draft'.
CREATE POLICY "Allow creators to update/delete their draft matches"
ON public.matches
FOR ALL
USING (auth.uid() = created_by AND status = 'draft')
WITH CHECK (auth.uid() = created_by AND status = 'draft');
