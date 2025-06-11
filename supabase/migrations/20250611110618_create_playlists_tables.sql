-- Playlists Table
CREATE TABLE public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_job_id UUID NOT NULL REFERENCES public.video_jobs(id) ON DELETE CASCADE, -- Assuming video_jobs table exists
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT user_video_playlist_name_unique UNIQUE (user_id, video_job_id, name)
);

-- Add updated_at trigger for playlists
-- Assumes public.trigger_set_timestamp() function already exists from previous migrations
CREATE TRIGGER set_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Add indexes for playlists
CREATE INDEX idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX idx_playlists_video_job_id ON public.playlists(video_job_id);

-- RLS policies for playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own playlists"
ON public.playlists FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists"
ON public.playlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
ON public.playlists FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
ON public.playlists FOR DELETE
USING (auth.uid() = user_id);


-- Playlist Items Table
CREATE TABLE public.playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    tagged_event_id UUID NOT NULL REFERENCES public.tagged_events(id) ON DELETE CASCADE,
    item_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT playlist_item_order_unique UNIQUE (playlist_id, item_order),
    CONSTRAINT playlist_tagged_event_unique UNIQUE (playlist_id, tagged_event_id)
);

-- Add updated_at trigger for playlist_items
CREATE TRIGGER set_playlist_items_updated_at
BEFORE UPDATE ON public.playlist_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Add indexes for playlist_items
CREATE INDEX idx_playlist_items_playlist_id ON public.playlist_items(playlist_id);
CREATE INDEX idx_playlist_items_tagged_event_id ON public.playlist_items(tagged_event_id);
CREATE INDEX idx_playlist_items_item_order ON public.playlist_items(item_order);

-- RLS policies for playlist_items
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Users can manage playlist items if they own the parent playlist.
CREATE POLICY "Users can view items in their own playlists"
ON public.playlist_items FOR SELECT
USING (EXISTS (
    SELECT 1
    FROM public.playlists p
    WHERE p.id = playlist_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can insert items into their own playlists"
ON public.playlist_items FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.playlists p
    WHERE p.id = playlist_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update items in their own playlists"
ON public.playlist_items FOR UPDATE
USING (EXISTS (
    SELECT 1
    FROM public.playlists p
    WHERE p.id = playlist_id AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.playlists p
    WHERE p.id = playlist_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete items from their own playlists"
ON public.playlist_items FOR DELETE
USING (EXISTS (
    SELECT 1
    FROM public.playlists p
    WHERE p.id = playlist_id AND p.user_id = auth.uid()
));

-- Ensure video_jobs and tagged_events tables exist and have appropriate RLS.
-- The RLS for playlist_items depends on the RLS of the playlists table.
-- If a user has access to a playlist, they have access to its items.
