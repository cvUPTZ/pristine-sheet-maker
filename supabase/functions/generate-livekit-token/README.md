# Generate LiveKit Token Edge Function

This Supabase Edge Function generates a JWT token for authenticating a client with a LiveKit room.

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
    *   Replace the placeholder `'https://REPLACE_WITH_YOUR_ACTUAL_DOMAIN.com'` with the actual domain(s) of your frontend application that will be calling this function. For multiple domains, you might need to dynamically check the `Origin` header against an allowlist and set `Access-Control-Allow-Origin` accordingly, or configure a broader policy if appropriate for your use case.

3.  **Permission Logic (`canUserJoinRoom` function)**:
    *   The `index.ts` file includes a helper function `canUserJoinRoom(supabaseClient, userId, roomId)` to check if a user is authorized to join a specific LiveKit room. This function now also returns the user's role and full name if found.
    *   **Review and customize this function thoroughly.** The provided example includes checks against:
        *   Room details (`voice_rooms` table: `permissions`, `is_private`, `match_id`).
        *   User's profile (`profiles` table: `role`, `full_name`). It's assumed your `profiles` table has a `full_name` column (or similar) for the user's display name. Adjust if your schema differs.
        *   Admin/Coordinator direct access.
        *   Room permissions array (`all` or specific roles).
        *   User's assignment to the match associated with the room (`match_tracker_assignments` table).
    *   This logic should align with your application's specific authorization rules and Row Level Security (RLS) policies on the relevant tables.

4.  **Local Development (Optional)**:
    *   If you are developing locally using `supabase functions serve`, Deno will attempt to fetch the `livekit-server-sdk` from the ESM URL provided in the import statement. Ensure your local Deno environment has internet access.
    *   No separate installation of `livekit-server-sdk` is needed for deployment, as Supabase Edge Functions handle URL imports directly.

## Function Usage

This function expects a POST request with a JSON body containing:
*   `roomId`: The ID of the LiveKit room the user wants to join (should correspond to an ID in your `voice_rooms` table).
*   `participantIdentity`: The unique identity of the participant (should be the authenticated Supabase User ID).
*   `participantName` (optional): A display name for the participant in the LiveKit room. If not provided, the function will attempt to use the `full_name` from the user's Supabase profile. If that's also unavailable, it defaults to `participantIdentity`.
*   `participantMetadata` (optional, but now auto-populated by function): While the client can still send this, the function now automatically includes `userRole` in the LiveKit token's metadata if the user's role is successfully fetched from their profile. Any client-sent `participantMetadata` string will be overridden by this server-generated metadata. For more complex client-side metadata, the function would need to be adjusted to merge them.

The function will first verify if the authenticated user (derived from the `Authorization` header) matches `participantIdentity`. It then uses the `canUserJoinRoom` helper to determine if the user is permitted to join the specified `roomId` and to fetch their role and name.

**LiveKit Token Details**:
*   **Identity**: Set to `participantIdentity`.
*   **Name**: Set to `participantName` (if provided in request), otherwise `fetchedUserName` (from user's profile), otherwise `participantIdentity`.
*   **Metadata**: A JSON string containing `{ "userRole": "fetchedUserRole" }` if the user's role was determined. This allows the LiveKit room and other clients to be aware of the user's role.

If successful, it returns a JSON object with a `token` property:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

If an error occurs (e.g., missing environment variables, permission denied, invalid request), it returns an appropriate JSON error response with a corresponding HTTP status code.
