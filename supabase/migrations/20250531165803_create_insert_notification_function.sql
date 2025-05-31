-- Function to insert a new notification
CREATE OR REPLACE FUNCTION public.insert_notification(
    p_user_id UUID,
    p_match_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT NULL -- Default to NULL if no data is provided
)
RETURNS VOID -- Or can return the ID of the new notification if preferred: RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER -- Or SECURITY DEFINER if specific context requires it, be cautious.
AS $$
-- Description: Inserts a new row into the public.notifications table.
-- Parameters:
--   p_user_id: The ID of the user to whom the notification belongs.
--   p_match_id: The ID of the match related to this notification (can be NULL).
--   p_type: The type or category of the notification (e.g., 'low_battery', 'match_reminder').
--   p_title: The title of the notification.
--   p_message: The main message content of the notification.
--   p_data: Additional JSONB data specific to the notification type.
BEGIN
    INSERT INTO public.notifications (
        user_id,
        match_id,
        type,
        title,
        message,
        data
        -- id, created_at, is_read will use their default values
    ) VALUES (
        p_user_id,
        p_match_id,
        p_type,
        p_title,
        p_message,
        p_data
    );
END;
$$;

COMMENT ON FUNCTION public.insert_notification(UUID, UUID, TEXT, TEXT, TEXT, JSONB)
IS 'Inserts a new notification into the public.notifications table. Parameters: p_user_id, p_match_id, p_type, p_title, p_message, p_data.';
