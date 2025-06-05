# Moderate LiveKit Room Edge Function

This Supabase Edge Function allows authorized users (admins or coordinators) to mute or unmute the microphone track of a participant in a LiveKit room.

## Setup Instructions

1.  **Environment Variables**:
    You **MUST** set the following environment variables in your Supabase project's Edge Function settings:
    *   `LIVEKIT_URL`: The URL of your LiveKit server instance (e.g., `wss://your-project.livekit.cloud` or `https://your-livekit-host`).
    *   `LIVEKIT_API_KEY`: Your LiveKit API Key (starts with `API...`).
    *   `LIVEKIT_API_SECRET`: Your LiveKit API Secret.
    *   `SUPABASE_URL`: Your Supabase project URL.
    *   `SUPABASE_ANON_KEY`: Your Supabase project Anon key.

2.  **CORS Configuration**:
    *   In `index.ts`, locate the `corsHeaders` object.
    *   Replace the placeholder `'https://REPLACE_WITH_YOUR_ACTUAL_DOMAIN.com'` with the actual domain(s) of your frontend application that will be calling this function.

3.  **Caller Permissions**:
    *   The function checks if the calling user (authenticated via Supabase JWT in the `Authorization` header) has the role 'admin' or 'coordinator' by querying the `profiles` table.
    *   Ensure your `profiles` table has a `role` column and that your Row Level Security (RLS) policies allow authenticated users to read their own profile.

## Function Usage

This function expects a POST request with a JSON body containing:
*   `roomId`: The ID of the LiveKit room.
*   `targetIdentity`: The identity of the participant whose track is to be muted/unmuted.
*   `mute`: A boolean value (`true` to mute, `false` to unmute).

The function requires the caller to be authenticated with Supabase, and their JWT must be included in the `Authorization: Bearer <token>` header.

**Workflow**:
1.  Handles OPTIONS preflight requests.
2.  Validates that all required LiveKit and Supabase environment variables are set.
3.  Parses the request body for `roomId`, `targetIdentity`, and `mute`.
4.  Authenticates the caller using the Supabase client and checks if their role is 'admin' or 'coordinator'. If not, a 403 Forbidden error is returned.
5.  Initializes a LiveKit `RoomServiceClient`.
6.  Fetches the target participant's information from LiveKit.
7.  Finds the participant's microphone audio track.
8.  Calls `roomService.mutePublishedTrack()` to mute or unmute the track.
9.  Returns a success message or an error response.

**Example Success Response (200 OK)**:
```json
{
  "message": "Participant user123 audio track MT_abc123xyz muted"
}
```

**Example Error Responses**:
*   400 Bad Request: If required fields are missing.
*   401 Unauthorized: If the `Authorization` header is missing.
*   403 Forbidden: If the caller is not an admin or coordinator.
*   404 Not Found: If the participant or their audio track is not found in the room.
*   500 Internal Server Error: For configuration issues or unexpected errors during LiveKit API calls.
```json
{
  "error": "Specific error message here"
}
```
