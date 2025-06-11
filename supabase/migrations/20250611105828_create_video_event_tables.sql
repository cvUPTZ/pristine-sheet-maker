-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Event Types Table
CREATE TABLE public.event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT user_event_type_name_unique UNIQUE (user_id, name) -- Ensure user cannot have duplicate event type names
);

-- Add updated_at trigger for event_types
CREATE TRIGGER set_event_types_updated_at
BEFORE UPDATE ON public.event_types
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Add indexes for event_types
CREATE INDEX idx_event_types_user_id ON public.event_types(user_id);

-- RLS policies for event_types
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own event types"
ON public.event_types FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own event types"
ON public.event_types FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event types"
ON public.event_types FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event types"
ON public.event_types FOR DELETE
USING (auth.uid() = user_id);


-- Tagged Events Table
CREATE TABLE public.tagged_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_job_id UUID NOT NULL REFERENCES public.video_jobs(id) ON DELETE CASCADE, -- Assuming video_jobs table exists
    event_type_id UUID NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
    "timestamp" FLOAT NOT NULL, -- Using "timestamp" in quotes as timestamp is a reserved keyword
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add updated_at trigger for tagged_events
CREATE TRIGGER set_tagged_events_updated_at
BEFORE UPDATE ON public.tagged_events
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Add indexes for tagged_events
CREATE INDEX idx_tagged_events_video_job_id ON public.tagged_events(video_job_id);
CREATE INDEX idx_tagged_events_event_type_id ON public.tagged_events(event_type_id);

-- RLS policies for tagged_events
-- For tagged_events, RLS might depend on whether users can see tags on videos they don't "own" but have access to the video_job.
-- This policy assumes users can manage tags for video_jobs they are associated with (e.g., via the user_id on video_jobs table).
-- For simplicity, we'll first assume that a user who can see a video_job can see its tags.
-- And a user can only create/update/delete tags if they own the associated event_type (and thus the video_job through some linkage).
-- This might need refinement based on the actual structure of video_jobs and user permissions.

ALTER TABLE public.tagged_events ENABLE ROW LEVEL SECURITY;

-- Users need to be able to see tagged_events if they can see the event_type.
-- And they need to be able to see the video_job. Assuming video_jobs has a user_id or similar RLS.
CREATE POLICY "Users can view tagged events for their event types"
ON public.tagged_events FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.event_types et
    WHERE et.id = event_type_id AND et.user_id = auth.uid()
  )
  -- AND EXISTS ( SELECT 1 FROM public.video_jobs vj WHERE vj.id = video_job_id AND vj.user_id = auth.uid() ) -- If video_jobs also has RLS based on user_id
);

CREATE POLICY "Users can insert tagged events for their event types"
ON public.tagged_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.event_types et
    WHERE et.id = event_type_id AND et.user_id = auth.uid()
  )
  -- AND EXISTS ( SELECT 1 FROM public.video_jobs vj WHERE vj.id = video_job_id AND vj.user_id = auth.uid() )
);

CREATE POLICY "Users can update their own tagged events"
ON public.tagged_events FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.event_types et
    WHERE et.id = event_type_id AND et.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.event_types et
    WHERE et.id = event_type_id AND et.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own tagged events"
ON public.tagged_events FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.event_types et
    WHERE et.id = event_type_id AND et.user_id = auth.uid()
  )
);

-- Note: The RLS for tagged_events assumes that access to `event_types` implies the right to manage tags.
-- If `video_jobs` table has its own `user_id` and RLS, the policies for `tagged_events`
-- should also likely check ownership or access rights to the `video_job_id`.
-- For example, a user might be able to see a video job (and its tags) shared with them,
-- but only create tags if they also "own" the event type being used.
-- The current RLS for SELECT on tagged_events is restrictive: users can only see tags they created (via event_type_id).
-- If tags should be visible to anyone who can see the video_job, the SELECT policy would need to be broader,
-- potentially checking against `video_jobs.user_id` or a sharing mechanism.
-- For now, these policies link tagged_event permissions to event_type permissions.
-- Also, ensure `video_jobs` table exists and has appropriate RLS policies.
-- If `video_jobs` doesn't have a `user_id` column or RLS based on `auth.uid()`,
-- the commented out `AND EXISTS (...)` conditions for `video_jobs` would need adjustment.

-- Grant usage on schema and all tables in schema for anon and authenticated roles if needed by RLS
-- GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated; -- Adjust as necessary
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon; -- Adjust as necessary
