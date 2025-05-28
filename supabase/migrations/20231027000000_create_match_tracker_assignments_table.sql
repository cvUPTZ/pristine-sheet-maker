-- Create the match_tracker_assignments table
CREATE TABLE public.match_tracker_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    tracker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_player_id TEXT, -- For now, using TEXT. Could be an INTEGER if a global player ID system exists.
    assigned_event_types TEXT[], -- Array of event type strings
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create a function to update updated_at timestamp (if not already existing from other migrations)
-- Check if the function exists before creating to avoid errors if it's in another migration file.
-- This is a common utility, so it might exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;
    END IF;
END
$$;

-- Create a trigger that calls this function before any update on the match_tracker_assignments table
CREATE TRIGGER update_match_tracker_assignments_updated_at
BEFORE UPDATE ON public.match_tracker_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS for the table
ALTER TABLE public.match_tracker_assignments ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX idx_match_tracker_assignments_match_id ON public.match_tracker_assignments(match_id);
CREATE INDEX idx_match_tracker_assignments_tracker_id ON public.match_tracker_assignments(tracker_id);

-- RLS Policies:
-- 1. Admins: Can perform all operations.
--    (Assumes a function public.get_user_role(auth.uid()) EXISTS, as seen in other table policies)
CREATE POLICY "Allow admin full access on match_tracker_assignments"
ON public.match_tracker_assignments
FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin')
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- 2. Trackers: Can read their own assignments.
CREATE POLICY "Allow trackers to read their own assignments"
ON public.match_tracker_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = tracker_id);

-- 3. Trackers: Trackers should not be able to update or delete assignments directly.
--    Assignments are typically managed by an admin. If updates are needed, they could be through RPCs.
--    If trackers need to modify, specific policies for UPDATE/DELETE would be required.
--    For now, no explicit INSERT, UPDATE, DELETE for non-admins.

-- Example for allowing trackers to insert their own assignments IF that's a desired feature:
-- CREATE POLICY "Allow trackers to insert their own assignments"
-- ON public.match_tracker_assignments
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (auth.uid() = tracker_id AND public.get_user_role(auth.uid()) = 'tracker');
