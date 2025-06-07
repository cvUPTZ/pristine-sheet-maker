# Voice Chat Feature: Environment Configuration

For the voice chat feature to function correctly in development and production, the following environment variables must be configured.

## Client-Side (React Application - typically a `.env` file)

Create or update the `.env` file in the root of your React project and add/verify the following variables:

1.  **`VITE_SUPABASE_URL`**
    *   Description: The URL for your Supabase project.
    *   Example: `https://yourprojectid.supabase.co`
    *   Used in: `src/services/NewVoiceChatManager.ts` and other Supabase client initializations.

2.  **`VITE_SUPABASE_ANON_KEY`**
    *   Description: The public anonymous key for your Supabase project. This key allows client-side access to your Supabase backend, respecting Row Level Security (RLS) policies.
    *   Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...`
    *   Used in: `src/services/NewVoiceChatManager.ts` and other Supabase client initializations.

3.  **`VITE_LIVEKIT_URL`**
    *   Description: The WebSocket URL for your LiveKit server instance (client-side connection).
    *   Example: `wss://your-livekit-instance.livekit.cloud`
    *   Used in: `src/services/NewVoiceChatManager.ts` for connecting to LiveKit rooms.

## Server-Side (Supabase Edge Functions)

These variables need to be set in your Supabase project's dashboard under "Project Settings" > "Functions" > (Select each relevant function: `generate-livekit-token`, `moderate-livekit-room`) > "Environment variables".

1.  **`LIVEKIT_URL`**
    *   Description: The URL of your LiveKit server (server-side API endpoint).
    *   Example: `https://your-livekit-instance.livekit.cloud` (This is the HTTP/S URL for the server SDK, not the WSS URL)
    *   Used by: `generate-livekit-token`, `moderate-livekit-room` (LiveKit Server SDK).

2.  **`LIVEKIT_API_KEY`**
    *   Description: The API key for your LiveKit project. Found in your LiveKit Cloud project settings or server configuration.
    *   Example: `APIxxxxxxxxxxxx`
    *   Used by: `generate-livekit-token`, `moderate-livekit-room` for authenticating with the LiveKit server API.

3.  **`LIVEKIT_API_SECRET`**
    *   Description: The API secret for your LiveKit project. Found in your LiveKit Cloud project settings or server configuration.
    *   Example: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
    *   Used by: `generate-livekit-token`, `moderate-livekit-room` for authenticating with the LiveKit server API.

**Important Notes:**
*   The `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables are generally provided to Supabase Edge Functions by default and might not need explicit configuration within the function's environment variable settings unless you need to override them.
*   The `join-voice-room` function primarily interacts with the Supabase database and uses the calling user's context, so it doesn't typically require separate LiveKit API keys.
*   **Security**: Ensure these variables are kept secure, especially API keys and secrets. Do not commit `.env` files containing sensitive production keys to your repository. Use your hosting provider's recommended way to set environment variables for deployed applications.
*   For local development of Supabase functions that call other services (like LiveKit), you might need to use a tool like `supabase functions serve --env-file ./supabase/.env.local` and define these server-side variables in that local env file.
