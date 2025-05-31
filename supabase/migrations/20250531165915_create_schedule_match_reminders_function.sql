-- Function to schedule match reminders for upcoming matches.
CREATE OR REPLACE FUNCTION public.schedule_match_reminders()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Description: Checks for matches starting soon (e.g., in the next 30-35 minutes)
--              and sends a 'match_reminder' notification to assigned trackers if
--              a reminder hasn't been sent already.
--              This function is intended to be run periodically by a scheduler (e.g., cron every 5 minutes).
DECLARE
    upcoming_match RECORD;
    assigned_tracker RECORD;
    reminder_window_start INTERVAL := '30 minutes'; -- Start of the reminder window (e.g., matches starting in 30 mins)
    reminder_window_end INTERVAL := '35 minutes';   -- End of the reminder window (e.g., matches starting in no more than 35 mins)
    notification_title TEXT;
    notification_message TEXT;
    notification_data JSONB;
    match_start_time_text TEXT;
BEGIN
    RAISE LOG 'schedule_match_reminders: Function started at %', NOW();

    FOR upcoming_match IN
        SELECT id, name, match_date, status
        FROM public.matches
        WHERE
            status = 'published' -- Or any other status indicating an active, scheduled match
            AND match_date >= (NOW() + reminder_window_start)
            AND match_date < (NOW() + reminder_window_end)
    LOOP
        RAISE LOG 'schedule_match_reminders: Found upcoming match ID % (Name: %), scheduled at %', upcoming_match.id, upcoming_match.name, upcoming_match.match_date;

        -- Format match_date for the message and data
        -- Adjust format as needed, e.g., to include timezone or use a specific format.
        match_start_time_text := TO_CHAR(upcoming_match.match_date, 'YYYY-MM-DD HH24:MI TZ');

        FOR assigned_tracker IN
            SELECT tracker_id
            FROM public.match_tracker_assignments
            WHERE match_id = upcoming_match.id
        LOOP
            RAISE LOG 'schedule_match_reminders: Checking tracker ID % for match ID %', assigned_tracker.tracker_id, upcoming_match.id;

            -- Check if a 'match_reminder' for this user and match already exists
            IF NOT EXISTS (
                SELECT 1
                FROM public.notifications n
                WHERE n.user_id = assigned_tracker.tracker_id
                  AND n.match_id = upcoming_match.id
                  AND n.type = 'match_reminder'
                -- Optional: Add a time constraint if reminders could be re-sent after a long period
                -- AND n.created_at > (NOW() - INTERVAL '1 day')
            ) THEN
                notification_title := 'Match Reminder';
                notification_message := 'Match "' || COALESCE(upcoming_match.name, 'Unnamed Match') || '" is starting soon at ' || match_start_time_text || '.';
                notification_data := jsonb_build_object(
                    'match_id', upcoming_match.id,
                    'match_name', upcoming_match.name,
                    'start_time', upcoming_match.match_date -- Store full timestamp in data
                );

                PERFORM public.insert_notification(
                    p_user_id := assigned_tracker.tracker_id,
                    p_match_id := upcoming_match.id,
                    p_type := 'match_reminder',
                    p_title := notification_title,
                    p_message := notification_message,
                    p_data := notification_data
                );

                RAISE LOG 'schedule_match_reminders: Sent match_reminder to user % for match %', assigned_tracker.tracker_id, upcoming_match.id;
            ELSE
                RAISE LOG 'schedule_match_reminders: Match_reminder for user % and match % already exists. Skipping.', assigned_tracker.tracker_id, upcoming_match.id;
            END IF;
        END LOOP;
    END LOOP;
    RAISE LOG 'schedule_match_reminders: Function finished at %', NOW();
END;
$$;

COMMENT ON FUNCTION public.schedule_match_reminders()
IS 'Scans for ''published'' matches starting within a defined window (30-35 minutes from now). For each such match, it iterates through assigned trackers (from match_tracker_assignments) and sends a ''match_reminder'' notification if one has not already been sent for that user and match. Intended for cron job execution.';
