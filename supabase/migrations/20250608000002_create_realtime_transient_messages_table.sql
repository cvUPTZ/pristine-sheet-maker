-- Drop existing table if it exists, to handle changes in primary key type or fundamental structure.
-- This is suitable for development environments. For production, a more careful ALTER TABLE approach would be needed.
DROP TABLE IF EXISTS realtime_transient_messages;

-- Create a table to route Realtime messages through for RLS enforcement on SEND.
-- Messages in this table are intended to be transient and primarily for signaling.
CREATE TABLE realtime_transient_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    room_id UUID NOT NULL REFERENCES public.voice_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for broadcast
    message_type TEXT NOT NULL, -- e.g., 'sdp-offer', 'ice-candidate', 'mute-status'
    payload JSONB NOT NULL, -- The actual message content (SDP, ICE, etc.)

    CONSTRAINT check_sender_is_not_target CHECK (sender_id <> to_user_id OR to_user_id IS NULL) -- A user cannot send a targeted message to themselves.
);

-- Enable RLS
ALTER TABLE realtime_transient_messages ENABLE ROW LEVEL SECURITY;

-- Policies:
-- 1. Users can INSERT messages into rooms they are authorized for, and only as themselves.
CREATE POLICY "Enable insert for authorized users"
    ON realtime_transient_messages
    FOR INSERT
    WITH CHECK (
        can_user_access_room_channel(auth.uid(), room_id) AND
        auth.uid() = sender_id -- Ensures the sender is the authenticated user
    );

-- 2. Users can SELECT messages from rooms they are authorized for.
--    This includes broadcast messages or messages targeted to them.
--    It also prevents users from selecting messages they themselves sent (as WebRTCManager handles this).
CREATE POLICY "Enable select for authorized users in the room"
    ON realtime_transient_messages
    FOR SELECT
    USING (
        can_user_access_room_channel(auth.uid(), room_id) AND
        (to_user_id IS NULL OR to_user_id = auth.uid()) AND
        sender_id != auth.uid() -- Do not select own messages (client already filters, but good DB practice)
    );

-- Note: No UPDATE or DELETE policies are typically needed for transient messages by clients.
-- Admins/system might need them, which can be handled by bypassing RLS or specific admin policies.

-- Indexes
CREATE INDEX idx_realtime_transient_messages_room_id ON realtime_transient_messages(room_id);
CREATE INDEX idx_realtime_transient_messages_sender_id ON realtime_transient_messages(sender_id);
CREATE INDEX idx_realtime_transient_messages_to_user_id ON realtime_transient_messages(to_user_id);
CREATE INDEX idx_realtime_transient_messages_created_at ON realtime_transient_messages(created_at);
CREATE INDEX idx_realtime_transient_messages_message_type ON realtime_transient_messages(message_type);


COMMENT ON TABLE realtime_transient_messages IS
'Table for routing client-sent Realtime messages for WebRTC. RLS policies control send/receive permissions. Messages are ideally transient.';
COMMENT ON COLUMN realtime_transient_messages.room_id IS 'The voice room (channel) the message is for.';
COMMENT ON COLUMN realtime_transient_messages.sender_id IS 'The user_id (from profiles table, matching auth.uid()) of the sender.';
COMMENT ON COLUMN realtime_transient_messages.to_user_id IS 'The user_id (from profiles table) of the intended recipient. NULL for broadcast messages.';
COMMENT ON COLUMN realtime_transient_messages.message_type IS 'Type of message (e.g., sdp-offer, ice-candidate, mute-status).';
COMMENT ON COLUMN realtime_transient_messages.payload IS 'The JSONB message content.';
COMMENT ON CONSTRAINT check_sender_is_not_target ON realtime_transient_messages IS 'Prevents a user from sending a targeted message to themselves.';

-- The can_user_access_room_channel(UUID, UUID) function is defined in
-- 20250608000001_create_can_user_access_room_channel_function.sql and is assumed to be available.
-- It checks if a user (auth.uid()) has access to a given room_id.
-- This function is crucial for both INSERT and SELECT RLS policies.
--
-- Client-side logic for Supabase Realtime subscription:
-- To listen for messages IN THIS ROOM relevant to the CURRENT USER:
-- supabase.channel('custom-channel-name-for-this-room')
--  .on('postgres_changes', {
--    event: 'INSERT',
--    schema: 'public',
--    table: 'realtime_transient_messages',
--    filter: `room_id=eq.${currentRoomId}` // RLS policy further filters this server-side
--  }, payload => { /* handle payload.new */ })
--  .subscribe()
--
-- The RLS policy `Enable select for authorized users in the room` ensures that:
-- 1. The user is part of the room (`can_user_access_room_channel`).
-- 2. They only get messages meant for them (`to_user_id = auth.uid()`) OR broadcast messages (`to_user_id IS NULL`).
-- 3. They do not get their own sent messages (`sender_id != auth.uid()`).
--
-- Client-side sending a message:
-- supabase.from('realtime_transient_messages').insert({
--   room_id: currentRoomId,
--   to_user_id: targetUserId, // or null for broadcast
--   message_type: 'sdp-offer',
--   payload: { sdp: '...' }
--   // sender_id will be auth.uid() by default due to table default and RLS check.
-- })
-- The RLS policy `Enable insert for authorized users` ensures that:
-- 1. The user is part of the room.
-- 2. The sender_id in the record matches the authenticated user.
-- This prevents spoofing sender_id.
--
-- If `profiles.id` is not directly `auth.uid()` but is linked, ensure `sender_id` default and RLS use the correct ID.
-- Assuming `profiles.id` is the UUID that matches `auth.uid()`.
-- If `AudioManager` or other parts of the application use `auth.users.id` directly, ensure consistency or map as needed.
-- The `custom-webrtc-signaling` Edge Function also uses `auth.uid()` and then queries `profiles` table with this ID.
-- So, referencing `profiles(id)` for `sender_id` and `to_user_id` should align.
-- The `default auth.uid()` for `sender_id` assumes `profiles.id` is indeed the same as `auth.uid()`.
-- This is a common setup: `CREATE TABLE profiles (id uuid references auth.users(id) primary key, ...);`
-- If `profiles.id` is an auto-incrementing integer or different UUID, this needs adjustment.
-- Current project structure (e.g. `canUserJoinRoom` in `generate-livekit-token`) uses `profiles.id = userId (auth.uid())`.
-- So, `sender_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE` is correct under this assumption.
