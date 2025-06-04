
-- Create voice_rooms table
CREATE TABLE voice_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_participants INTEGER DEFAULT 25,
  priority INTEGER DEFAULT 1,
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_private BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voice_room_participants table
CREATE TABLE voice_room_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES voice_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL,
  is_muted BOOLEAN DEFAULT true,
  is_speaking BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  connection_quality TEXT DEFAULT 'good',
  UNIQUE(room_id, user_id)
);

-- Add RLS policies
ALTER TABLE voice_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_room_participants ENABLE ROW LEVEL SECURITY;

-- Voice rooms policies
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

CREATE POLICY "Admins can manage voice rooms" ON voice_rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'coordinator')
    )
  );

-- Voice room participants policies
CREATE POLICY "Users can view participants in their rooms" ON voice_room_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM voice_room_participants vrp
      WHERE vrp.room_id = voice_room_participants.room_id 
      AND vrp.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'coordinator')
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

-- Add indexes for performance
CREATE INDEX idx_voice_rooms_match_id ON voice_rooms(match_id);
CREATE INDEX idx_voice_room_participants_room_id ON voice_room_participants(room_id);
CREATE INDEX idx_voice_room_participants_user_id ON voice_room_participants(user_id);
CREATE INDEX idx_voice_room_participants_last_activity ON voice_room_participants(last_activity);

-- Function to update last_activity
CREATE OR REPLACE FUNCTION update_participant_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_activity
CREATE TRIGGER update_voice_room_participants_activity
  BEFORE UPDATE ON voice_room_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_activity();
