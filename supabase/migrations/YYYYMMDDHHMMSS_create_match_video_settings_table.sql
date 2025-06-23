-- Create match_video_settings table
CREATE TABLE public.match_video_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
    video_url TEXT NOT NULL,
    video_title TEXT,
    video_description TEXT,
    duration_seconds INTEGER,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.match_video_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read video settings"
ON public.match_video_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin users to insert video settings"
ON public.match_video_settings
FOR INSERT
TO authenticated
WITH CHECK (get_user_role() = 'admin'); -- Assuming get_user_role() function exists

CREATE POLICY "Allow admin users or creators to update video settings"
ON public.match_video_settings
FOR UPDATE
TO authenticated
USING (get_user_role() = 'admin' OR auth.uid() = created_by)
WITH CHECK (get_user_role() = 'admin' OR auth.uid() = created_by);

CREATE POLICY "Allow admin users or creators to delete video settings"
ON public.match_video_settings
FOR DELETE
TO authenticated
USING (get_user_role() = 'admin' OR auth.uid() = created_by);

-- Trigger to update "updated_at" timestamp
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.match_video_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Add indexes
CREATE INDEX idx_match_video_settings_match_id ON public.match_video_settings(match_id);
CREATE INDEX idx_match_video_settings_created_by ON public.match_video_settings(created_by);

COMMENT ON TABLE public.match_video_settings IS 'Stores settings and metadata for YouTube videos associated with matches or general use.';
COMMENT ON COLUMN public.match_video_settings.match_id IS 'Optional link to a specific match.';
COMMENT ON COLUMN public.match_video_settings.video_url IS 'The full YouTube video URL.';
COMMENT ON COLUMN public.match_video_settings.video_title IS 'Title of the video, fetched or manually entered.';
COMMENT ON COLUMN public.match_video_settings.duration_seconds IS 'Duration of the video in seconds.';
COMMENT ON COLUMN public.match_video_settings.created_by IS 'User who created this video setting entry.';
