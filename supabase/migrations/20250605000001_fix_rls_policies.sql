
-- Fix infinite recursion in voice_room_participants RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON voice_room_participants;
DROP POLICY IF EXISTS "Users can manage their own participation" ON voice_room_participants;
DROP POLICY IF EXISTS "Admins can manage all participants" ON voice_room_participants;

-- Create corrected policies without infinite recursion
CREATE POLICY "Users can view participants in rooms they can access" ON voice_room_participants
  FOR SELECT USING (
    -- Users can see their own participation
    user_id = auth.uid()
    OR
    -- Users can see participants in rooms they have access to through voice_rooms table
    EXISTS (
      SELECT 1 FROM voice_rooms vr
      WHERE vr.id = voice_room_participants.room_id
      AND (
        EXISTS (
          SELECT 1 FROM match_tracker_assignments mta
          WHERE mta.match_id = vr.match_id 
          AND mta.tracker_user_id = auth.uid()
        )
        OR 
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() 
          AND p.role IN ('admin', 'coordinator')
        )
      )
    )
  );

CREATE POLICY "Users can manage their own participation" ON voice_room_participants
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all participants" ON voice_room_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'coordinator')
    )
  );
