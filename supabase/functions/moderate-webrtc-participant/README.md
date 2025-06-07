# Moderate WebRTC Participant Edge Function

This Supabase Edge Function allows authorized users (admins or coordinators) to send a mute or unmute request to a specific participant in a WebRTC voice room. The request is sent as a signaling message through the `realtime_transient_messages` table.

## Setup Instructions

1.  **Environment Variables**:
    You **MUST** set the following environment variables in your Supabase project's Edge Function settings:
    *   `SUPABASE_URL`: Your Supabase project URL.
    *   `SUPABASE_ANON_KEY`: Your Supabase project Anon key. (Or ensure service_role key is available if you modify the function to use it, though current version uses user context for permission check and then their context for insert).

2.  **CORS Configuration**:
    *   In `index.ts`, locate the `corsHeaders` object.
    *   Replace the placeholder `'*'` or specific example domain with the actual domain(s) of your frontend application that will be calling this function for security.

3.  **Caller Permissions**:
    *   The function checks if the calling user (authenticated via Supabase JWT in the `Authorization` header) has the role 'admin' or 'coordinator' by querying the `profiles` table.
    *   Ensure your `profiles` table has a `role` column and that your Row Level Security (RLS) policies allow authenticated users to read their own profile.

4.  **Table `realtime_transient_messages`**:
    *   This function inserts messages into the `realtime_transient_messages` table. Ensure this table exists with appropriate columns (`room_id`, `sender_id`, `to_user_id`, `message_type`, `payload`) and RLS policies.
    *   The `sender_id` of the inserted message will be the `auth.uid()` of the admin/coordinator calling this function.
    *   The `message_type` will be `'admin-set-mute-request'`.

## Function Usage

This function expects a POST request with a JSON body containing:
*   `roomId`: The ID of the voice room.
*   `targetUserId`: The ID of the participant to receive the mute/unmute request.
*   `mute`: A boolean value (`true` to request mute, `false` to request unmute).

The function requires the caller to be authenticated with Supabase, and their JWT must be included in the `Authorization: Bearer <token>` header.

**Workflow**:
1.  Handles OPTIONS preflight requests.
2.  Validates that Supabase environment variables are set.
3.  Parses the request body for `roomId`, `targetUserId`, and `mute`.
4.  Authenticates the caller using the Supabase client and checks if their role is 'admin' or 'coordinator'. If not, a 403 Forbidden error is returned.
5.  Constructs a signaling message with `message_type: 'admin-set-mute-request'`.
6.  Inserts the message into the `realtime_transient_messages` table, targeting the `targetUserId`.
7.  Returns a success message or an error response.

**Example Success Response (200 OK)**:
```json
{
  "message": "Moderation command (mute: true) sent to user user123 in room roomABC"
}
```

**Example Error Responses**:
*   400 Bad Request: If required fields are missing.
*   401 Unauthorized: If the `Authorization` header is missing.
*   403 Forbidden: If the caller is not an admin or coordinator.
*   500 Internal Server Error: For configuration issues or errors during message insertion.
```json
{
  "error": "Specific error message here"
}
```

**Client-Side Handling**:
The target client's `WebRTCManager` needs to listen for `'admin-set-mute-request'` messages on the signaling channel. Upon receiving such a message addressed to the local user, it should:
1.  (Optional) Verify the `sender_id` (the moderator) has appropriate permissions if further client-side validation is desired beyond the Edge Function's check.
2.  Apply the mute/unmute action to the local audio stream.
3.  Broadcast its new mute status to other participants in the room using a standard `'participant-mute-status'` message.
