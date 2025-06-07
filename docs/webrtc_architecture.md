# Self-Managed WebRTC Voice Collaboration Architecture

This document provides an overview of the self-managed WebRTC system implemented for real-time voice collaboration, replacing the previous LiveKit-based solution.

## Core Components

The system is built around several key components that work together to establish and manage WebRTC connections and signaling.

### 1. Client-Side WebRTC Management (`WebRTCManager.ts`)
- **Location:** `src/services/WebRTCManager.ts`
- **Purpose:** This class is the heart of the client-side WebRTC logic. It is responsible for:
    - Acquiring local audio media (microphone via `AudioManager`).
    - Managing `RTCPeerConnection` objects for each participant in a room.
    - Handling the creation of SDP offers and answers.
    - Exchanging ICE candidates.
    - Sending and receiving signaling messages via Supabase Realtime.
    - Interacting with Supabase Presence for participant discovery and status.
    - Providing callbacks to the UI layer (via `useVoiceCollaboration` hook) for events like participant joining/leaving, remote track additions, mute status changes, and errors.
    - Configuring STUN/TURN servers for NAT traversal.

### 2. UI Hook (`useVoiceCollaboration.ts`)
- **Location:** `src/hooks/useVoiceCollaboration.ts`
- **Purpose:** This React hook acts as a bridge between the `WebRTCManager` and the UI components (primarily `VoiceCollaboration.tsx`). It:
    - Initializes and manages the lifecycle of the `WebRTCManager` instance.
    - Subscribes to events from `WebRTCManager` and translates them into React state variables (e.g., participant lists, connection status, mute states, remote media streams).
    - Exposes functions to the UI for user actions like joining/leaving rooms and toggling mute.
    - Fetches available voice rooms from the Supabase database.

### 3. Signaling Mechanism
- **Technology:** Supabase Realtime and PostgreSQL.
- **Table:** `realtime_transient_messages`
    - This PostgreSQL table is central to the signaling process. WebRTC signaling messages (SDP offers/answers, ICE candidates, mute status updates, admin commands) are inserted as rows into this table.
    - Clients subscribe to `INSERT` events on this table using Supabase Realtime, filtered by `room_id`.
- **Row Level Security (RLS):**
    - **INSERT Policy:** Ensures users can only send messages for rooms they are authorized to be in (via `can_user_access_room_channel` SQL function) and that the `sender_id` of the message is their own `auth.uid()`.
    - **SELECT Policy:** Ensures users only receive messages for rooms they are authorized for. It filters messages so a client receives:
        - Broadcast messages (`to_user_id IS NULL`).
        - Messages specifically targeted to them (`to_user_id = auth.uid()`).
        - It also excludes messages sent by the user themselves.
- **Message Flow:**
    - When a client needs to send a signal (e.g., an SDP offer to `UserB`), `WebRTCManager` inserts a row into `realtime_transient_messages` with `to_user_id = UserB's ID`.
    - `UserB`'s client, subscribed to changes on this table for the current room, receives this new row via their Supabase Realtime subscription.
    - `WebRTCManager` on `UserB`'s client processes the message payload.

### 4. Authentication and Authorization
- **Edge Function:** `custom-webrtc-signaling`
    - **Location:** `supabase/functions/custom-webrtc-signaling/index.ts`
    - **Purpose:** Acts as a pre-flight check before a client attempts to join a room's signaling/presence channels.
    - `WebRTCManager.joinRoom()` calls this function first.
    - The function verifies the user's permissions against the `voice_rooms`, `profiles`, and `match_tracker_assignments` tables based on their JWT.
    - Returns `{ authorized: true }` or an error. It does not generate any special tokens.

### 5. Presence Management
- **Technology:** Supabase Realtime Presence.
- **Channels:** Clients subscribe to presence channels named like `presence:voice_room:<roomId>`.
- **Functionality:**
    - Each client tracks its own presence on the channel.
    - `WebRTCManager` listens to `sync`, `join`, and `leave` presence events.
    - These events trigger the creation or closure of `RTCPeerConnection` objects for remote participants.
    - Usernames are also typically exchanged via presence state.

### 6. Moderation (Admin Mute)
- **Edge Function:** `moderate-webrtc-participant`
    - **Location:** `supabase/functions/moderate-webrtc-participant/index.ts`
    - **Purpose:** Allows an authorized admin or coordinator to request a participant to mute or unmute.
    - **Workflow:**
        1. Admin client calls this Edge Function with `roomId`, `targetUserId`, and `mute` state.
        2. The function verifies the caller is an admin.
        3. It inserts an `'admin-set-mute-request'` message into `realtime_transient_messages`, targeted at `targetUserId`.
        4. The `targetUserId`'s `WebRTCManager` receives this message, applies the mute state to its local audio tracks, and then broadcasts its new mute status to all participants using a standard `'participant-mute-status'` message.

### 7. STUN/TURN Configuration
- **Location:** `src/config/voiceConfig.ts` (within `PRODUCTION_VOICE_CONFIG.iceServers`)
- **Current Setup:** Configured with public STUN servers:
    - `stun:stun.l.google.com:19302`
    - `stun:stun1.l.google.com:19302`
    - `stun:stun.services.mozilla.com`
- **TURN Server Recommendation:** For robust connectivity, especially in environments with symmetric NATs or restrictive firewalls, a TURN server is essential. The configuration includes a placeholder for TURN server credentials. These should be obtained from a TURN service provider (e.g., Twilio Network Traversal Service, Xirsys, or self-hosted coturn) and configured, ideally via environment variables, in `useVoiceCollaboration.ts` where `WebRTCManager` is initialized.

## Signaling Message Types
Refer to `supabase/functions/custom-webrtc-signaling/message_structures.md` for detailed JSON structures of messages like:
- `sdp-offer`
- `sdp-answer`
- `ice-candidate`
- `participant-mute-status`
- `admin-set-mute-request`

This self-managed architecture provides granular control over the WebRTC flow and leverages Supabase services for signaling, presence, and backend logic.
