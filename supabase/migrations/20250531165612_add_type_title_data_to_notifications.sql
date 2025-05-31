-- Add new columns to public.notifications table

ALTER TABLE public.notifications
ADD COLUMN type TEXT, -- Stores the category of the notification (e.g., 'low_battery', 'match_reminder', 'tracker_absence')
ADD COLUMN title TEXT, -- Stores the notification's title
ADD COLUMN data JSONB; -- Stores specific JSON data relevant to the notification type

COMMENT ON COLUMN public.notifications.type IS 'Stores the category of the notification (e.g., ''low_battery'', ''match_reminder'', ''tracker_absence'')';
COMMENT ON COLUMN public.notifications.title IS 'Stores the notification''s title';
COMMENT ON COLUMN public.notifications.data IS 'Stores specific JSON data relevant to the notification type (e.g., {"battery_level": 15} for ''low_battery'')';
