
-- Fix voice_rooms RLS policies to allow room creation

-- Drop existing policies for voice_rooms
DROP POLICY IF EXISTS "Users can view voice rooms for their matches" ON voice_rooms;
DROP POLICY IF EXISTS "Admins can manage voice rooms" ON voice_rooms;

-- Create new policies that allow proper INSERT operations
CREATE POLICY "Users can view voice rooms for their matches" ON voice_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM match_tracker_assignments mta
      WHERE mta.match_id = voice_rooms.match_id 
      AND mta.tracker_user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'coordinator')
    )
  );

-- Allow users with match access to create rooms for their matches
CREATE POLICY "Users can create voice rooms for their matches" ON voice_rooms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_tracker_assignments mta
      WHERE mta.match_id = voice_rooms.match_id 
      AND mta.tracker_user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'coordinator')
    )
  );

-- Allow admins and coordinators to manage all voice rooms
CREATE POLICY "Admins can manage all voice rooms" ON voice_rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'coordinator')
    )
  );

-- Allow users to update rooms for their matches
CREATE POLICY "Users can update voice rooms for their matches" ON voice_rooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM match_tracker_assignments mta
      WHERE mta.match_id = voice_rooms.match_id 
      AND mta.tracker_user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_tracker_assignments mta
      WHERE mta.match_id = voice_rooms.match_id 
      AND mta.tracker_user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'coordinator')
    )
  );
