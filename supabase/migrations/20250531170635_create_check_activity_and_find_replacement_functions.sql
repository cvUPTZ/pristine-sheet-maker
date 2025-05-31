-- Migration to create functions for checking tracker activity and finding replacements.

-- Function to find an available tracker to replace an absent one for a given match.
CREATE OR REPLACE FUNCTION public.find_replacement_tracker(
    p_match_id UUID,
    p_absent_tracker_id UUID
)
RETURNS UUID -- The user_id of the replacement tracker, or NULL if none found.
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Description: Finds a potential replacement tracker for a given match and absent tracker.
--              It looks for users with a 'tracker' role who are not the absent tracker
--              and are not already assigned to the specified match.
-- Assumptions:
--   - A function public.get_user_role(user_id UUID) RETURNS TEXT exists to get a user's role.
--     If not, the role check part should be adjusted or removed.
--   - public.match_tracker_assignments table exists with match_id and tracker_id (user_id).
--   - auth.users table contains all potential users.
DECLARE
    replacement_user_id UUID;
BEGIN
    RAISE LOG 'find_replacement_tracker: Called for match_id=%, absent_tracker_id=%', p_match_id, p_absent_tracker_id;

    SELECT u.id
    INTO replacement_user_id
    FROM auth.users u
    LEFT JOIN public.match_tracker_assignments mta ON u.id = mta.tracker_id AND mta.match_id = p_match_id
    WHERE
        u.id != p_absent_tracker_id       -- Must not be the absent tracker
        AND mta.tracker_id IS NULL        -- Must not be currently assigned to this match
        AND public.get_user_role(u.id) = 'tracker' -- Must have the 'tracker' role (adjust if get_user_role doesn't exist)
        -- Add other criteria if needed, e.g., checking if the user is generally available
    ORDER BY random() -- Or any other logic for selection, e.g., least recently assigned, etc.
    LIMIT 1;

    IF replacement_user_id IS NOT NULL THEN
        RAISE LOG 'find_replacement_tracker: Found replacement % for absent tracker % in match %', replacement_user_id, p_absent_tracker_id, p_match_id;
    ELSE
        RAISE LOG 'find_replacement_tracker: No suitable replacement found for absent tracker % in match %', p_absent_tracker_id, p_match_id;
    END IF;

    RETURN replacement_user_id;
END;
$$;

COMMENT ON FUNCTION public.find_replacement_tracker(UUID, UUID)
IS 'Attempts to find an available user with the ''tracker'' role to replace an absent tracker for a specific match. Excludes the absent tracker and anyone already assigned to the match. Returns a user_id or NULL.';


-- Function to periodically check for inactive trackers in ongoing matches.
CREATE OR REPLACE FUNCTION public.check_tracker_activity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Description: Iterates through 'live' matches, checks for inactive assigned trackers,
--              and if an inactive tracker is found, attempts to find a replacement
--              and triggers the handle_tracker_absence process.
-- Assumptions:
--   - public.matches table has 'id' and 'status' (e.g., 'live' for ongoing).
--   - public.match_tracker_assignments has 'match_id' and 'tracker_id'.
--   - public.match_tracker_activity has 'match_id', 'user_id', 'last_active_at'.
--   - public.find_replacement_tracker(match_id, absent_tracker_id) function exists.
--   - public.handle_tracker_absence(absent_id, match_id, replacement_id) function exists.
DECLARE
    inactivity_threshold INTERVAL := '3 minutes'; -- Define how long before a tracker is considered inactive.
    active_match RECORD; -- Represents a match currently considered 'live' or 'in-progress'.
    assigned_tracker_record RECORD; -- Represents a tracker assigned to an active_match.
    tracker_activity_record RECORD; -- Activity record for an assigned tracker.
    replacement_id UUID;
BEGIN
    RAISE LOG 'check_tracker_activity: Function started at %', NOW();

    -- Loop through matches that are considered 'live' (or any relevant active status)
    FOR active_match IN
        SELECT id AS match_id
        FROM public.matches
        WHERE status = 'live' -- Adjust status based on your match lifecycle, e.g., 'published', 'started'
    LOOP
        RAISE LOG 'check_tracker_activity: Checking match_id=%', active_match.match_id;

        -- For each live match, find its assigned trackers
        FOR assigned_tracker_record IN
            SELECT tracker_id AS user_id -- tracker_id from assignments is the user_id
            FROM public.match_tracker_assignments
            WHERE match_id = active_match.match_id
        LOOP
            RAISE LOG 'check_tracker_activity: Checking tracker_id=% for match_id=%', assigned_tracker_record.user_id, active_match.match_id;

            -- Check the tracker's last activity for this specific match
            SELECT last_active_at
            INTO tracker_activity_record
            FROM public.match_tracker_activity
            WHERE match_id = active_match.match_id AND user_id = assigned_tracker_record.user_id;

            -- Condition for inactivity:
            -- 1. No record in match_tracker_activity (tracker_activity_record will be NULL or last_active_at IS NULL).
            -- 2. Record exists, but last_active_at is older than the threshold.
            IF tracker_activity_record IS NULL OR tracker_activity_record.last_active_at < (NOW() - inactivity_threshold) THEN
                RAISE LOG 'check_tracker_activity: Inactivity detected for tracker_id=% in match_id=%. Last active: %',
                    assigned_tracker_record.user_id, active_match.match_id, tracker_activity_record.last_active_at;

                -- Tracker is inactive, try to find a replacement.
                replacement_id := public.find_replacement_tracker(active_match.match_id, assigned_tracker_record.user_id);

                IF replacement_id IS NOT NULL THEN
                    RAISE LOG 'check_tracker_activity: Replacement found (new_tracker_id=%) for inactive tracker_id=% in match_id=%',
                        replacement_id, assigned_tracker_record.user_id, active_match.match_id;

                    -- A replacement was found, trigger the absence handling process.
                    -- This will typically send a notification to the replacement.
                    PERFORM public.handle_tracker_absence(
                        p_absent_tracker_user_id := assigned_tracker_record.user_id,
                        p_match_id := active_match.match_id,
                        p_replacement_tracker_user_id := replacement_id
                    );

                    -- Optional Next Steps (Advanced - requires careful transaction management):
                    -- 1. Update public.match_tracker_assignments:
                    --    Remove assignment for assigned_tracker_record.user_id for this match.
                    --    Add assignment for replacement_id for this match.
                    --    Example (conceptual, needs error handling and exact logic):
                    --    DELETE FROM public.match_tracker_assignments WHERE match_id = active_match.match_id AND tracker_id = assigned_tracker_record.user_id;
                    --    INSERT INTO public.match_tracker_assignments (match_id, tracker_id, ...) VALUES (active_match.match_id, replacement_id, ...);
                    --    RAISE LOG 'check_tracker_activity: Updated assignments for match_id=%: % replaced by %', active_match.match_id, assigned_tracker_record.user_id, replacement_id;

                    -- 2. Log this action in an audit table.

                ELSE
                    RAISE LOG 'check_tracker_activity: No replacement found for inactive tracker_id=% in match_id=%',
                        assigned_tracker_record.user_id, active_match.match_id;
                    -- Optionally, notify an admin if no replacement is available.
                END IF;
            ELSE
                 RAISE LOG 'check_tracker_activity: Tracker_id=% in match_id=% is active. Last active: %',
                    assigned_tracker_record.user_id, active_match.match_id, tracker_activity_record.last_active_at;
            END IF;
        END LOOP; -- End loop for assigned trackers
    END LOOP; -- End loop for active matches

    RAISE LOG 'check_tracker_activity: Function finished at %', NOW();
END;
$$;

COMMENT ON FUNCTION public.check_tracker_activity()
IS 'Periodically checks for inactive trackers in ''live'' matches. If an assigned tracker''s last_active_at (from match_tracker_activity) is beyond a threshold, it attempts to find a replacement using find_replacement_tracker and then calls handle_tracker_absence. Intended for cron job execution.';
