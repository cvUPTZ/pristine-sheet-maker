-- Create signaling_log table
CREATE TABLE signaling_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  room_id UUID,
  user_id UUID,
  event_type TEXT,
  payload JSONB,
  direction TEXT,
  CONSTRAINT fk_room_id FOREIGN KEY (room_id) REFERENCES voice_rooms(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  -- Using auth.users as it's the standard Supabase table for users.
  -- If a different table like 'profiles' is the primary user reference, this might need adjustment.
  -- For now, auth.users is a safe bet for user_id originating from JWT.
);

-- Add indexes for performance
CREATE INDEX idx_signaling_log_room_id ON signaling_log(room_id);
CREATE INDEX idx_signaling_log_user_id ON signaling_log(user_id);
CREATE INDEX idx_signaling_log_event_type ON signaling_log(event_type);
CREATE INDEX idx_signaling_log_created_at ON signaling_log(created_at);

-- RLS for signaling_log (optional, but good practice)
-- Only admins/coordinators should be able to view these logs for debugging.
ALTER TABLE signaling_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and coordinators can view signaling logs" ON signaling_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'coordinator')
    )
  );

-- No INSERT, UPDATE, DELETE policies for users directly.
-- These logs should ideally be written by a trusted service role or via the edge function if needed,
-- but the primary purpose is temporary debugging.
-- For now, we assume inserts will happen with a service role key if done server-side,
-- or not at all if it's just for Realtime event snooping.

COMMENT ON TABLE signaling_log IS 'Temporarily logs signaling messages for debugging purposes.';
COMMENT ON COLUMN signaling_log.room_id IS 'Reference to the voice room ID if the message is room-specific.';
COMMENT ON COLUMN signaling_log.user_id IS 'Reference to the user ID involved in the signaling event.';
COMMENT ON COLUMN signaling_log.event_type IS 'Type of signaling event (e.g., sdp_offer, ice_candidate).';
COMMENT ON COLUMN signaling_log.payload IS 'The actual signaling message content.';
COMMENT ON COLUMN signaling_log.direction IS 'Direction of the message (e.g., sent, received, broadcast).';
