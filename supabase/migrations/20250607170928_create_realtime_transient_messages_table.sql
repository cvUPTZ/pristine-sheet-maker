CREATE TABLE realtime_transient_messages (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    room_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    to_user_id UUID NULL, -- Nullable for broadcast messages
    message_type TEXT NOT NULL,
    payload JSONB NULL,
    CONSTRAINT fk_room FOREIGN KEY (room_id) REFERENCES voice_rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_receiver FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE SET NULL -- Optional: if receiver is deleted, set to_user_id to NULL
);

-- Add indexes for common query patterns
CREATE INDEX idx_realtime_transient_messages_room_id ON realtime_transient_messages(room_id);
CREATE INDEX idx_realtime_transient_messages_created_at ON realtime_transient_messages(created_at);

-- Enable RLS
ALTER TABLE realtime_transient_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow users to insert messages if they are the sender
CREATE POLICY "Users can insert their own messages"
ON realtime_transient_messages
FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- RLS Policy: Allow users to select messages intended for them, or broadcast messages in their rooms, or messages they sent
-- This policy relies on users being able to listen to postgres_changes on this table,
-- which is governed by the publication, but RLS still applies for direct SELECTs.
-- For Realtime, the key is that the user's role has SELECT privileges on the table,
-- and the `supabase_realtime` publication includes the table.
CREATE POLICY "Users can select relevant messages"
ON realtime_transient_messages
FOR SELECT
USING (
    -- User is the sender
    sender_id = auth.uid() OR
    -- User is the direct recipient
    to_user_id = auth.uid() OR
    -- Message is a broadcast (to_user_id is NULL) AND user is part of that room
    (
        to_user_id IS NULL AND
        EXISTS (
            SELECT 1 FROM voice_room_participants vrp
            WHERE vrp.room_id = realtime_transient_messages.room_id
            AND vrp.user_id = auth.uid()
        )
    )
);

-- Grant usage on sequence for id column if using BIGSERIAL and RLS (for insert)
-- This might be needed if RLS prevents default from working. Usually Supabase handles this.
-- GRANT USAGE, SELECT ON SEQUENCE realtime_transient_messages_id_seq TO authenticated;

-- Ensure the table is part of the supabase_realtime publication
-- This is usually handled automatically by Supabase when enabling Realtime for a table,
-- but can be made explicit if issues arise.
-- Example (run by an admin if needed, might not be necessary in migration):
-- ALTER PUBLICATION supabase_realtime ADD TABLE realtime_transient_messages;
