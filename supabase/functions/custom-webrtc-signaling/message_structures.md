# WebRTC Signaling Message Structures

This document outlines the JSON structures for messages exchanged during WebRTC signaling. These messages are transmitted via the `realtime_transient_messages` table. The `message_type` column in the table stores the type of signaling event (e.g., "sdp_offer"), and the `payload` column stores the JSON object detailed below.

## Common Message Fields (in `realtime_transient_messages` table)

*   `room_id` (UUID): The ID of the voice room this message pertains to.
*   `sender_id` (UUID): The ID of the user sending the message (automatically set to `auth.uid()`).
*   `to_user_id` (UUID, nullable): The ID of the intended recipient. If `NULL`, the message is considered broadcast to all authorized participants in the room (excluding the sender, due to RLS and client-side filtering).
*   `message_type` (TEXT): A string indicating the type of WebRTC message.
*   `payload` (JSONB): The actual message content, structured as described below.

## WebRTC Message Payloads

### 1. SDP Offer (`message_type: "sdp_offer"`)
Sent by a peer to initiate a WebRTC connection with another peer (targeted message).
**Payload:**
```json
{
  "sdp": { "type": "offer", "sdp": "string" }
}
```
*   `sdp`: The RTCSessionDescriptionInit object for the offer.

### 2. SDP Answer (`message_type: "sdp_answer"`)
Sent by a peer in response to an SDP offer (targeted message).
**Payload:**
```json
{
  "sdp": { "type": "answer", "sdp": "string" }
}
```
*   `sdp`: The RTCSessionDescriptionInit object for the answer.

### 3. ICE Candidate (`message_type: "ice_candidate"`)
Sent by either peer to exchange network information (targeted message).
**Payload:**
```json
{
  "candidate": { /* RTCIceCandidateInit fields */ }
}
```
*   `candidate`: The RTCIceCandidateInit object (or `toJSON()` representation of an `RTCIceCandidate`).

### 4. Participant Mute Status (`message_type: "participant_mute_status"`)
Broadcast by a client when their mute state changes. `to_user_id` is `NULL`.
The `sender_id` of the message indicates which participant's mute status changed.
**Payload:**
```json
{
  "isMuted": boolean
}
```
*   `isMuted`: The new mute state of the sender.

### 5. Admin Set Mute Request (`message_type: "admin_set_mute_request"`)
Sent by an admin (via `moderate-webrtc-participant` Edge Function) to a specific client to instruct them to change their mute state (targeted message).
**Payload:**
```json
{
  "muted": boolean,       // The desired mute state (true for mute, false for unmute)
  "moderatorId": "string" // The userId of the admin/moderator who initiated the request
}
```

---
*Deprecated/Alternative Message Types (Consider if needed, current implementation uses presence for join/leave and specific mute messages):*

### User Joined (`message_type: "user_joined"`) - *Alternative/Informational*
Informational message indicating a new user has joined the room. Typically handled by Supabase Realtime Presence.
**Payload:**
```json
{
  "userId": "string",    // User ID of the joined user
  "userName": "string"   // (Optional) Display name of the joined user
}
```

### User Left (`message_type: "user_left"`) - *Alternative/Informational*
Informational message indicating a user has left the room. Typically handled by Supabase Realtime Presence.
**Payload:**
```json
{
  "userId": "string"     // User ID of the user who left
}
```

### Signaling Error (`message_type: "signaling_error"`) - *For future consideration*
Used to communicate errors that occur during the signaling process directly between peers if needed.
**Payload:**
```json
{
  "code": "number",      // (Optional) An error code
  "message": "string"    // A descriptive error message
}
```
---

## Usage Context

Clients will:
1.  Call the `custom-webrtc-signaling` Edge Function for initial authorization for a `roomId`.
2.  If authorized, subscribe to `postgres_changes` on the `realtime_transient_messages` table (filtered by `room_id`) to receive messages. RLS policies ensure they only receive relevant messages (broadcast or targeted to them, not their own).
3.  Send messages (offers, answers, ICE candidates, their own mute status) by inserting records into the `realtime_transient_messages` table. RLS policies enforce that `sender_id` is their own `auth.uid()` and they are authorized for the room.
4.  Admins can use the `moderate-webrtc-participant` Edge Function, which inserts an `admin-set-mute-request` message into the table, targeted at a specific user.

Presence (knowing who is "online" in a room) is handled by Supabase Realtime's presence feature on a separate channel (e.g., `presence:voice_room:<roomId>`).
The `user_joined` and `user_left` message types listed above are generally not used by the current `WebRTCManager` implementation, which relies on presence for these notifications. They are included for completeness if an explicit message-based system for join/leave is ever preferred.
The `sdp` and `candidate` payloads are structured to directly pass `RTCSessionDescriptionInit` and `RTCIceCandidateInit` like objects (or their `toJSON()` representations).
