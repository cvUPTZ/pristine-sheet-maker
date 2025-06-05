
-- Create the get_room_participant_count function
CREATE OR REPLACE FUNCTION get_room_participant_count(room_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    participant_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO participant_count
    FROM voice_room_participants
    WHERE room_id = room_id_param;
    
    RETURN COALESCE(participant_count, 0);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_room_participant_count(UUID) TO authenticated;
