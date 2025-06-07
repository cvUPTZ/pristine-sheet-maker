# Feature: Voice Chat Collaboration

## 1. Feature Overview

The Voice Chat Collaboration feature allows users associated with a specific match to communicate in real-time using voice. It provides a dedicated interface for listing available voice rooms for a match, joining/leaving rooms, viewing participants, and managing audio. Administrators and coordinators have moderation capabilities to mute/unmute other participants.

This feature is built using Supabase for backend operations (room management, authorization) and LiveKit for real-time voice communication.

## 2. User Guide

### Accessing Voice Chat

The voice chat for a specific match can typically be accessed by navigating to a URL in the following format:

`/match/:matchId/voice-chat`

Replace `:matchId` with the actual ID of the match you wish to join. You must be logged in to access this page.

### Available Rooms

Upon accessing the page for a valid match:
- A list of available voice rooms for that match will be displayed.
- If no rooms are available, a message will indicate this.
- Each room will show its name and an option to "Join Room".

### Joining a Room
- Click the "Join Room" button next to the desired room.
- The system will attempt to connect you. You will see status messages like "Connecting to room...".
- Once connected, the status will change to "Connected to room: [Room Name/ID]".

### In-Room Interface
Once you've joined a room:
- **Participant List:** A list of all participants currently in the room is displayed.
    - Your name will have "(You)" next to it.
    - **Speaking Indicator:** A green pulsing dot will appear next to participants who are actively speaking (and not muted).
    - **Muted Indicator:** "(Muted)" will appear next to participants who have muted their microphone.
- **Controls:**
    - **Leave Room:** Click this button to disconnect from the current voice room.
    - **Mute Self / Unmute Self:** Toggles your microphone's mute state. The button text will change accordingly.

### Moderation (For Admins/Coordinators)
If you are logged in with an 'admin' or 'coordinator' role:
- Next to each participant in the list (except yourself), you will see a "Mute" or "Unmute" button.
- **Mute [Participant]:** If a participant is unmuted, clicking "Mute" will mute their microphone for everyone in the room.
- **Unmute [Participant]:** If a participant is muted, clicking "Unmute" will unmute their microphone.
- *Note: Participants can still mute themselves again after being unmuted by a moderator.*

### Error Messages
- If any issues occur (e.g., room is full, permission denied, network problems), an error message will be displayed, typically as a temporary notification (toast) at the top or bottom of the screen.

## 3. Developer Information

### Key Components & Architecture

-   **`src/services/NewVoiceChatManager.ts`**:
    *   Core service class responsible for all voice chat logic.
    *   Manages LiveKit `Room` object lifecycle (connection, events, disconnection).
    *   Interacts with Supabase Edge Functions (`join-voice-room`, `generate-livekit-token`, `moderate-livekit-room`) for authorization and LiveKit token generation.
    *   Fetches room lists from the Supabase `voice_rooms` table.
    *   Provides methods for joining, leaving, muting, and moderation.
    *   Exposes callbacks for UI updates (participants changed, connection state, errors).

-   **`src/hooks/useNewVoiceCollaboration.ts`**:
    *   React hook that instantiates and manages `NewVoiceChatManager`.
    *   Provides a clean interface for React components to interact with the voice chat service.
    *   Manages state related to voice chat (available rooms, current room, participants, connection state, errors) and exposes it to components.
    *   Handles the disposal of `NewVoiceChatManager` when the consuming component unmounts.

-   **`src/components/voice/NewVoiceChat.tsx`**:
    *   The main UI component for the voice chat interface.
    *   Uses the `useNewVoiceCollaboration` hook to get data and functions.
    *   Renders the list of available rooms, participant list, and user controls.
    *   Handles user interactions and displays feedback (connection status, errors via toasts).
    *   Receives `matchId`, `userId`, `userRole`, and `userName` as props.

-   **`src/pages/NewVoiceChatPage.tsx`**:
    *   A page component that hosts `NewVoiceChat.tsx`.
    *   Extracts `matchId` from URL parameters (react-router-dom `useParams`).
    *   Fetches user details (`userId`, `userRole`, `userName`) from the `useAuth` context.
    *   Passes the required props to `NewVoiceChat.tsx`.

### Configuration
-   All necessary environment variables for client-side and server-side (Supabase Functions) are documented in `VOICE_CHAT_ENV_CONFIG.md`. Ensure these are correctly set up in your `.env` files for local development and in your hosting environment for deployment.

### Extending or Integrating Elsewhere
-   To use the voice chat UI in a different part of the application, you can integrate the `NewVoiceChatPage` via routing or directly embed the `NewVoiceChat` component.
-   If embedding `NewVoiceChat` directly, ensure you provide the required props: `matchId`, `userId`, `userRole`, and `userName`.

### Testing
-   Unit and integration tests are located in the same directories as the components/services/hooks they test (e.g., `NewVoiceChatManager.test.ts`).
-   These tests cover service logic, hook state management, and component rendering/interaction.
-   Refer to the Staging Test Plan (outlined during development, potentially in project documentation or task history) for manual end-to-end testing scenarios.

---
*This document provides a snapshot of the feature as of its initial implementation. Refer to the source code and commit history for the most up-to-date details.*
