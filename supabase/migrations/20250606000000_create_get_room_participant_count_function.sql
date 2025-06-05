CREATE OR REPLACE FUNCTION get_room_participant_count(room_id_param UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM voice_room_participants WHERE room_id = room_id_param;
$$;
