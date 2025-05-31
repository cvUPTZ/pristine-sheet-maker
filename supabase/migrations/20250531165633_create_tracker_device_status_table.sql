-- Create public.tracker_device_status table
CREATE TABLE public.tracker_device_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    battery_level INTEGER,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_id UNIQUE (user_id)
);

COMMENT ON TABLE public.tracker_device_status IS 'Stores the last reported status of tracker devices, like battery level.';
COMMENT ON COLUMN public.tracker_device_status.id IS 'Unique identifier for the status record.';
COMMENT ON COLUMN public.tracker_device_status.user_id IS 'Foreign key referencing the user who owns the tracker. Each user has one device status record.';
COMMENT ON COLUMN public.tracker_device_status.battery_level IS 'Reported battery percentage (e.g., 0-100).';
COMMENT ON COLUMN public.tracker_device_status.last_updated_at IS 'Timestamp when the status (e.g. battery level) was last reported.';
