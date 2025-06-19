# Chrome Extension Data Flow and Communication Paths

This document describes the data flow and communication mechanisms within the Football Match Event Tracker Chrome extension, illustrating how user actions trigger operations and how data is managed across different components.

## Core Communication Mechanisms

The extension primarily relies on Chrome's messaging APIs and storage capabilities:

*   **`chrome.runtime.sendMessage(extensionId?, message, options?, callback?)`:**
    *   **Usage:** Primarily used by `content.js` (scripts injected into web pages) and `popup.js` (scripts for the browser action popup) to send one-time messages to the `background.js` service worker.
    *   **Message:** The `message` parameter is a JSON-serializable object (e.g., `{type: "ACTION_NAME", payload: data}`).
    *   **Callback:** An optional `callback` function can be provided to handle a response sent by the listener.
    *   **Example:** `content.js` sending a newly recorded event to `background.js`.

*   **`chrome.tabs.sendMessage(tabId, message, options?, callback?)`:**
    *   **Usage:** Primarily used by `background.js` to send messages to a `content.js` script running in a specific tab (identified by `tabId`).
    *   **Purpose:** Essential for `background.js` to push updates (like real-time events from other users or changes in auth state) to the UI managed by `content.js` on a particular YouTube page.
    *   **Example:** `background.js` forwarding a new event received from Supabase to the `content.js` of the relevant YouTube tab.

*   **`chrome.runtime.onMessage.addListener(callback)`:**
    *   **Usage:** Implemented in `background.js`, `content.js`, and `popup.js` to listen for incoming messages.
    *   **Callback Parameters:** The `callback` function receives:
        *   `message`: The object sent by the sender.
        *   `sender`: An object containing information about the sender (e.g., `sender.tab` if from a content script, `sender.id` which is the extension ID).
        *   `sendResponse`: A function to be called to send a response back to the message sender. This is crucial for two-way communication.
    *   **Important:** If `sendResponse` is to be used asynchronously, the listener callback must return `true`.

*   **`chrome.storage.local` and `chrome.storage.session`:**
    *   **`chrome.storage.local`:** Asynchronous, persistent local storage. Data remains until explicitly cleared by the extension or the user. Used for:
        *   User authentication tokens/session details.
        *   User preferences or settings.
    *   **`chrome.storage.session`:** Asynchronous, session-only storage. Data is cleared when the browser session ends. Useful for:
        *   Temporary state related to the current browsing session (e.g., last active video ID being tracked).
    *   **Access:** Typically managed by `background.js`, which acts as the gatekeeper for stored data, providing it to other components upon request.

## Key Data Items and Their Management

*   **Authentication State (e.g., User Token, User ID, Login Status):**
    *   **Storage:** After a successful login via Supabase (orchestrated by `background.js`), the user's session information or token is stored securely in `chrome.storage.local`.
    *   **Transmission & Access:**
        *   The raw token is generally not directly passed to `content.js` or `popup.js` for security reasons.
        *   `background.js` manages the auth state. Other components query `background.js` for the current login status (e.g., `isLoggedIn: true/false`).
        *   `background.js` can proactively notify other components of auth state changes (login/logout).

*   **Match ID / YouTube Video ID:**
    *   **Source:** `content.js` extracts the Video ID from the YouTube page URL (e.g., from `window.location.href`) or potentially from the YouTube player API.
    *   **Transmission:** Sent from `content.js` to `background.js` within message payloads when actions like starting to track a video or recording an event occur.
    *   **Usage:** `background.js` uses this ID to:
        *   Scope Supabase queries (fetch events for this video).
        *   Establish real-time subscriptions specific to this video/match.
        *   Identify which `content.js` instance to send updates to.
    *   **Storage (by `background.js`):**
        *   May maintain an in-memory map of `tabId` to `videoId` for currently active YouTube watch pages.
        *   Could temporarily store the last active `videoId` in `chrome.storage.session`.

*   **Event Details (Type, Timestamp, User ID, etc.):**
    *   **Source:**
        *   Primarily captured by `content.js` based on user interactions with the injected tracker widget (e.g., clicking "Goal" button, selecting player, noting timestamp).
        *   Potentially, `popup.js` could allow manual entry for some events, though less common for real-time tracking.
    *   **Transmission:**
        *   Packaged into a message payload by `content.js` and sent to `background.js`.
        *   `background.js` then sends this data to Supabase for storage.
        *   When Supabase pushes real-time updates, these event details are part of the payload received by `background.js`, which then forwards them to the appropriate `content.js`.

*   **User Preferences/Settings:**
    *   **Source:** User makes selections in `popup.html` (or a dedicated options page for the extension).
    *   **Storage:** `popup.js` sends changes to `background.js`, which saves them to `chrome.storage.local`.
    *   **Transmission:** If settings changes affect other components (e.g., `content.js` UI behavior), `background.js` would notify them via messages.

## Data Flow Scenarios (Illustrative Examples)

**1. User Login Process:**

1.  **Action:** User clicks the extension icon, `popup.html` opens. User enters login credentials.
2.  **`popup.js`:**
    *   Captures the email and password from the form.
    *   Sends a message to `background.js`: `chrome.runtime.sendMessage({type: "LOGIN_ATTEMPT", payload: {email: "user@example.com", password: "password123"}}, response => { ... });`
3.  **`background.js` (listener `chrome.runtime.onMessage`):**
    *   Receives the `"LOGIN_ATTEMPT"` message.
    *   Invokes the Supabase client's authentication method (e.g., `supabase.auth.signInWithPassword(...)`).
    *   **If Supabase auth is successful:**
        *   Receives user session/JWT from Supabase.
        *   Stores session/token in `chrome.storage.local.set({ userSession: sessionData })`.
        *   Calls `sendResponse({success: true, user: userData})` back to `popup.js`.
        *   May iterate through relevant tabs and notify `content.js` instances: `chrome.tabs.sendMessage(tabId, {type: "USER_LOGGED_IN", payload: {isLoggedIn: true, userId: ...}});`
    *   **If Supabase auth fails:**
        *   Calls `sendResponse({success: false, error: "Invalid credentials"})` back to `popup.js`.
4.  **`popup.js` (callback of `sendMessage`):**
    *   Receives the response.
    *   Updates `popup.html` to show logged-in state (e.g., display username, logout button) or an error message.
5.  **`content.js` (listener `chrome.runtime.onMessage` on relevant tabs):**
    *   Receives `"USER_LOGGED_IN"` message.
    *   Updates its UI (e.g., enables event recording buttons, shows user status).

**2. Recording a Match Event (from Content Script):**

1.  **Action:** On a YouTube watch page, the user clicks a "Record Goal" button in the UI injected by `content.js`.
2.  **`content.js`:**
    *   Identifies the event type ("Goal").
    *   Extracts the current `videoId` from the page.
    *   Optionally, gets the current video timestamp.
    *   Sends a message to `background.js`: `chrome.runtime.sendMessage({type: "RECORD_EVENT", payload: {videoId: "xyz123", eventType: "Goal", timestamp: "00:45:10"}});`
3.  **`background.js`:**
    *   Receives `"RECORD_EVENT"` message.
    *   Retrieves the logged-in user's ID (e.g., from `chrome.storage.local` or its in-memory state).
    *   Constructs the event object.
    *   Uses the Supabase client to insert the event: `supabase.from('match_events').insert({videoId, type, timestamp, userId, ...})`.
    *   Handles success/error from Supabase (e.g., logging). An explicit response to `content.js` is optional here, as the UI might update via real-time.

**3. Real-time Event Propagation and Display:**

1.  **`background.js` (Setup):**
    *   For each `videoId` the user is actively tracking, `background.js` establishes a real-time subscription with Supabase:
        `const channel = supabase.channel('db-match_events-for-videoId-xyz123');`
        `channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events', filter: `videoId=eq.${videoId}` }, payload => { /* New event received */ });`
        `channel.subscribe();`
2.  **Supabase & Other User Action:** Another user (or the same user in a different session) records an event for `videoId "xyz123"`. This event is saved to the Supabase database.
3.  **Supabase Real-time Push:** Supabase detects the `INSERT` in the `match_events` table and pushes the `payload` (containing the new event data `payload.new`) to all subscribed clients, including this user's `background.js`.
4.  **`background.js` (handles incoming real-time event):**
    *   The callback for `postgres_changes` is triggered.
    *   Extracts `newEventData = payload.new`.
    *   Identifies the `tabId`(s) that are displaying `videoId "xyz123"` (from its internal mapping).
    *   For each relevant tab: `chrome.tabs.sendMessage(tabId, {type: "NEW_MATCH_EVENT", payload: newEventData});`
    *   May also trigger a system notification: `chrome.notifications.create("newEventNotif", {...});`
5.  **`content.js` (on the specific YouTube tab):**
    *   Receives the `"NEW_MATCH_EVENT"` message.
    *   Updates the injected UI on the YouTube page to display this new event (e.g., adding it to a list of events).

**4. `content.js` Requesting Initial Data on Load:**

1.  **Action:** User navigates to a YouTube watch page. `content.js` is injected.
2.  **`content.js`:**
    *   Extracts `videoId`.
    *   Sends a message to `background.js` to fetch initial data: `chrome.runtime.sendMessage({type: "FETCH_INITIAL_DATA", payload: {videoId}}, response => { /* Use response to render UI */ });`
3.  **`background.js`:**
    *   Receives `"FETCH_INITIAL_DATA"`.
    *   Checks current auth status (e.g., by reading `chrome.storage.local`).
    *   Queries Supabase for existing events for the given `videoId`: `supabase.from('match_events').select('*').eq('videoId', videoId)`.
    *   Sends a response back: `sendResponse({isLoggedIn: true/false, events: fetchedEvents, ...});`
4.  **`content.js` (callback of `sendMessage`):**
    *   Receives the initial data.
    *   Renders its UI, displaying existing events and setting UI state based on login status.

## Triggering Background Script Operations

Operations in `background.js` (especially those involving Supabase API calls) are triggered by:

*   **Messages from UI components:** As seen above, `popup.js` and `content.js` send messages for actions like login, event recording, or data requests.
*   **Extension Lifecycle Events:**
    *   `chrome.runtime.onInstalled`: For one-time setup when the extension is first installed or updated (e.g., initializing default settings in `chrome.storage.local`).
    *   `chrome.runtime.onStartup`: When Chrome starts, if the extension needs to perform tasks at that point.
*   **Supabase Real-time Events:** Incoming messages from Supabase's real-time subscriptions trigger event handling logic in `background.js`.
*   **`chrome.alarms` API (Less likely for this specific app but possible):** For scheduling periodic tasks, though this extension seems more event-driven.
*   **Browser Events (e.g., `chrome.tabs.onUpdated`):** `background.js` can listen for tab updates to know when a user navigates to/from a YouTube watch page, potentially to manage `content.js` lifecycle or start/stop tracking.
