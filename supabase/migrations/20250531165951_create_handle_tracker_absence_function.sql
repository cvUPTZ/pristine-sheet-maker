-- Function to handle tracker absence and notify a replacement.
-- This is currently a placeholder function. The logic for detecting absence
-- and selecting a replacement tracker is assumed to be handled externally.
CREATE OR REPLACE FUNCTION public.handle_tracker_absence(
    p_absent_tracker_user_id UUID,
    p_match_id UUID,
    p_replacement_tracker_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Assuming this will be called by a trusted backend process or trigger.
AS $$
-- Description: Placeholder function to process a tracker's absence for a match.
--              Currently, its main role is to notify the designated replacement tracker.
--              The actual detection of absence and selection of a replacement is external.
-- Parameters:
--   p_absent_tracker_user_id: The user_id of the tracker who is absent.
--   p_match_id: The match_id for which the tracker is absent.
--   p_replacement_tracker_user_id: The user_id of the tracker assigned as a replacement.
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_data JSONB;
BEGIN
    RAISE LOG 'handle_tracker_absence: Function called with absent_tracker: %, match: %, replacement_tracker: %',
        p_absent_tracker_user_id, p_match_id, p_replacement_tracker_user_id;

    -- Validate input parameters
    IF p_absent_tracker_user_id IS NULL OR p_match_id IS NULL OR p_replacement_tracker_user_id IS NULL THEN
        RAISE WARNING 'handle_tracker_absence: All parameters (absent_tracker_user_id, match_id, replacement_tracker_user_id) must be provided. Skipping execution.';
        RETURN;
    END IF;

    -- Notify the replacement tracker
    notification_title := 'Replacement Assignment'; -- Changed title to be more direct for the recipient
    notification_message := 'You have been assigned as a replacement for match ' || p_match_id ||
                            ' because tracker ' || p_absent_tracker_user_id || ' is unavailable.';
    -- In a future version, one might fetch match name or tracker names if available and desired.
    -- For example: 'Tracker ' || (SELECT name FROM users WHERE id = p_absent_tracker_user_id) || ' is unavailable...'

    notification_data := jsonb_build_object(
        'match_id', p_match_id,
        'absent_tracker_id', p_absent_tracker_user_id,
        'replacement_tracker_id', p_replacement_tracker_user_id,
        'reason', 'Tracker absence reported.' -- Generic reason
    );

    PERFORM public.insert_notification(
        p_user_id := p_replacement_tracker_user_id,
        p_match_id := p_match_id,
        p_type := 'tracker_absence', -- Notification type indicating a replacement scenario
        p_title := notification_title,
        p_message := notification_message,
        p_data := notification_data
    );

    RAISE LOG 'handle_tracker_absence: Notification sent to replacement tracker % for match % due to absence of %.',
        p_replacement_tracker_user_id, p_match_id, p_absent_tracker_user_id;

    -- Future considerations (out of scope for this placeholder):
    -- 1. Update match_tracker_assignments: Unassign p_absent_tracker_user_id and assign p_replacement_tracker_user_id.
    --    This would likely involve more complex logic, possibly another function.
    -- 2. Notify admins: Send a notification to an admin group or specific admin users.
    --    (e.g., PERFORM public.insert_notification(admin_user_id, p_match_id, 'admin_alert', ...))
    -- 3. Notify the absent tracker: Inform them that a replacement has been arranged (optional).

END;
$$;

COMMENT ON FUNCTION public.handle_tracker_absence(UUID, UUID, UUID)
IS 'Placeholder function to manage tracker absence. Takes absent tracker ID, match ID, and replacement tracker ID. Currently, its primary action is to send a "tracker_absence" notification to the replacement tracker. Logic for absence detection and replacement selection is external. Future enhancements could include updating assignments and notifying admins.';
