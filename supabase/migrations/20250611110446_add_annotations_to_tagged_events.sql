ALTER TABLE public.tagged_events
ADD COLUMN annotations JSONB NULLABLE;

-- Optionally, you might want to add an index if you plan to query based on annotations,
-- though this is less common for JSONB unless specific paths within the JSON are queried.
-- Example: CREATE INDEX idx_tagged_events_annotations ON public.tagged_events USING GIN (annotations);
-- For now, skipping this index as typical use will be fetching annotations along with the event.
