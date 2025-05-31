-- Create public.match_tracker_activity table
CREATE TABLE public.match_tracker_activity (
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_active_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (match_id, user_id)
);

COMMENT ON TABLE public.match_tracker_activity IS 'Tracks the last reported activity of a user (tracker) for a specific match. Used to determine if a tracker might be inactive or absent for a particular match.';
COMMENT ON COLUMN public.match_tracker_activity.match_id IS 'Foreign key referencing the match for which activity is tracked.';
COMMENT ON COLUMN public.match_tracker_activity.user_id IS 'Foreign key referencing the user (tracker) whose activity is tracked.';
COMMENT ON COLUMN public.match_tracker_activity.last_active_at IS 'Timestamp of the last recorded activity for this tracker in this match. Defaults to the current time on insert/update.';

-- Add indexes for performance, though the primary key already creates one.
-- Additional specific indexes might be useful depending on query patterns.
CREATE INDEX idx_match_tracker_activity_match_id ON public.match_tracker_activity(match_id);
CREATE INDEX idx_match_tracker_activity_user_id ON public.match_tracker_activity(user_id);
CREATE INDEX idx_match_tracker_activity_last_active_at ON public.match_tracker_activity(last_active_at);

-- Enable RLS for the table if needed, though activity updates might often be from trusted backend processes.
-- For now, let's add a basic RLS enabled state. Policies would depend on who updates this.
ALTER TABLE public.match_tracker_activity ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust as needed):
-- Allow service_role full access (typical for backend updates)
CREATE POLICY "Allow service_role full access on match_tracker_activity"
ON public.match_tracker_activity
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users (trackers) to update their own activity.
-- This assumes trackers will call an RPC function that uses their identity.
CREATE POLICY "Allow trackers to update their own activity"
ON public.match_tracker_activity
FOR ALL -- Using ALL for UPSERT behavior often done via RPC that specifies columns
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity
CREATE POLICY "Allow admin read access on match_tracker_activity"
ON public.match_tracker_activity
FOR SELECT
USING (public.get_user_role(auth.uid()) = 'admin');
-- Note: get_user_role is a hypothetical function, replace with actual role management if it exists.
-- If no such function, then admins might rely on service_role or specific user ID checks.

-- Create a function to update last_active_at on conflict (for UPSERTs)
-- This is often handled by the application logic calling upsert, but can be a trigger.
-- For this table, an UPSERT from the application with `last_active_at = NOW()` is probably simpler.
-- However, if direct UPDATEs are common and should always refresh last_active_at:
CREATE OR REPLACE FUNCTION public.update_match_tracker_activity_last_active_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_match_tracker_activity_last_active_at
BEFORE UPDATE ON public.match_tracker_activity
FOR EACH ROW
EXECUTE FUNCTION public.update_match_tracker_activity_last_active_at();

-- This trigger ensures that if a row is updated (e.g. even if no specific column is changed in an UPDATE statement),
-- the last_active_at is refreshed. This is useful if UPSERT operations are done as INSERT ... ON CONFLICT ... UPDATE.
-- If UPSERTs are direct `supabase.from(...).upsert(...)` calls from JS, the client usually provides the new `last_active_at`.
