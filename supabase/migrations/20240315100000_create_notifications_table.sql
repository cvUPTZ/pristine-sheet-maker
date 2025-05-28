-- supabase/migrations/20240315100000_create_notifications_table.sql

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE, -- Can be NULL if notification is not match-specific
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- Optional: Add comments to describe the table and columns
COMMENT ON TABLE public.notifications IS 'Stores notifications for users, such as match assignments.';
COMMENT ON COLUMN public.notifications.user_id IS 'The user who should receive the notification.';
COMMENT ON COLUMN public.notifications.match_id IS 'The match related to this notification, if applicable.';
COMMENT ON COLUMN public.notifications.message IS 'The content of the notification message.';
COMMENT ON COLUMN public.notifications.is_read IS 'Indicates whether the user has read the notification.';
