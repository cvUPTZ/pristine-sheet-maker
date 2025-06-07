CREATE OR REPLACE FUNCTION can_user_access_room_channel(user_id_in UUID, room_id_in UUID)
RETURNS BOOLEAN AS $$
DECLARE
    room_details RECORD;
    user_profile RECORD;
    assignment_exists BOOLEAN;
BEGIN
    -- 1. Fetch the room details
    SELECT match_id, permissions, is_private, is_active
    INTO room_details
    FROM public.voice_rooms
    WHERE id = room_id_in;

    IF NOT FOUND THEN
        RAISE WARNING 'Room not found: %', room_id_in;
        RETURN FALSE;
    END IF;

    IF NOT room_details.is_active THEN
        RAISE WARNING 'Room not active: %', room_id_in;
        RETURN FALSE;
    END IF;

    -- 2. Fetch user's profile
    SELECT role
    INTO user_profile
    FROM public.profiles
    WHERE id = user_id_in;

    IF NOT FOUND THEN
        RAISE WARNING 'User profile not found: %', user_id_in;
        RETURN FALSE; -- Or handle based on public room logic if any
    END IF;

    -- 3. Check admin/coordinator direct access
    IF user_profile.role IN ('admin', 'coordinator') THEN
        RETURN TRUE;
    END IF;

    -- 4. Check room permissions array (e.g., for roles like 'tracker', 'player')
    --    and also if room allows 'all' authenticated users.
    IF room_details.permissions IS NOT NULL AND
       (user_profile.role = ANY(room_details.permissions) OR 'all' = ANY(room_details.permissions)) THEN
        -- This logic might need refinement as in the Edge Function.
        -- If userRole is in permissions, are they allowed, or do we still need match assignment check?
        -- For now, if role matches or 'all' is present, assume access.
        RETURN TRUE;
    END IF;

    -- 5. Check if user is assigned to the match associated with the room
    IF room_details.match_id IS NULL THEN
        RAISE WARNING 'Room not associated with a match: %', room_id_in;
        RETURN FALSE; -- Room misconfiguration or public room without 'all' permission
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.match_tracker_assignments mta
        WHERE mta.match_id = room_details.match_id
        AND mta.tracker_user_id = user_id_in
    ) INTO assignment_exists;

    IF assignment_exists THEN
        RETURN TRUE;
    END IF;

    RAISE WARNING 'Access denied for user % to room % based on assignments and permissions.', user_id_in, room_id_in;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test function (example, run manually in SQL editor or via a test script)
-- SELECT can_user_access_room_channel('user-uuid-here', 'room-uuid-here');

COMMENT ON FUNCTION can_user_access_room_channel(UUID, UUID) IS
'Checks if a given user has permissions to access (join/send messages to) a specific voice room channel. Logic should mirror Edge Function auth.';
