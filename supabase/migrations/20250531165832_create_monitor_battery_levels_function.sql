-- Function to monitor tracker battery levels and send notifications for low batteries.
CREATE OR REPLACE FUNCTION public.monitor_tracker_battery_levels()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Description: Checks the tracker_device_status table for devices with low battery
--              and creates a 'low_battery' notification for the user.
--              This function is intended to be run periodically by a scheduler (e.g., cron).
DECLARE
    low_battery_threshold INTEGER := 20; -- Define the battery level threshold (e.g., 20%)
    tracker_status RECORD;
    notification_title TEXT;
    notification_message TEXT;
    notification_data JSONB;
BEGIN
    FOR tracker_status IN
        SELECT user_id, battery_level
        FROM public.tracker_device_status
        WHERE battery_level IS NOT NULL AND battery_level < low_battery_threshold
    LOOP
        -- Construct title, message, and data for the notification
        notification_title := 'Low Battery Alert';
        notification_message := 'Your tracker''s battery is at ' || tracker_status.battery_level || '%. Please charge it soon.';
        notification_data := jsonb_build_object(
            'battery_level', tracker_status.battery_level,
            'tracker_user_id', tracker_status.user_id
            -- We use tracker_user_id here to be explicit that this data pertains to the user whose tracker has low battery
        );

        -- Check if an unread 'low_battery' notification for this user already exists
        -- This is a simple de-duplication to avoid spamming.
        -- More sophisticated de-duplication might involve checking timestamps or specific data payloads.
        IF NOT EXISTS (
            SELECT 1
            FROM public.notifications n
            WHERE n.user_id = tracker_status.user_id
            AND n.type = 'low_battery'
            AND n.is_read = FALSE
            -- Optional: Add a time constraint to re-notify after a certain period even if unread
            -- AND n.created_at > (NOW() - INTERVAL '24 hours')
        ) THEN
            -- Call the insert_notification function
            -- Note: p_match_id is NULL as this is not match-specific.
            PERFORM public.insert_notification(
                p_user_id := tracker_status.user_id,
                p_match_id := NULL,
                p_type := 'low_battery',
                p_title := notification_title,
                p_message := notification_message,
                p_data := notification_data
            );

            RAISE LOG 'Low battery notification sent to user % (Battery: %%)', tracker_status.user_id, tracker_status.battery_level;
        ELSE
            RAISE LOG 'Low battery notification for user % already exists and is unread. Skipping.', tracker_status.user_id;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.monitor_tracker_battery_levels()
IS 'Monitors tracker battery levels from tracker_device_status. If a tracker''s battery is below a defined threshold (currently 20%) and no recent unread low_battery notification exists for that user, it calls insert_notification to create a new alert.';
