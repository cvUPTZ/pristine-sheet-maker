# Custom WebRTC Signaling Edge Function

This Supabase Edge Function serves as an authorization gateway for clients attempting to join a WebRTC voice room. It verifies if a user has the necessary permissions to access a specific room before they attempt to subscribe to its Realtime signaling and presence channels.

## Setup Instructions

1.  **Environment Variables**:
    You **MUST** set the following environment variables in your Supabase project's Edge Function settings:
    *   `SUPABASE_URL`: Your Supabase project URL.
    *   `SUPABASE_ANON_KEY`: Your Supabase project Anon key.

2.  **CORS Configuration**:
    *   In `index.ts`, locate the `corsHeaders` object.
    *   Replace the placeholder `'*'` or specific example domain with the actual domain(s) of your frontend application that will be calling this function for security.

3.  **Caller Permissions & Database Tables**:
    *   The function relies on the `canUserAccessRoomChannel` internal helper, which queries:
        *   `voice_rooms`: To check room status (`is_active`), permissions array (`permissions`), and associated `match_id`.
        *   `profiles`: To get the caller's role (e.g., 'admin', 'coordinator', 'tracker').
        *   `match_tracker_assignments`: To verify if non-admin users are assigned to the match linked to the room.
    *   Ensure these tables exist, are populated correctly, and RLS policies allow the function (using the user's JWT context) to read necessary data.

## Function Usage

This function expects a POST request with a JSON body containing:
*   `roomId`: The UUID of the `voice_rooms` entry the user wishes to join.

The function requires the caller to be authenticated with Supabase, and their JWT must be included in the `Authorization: Bearer <token>` header. The `userId` is extracted from this JWT.

**Workflow**:
1.  Handles OPTIONS preflight requests.
2.  Validates that Supabase environment variables are set.
3.  Parses the request body for `roomId`.
4.  Authenticates the caller using the Supabase client.
5.  Calls the internal `canUserAccessRoomChannel` function to perform permission checks against the database.
6.  Returns an authorization status.

**Example Success Response (200 OK)**:
```json
{
  "authorized": true,
  "roomId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Example Failure Response (403 Forbidden)**:
```json
{
  "authorized": false,
  "error": "Access to this room channel is denied based on your current assignments and permissions.",
  "roomId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Other Error Responses**:
*   400 Bad Request: If `roomId` is missing.
*   401 Unauthorized: If the `Authorization` header is missing or the user is not authenticated.
*   500 Internal Server Error: For configuration issues or unexpected errors during database queries.

**Client-Side Integration**:
The client (`WebRTCManager.ts`) calls this function *before* attempting to subscribe to any Realtime channels for a room. If authorization is successful, the client proceeds to join the signaling and presence channels. This function does not return any tokens; it's a pre-flight check. The actual RLS on tables like `realtime_transient_messages` handles ongoing authorization for message sending/receiving.
