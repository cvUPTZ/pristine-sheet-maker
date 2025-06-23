-- Create video_tracker_assignments table
CREATE TABLE public.video_tracker_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_video_id uuid NOT NULL REFERENCES public.match_video_settings(id) ON DELETE CASCADE,
    tracker_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_event_types JSONB, -- Example: ["pass", "shot", "foul"] or can be TEXT[]
    status TEXT DEFAULT 'pending', -- e.g., 'pending', 'active', 'completed', 'cancelled'
    assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.video_tracker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow assigned trackers or admins to read their assignments"
ON public.video_tracker_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = tracker_id OR get_user_role() = 'admin');

CREATE POLICY "Allow admin users to insert assignments"
ON public.video_tracker_assignments
FOR INSERT
TO authenticated
WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Allow admin users or assigners to update assignments"
ON public.video_tracker_assignments
FOR UPDATE
TO authenticated
USING (get_user_role() = 'admin' OR auth.uid() = assigned_by)
WITH CHECK (get_user_role() = 'admin' OR auth.uid() = assigned_by);

CREATE POLICY "Allow admin users or assigners to delete assignments"
ON public.video_tracker_assignments
FOR DELETE
TO authenticated
USING (get_user_role() = 'admin' OR auth.uid() = assigned_by);

-- Add indexes
CREATE INDEX idx_video_tracker_assignments_match_video_id ON public.video_tracker_assignments(match_video_id);
CREATE INDEX idx_video_tracker_assignments_tracker_id ON public.video_tracker_assignments(tracker_id);
CREATE INDEX idx_video_tracker_assignments_assigned_by ON public.video_tracker_assignments(assigned_by);

COMMENT ON TABLE public.video_tracker_assignments IS 'Assigns trackers to specific videos for event tracking.';
COMMENT ON COLUMN public.video_tracker_assignments.match_video_id IS 'Link to the video being tracked.';
COMMENT ON COLUMN public.video_tracker_assignments.tracker_id IS 'The user (tracker) assigned to this task.';
COMMENT ON COLUMN public.video_tracker_assignments.assigned_event_types IS 'Specific event types the tracker is responsible for, if any.';
COMMENT ON COLUMN public.video_tracker_assignments.status IS 'Current status of the assignment.';
COMMENT ON COLUMN public.video_tracker_assignments.assigned_by IS 'User who made this assignment.';
