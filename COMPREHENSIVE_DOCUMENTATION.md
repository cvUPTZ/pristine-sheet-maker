# Comprehensive Chrome Extension Documentation

This document provides a complete overview of the Football Match Event Tracker Chrome extension, covering its purpose, architecture, data flow, and integration with backend services.

## Chrome Extension Summary

### Purpose

The Chrome extension is designed to track football match events directly within the YouTube interface. It enhances the viewing experience by allowing users to log in and record significant match events (e.g., goals, cards, substitutions) while watching live streams or VODs.

### Integration with YouTube

The extension injects a dedicated interface onto YouTube watch pages. This provides a user-friendly way to input and view match events without leaving the YouTube player.

### Key Features

*   **User Authentication:** Enables users to log in, likely to save their event data and participate in collaborative event logging.
*   **Event Recording:** Users can record various types of football match events as they happen.
*   **Real-time Collaboration & Notifications:** The extension uses Supabase as a backend to store event data. This allows multiple users watching the same match to see events recorded by others in real-time and potentially receive notifications for new events.

## Chrome Extension Component Breakdown

This section outlines the role and interactions of each major component of the Football Match Event Tracker Chrome extension.

### 1. `manifest.json`

*   **Purpose:** This file is the heart of the Chrome extension, acting as its blueprint. It defines essential metadata, declares necessary permissions, and specifies all the core components of the extension, such as background scripts, content scripts, and browser actions (popup).
*   **Key Fields:**
    *   `manifest_version`: Specifies the version of the manifest file format (e.g., 3).
    *   `name`: The official name of the extension displayed in the Chrome Web Store and browser.
    *   `version`: The current version number of the extension.
    *   `description`: A brief summary of the extension's functionality.
    *   `permissions`: An array of strings declaring what Chrome APIs and resources the extension is allowed to access. Common permissions include:
        *   `storage`: To store extension settings or user data locally.
        *   `activeTab`: To interact with the currently active tab.
        *   `scripting`: To inject scripts into web pages.
        *   `notifications`: To display system notifications.
        *   Host permissions (e.g., `https://*.supabase.co`): To allow communication with specific external services like Supabase.
    *   `background`: Defines the background service worker script (e.g., `background.js`). This script runs in the background, managing long-term tasks and state.
    *   `content_scripts`: An array defining scripts (e.g., `content.js`) and CSS (e.g., `styles.css`) to be injected into web pages that match specified URL patterns (e.g., `https://www.youtube.com/watch*`).
    *   `action`: Defines the properties of the extension's icon in the browser toolbar (browser action). This includes:
        *   `default_popup`: The HTML file (e.g., `popup.html`) to be displayed when the icon is clicked.
        *   `default_icon`: Image files for the extension icon.
        *   `default_title`: Tooltip text for the icon.
    *   `web_accessible_resources`: An array listing resources within the extension package (like images, or the `supabase.js` library) that need to be accessible by web pages or content scripts.

### 2. `background.js` (Service Worker)

*   **Purpose:** The central nervous system of the extension. It runs independently of any web page and manages global state, handles communication between different parts of the extension, and orchestrates interactions with the backend service (Supabase).
*   **Core Logic:**
    *   Initializes and maintains the connection to the Supabase backend using the Supabase client (imported from `supabase.js`).
    *   Manages user authentication state (e.g., storing session tokens, checking if a user is logged in).
    *   Manages real-time data subscriptions (e.g., listening for new match events from Supabase).
*   **Message Handling:**
    *   Acts as a message broker. It listens for messages from `content.js` (e.g., user-recorded events, requests for data) and `popup.js` (e.g., login attempts, requests to initiate tracking).
    *   Sends messages to `content.js` (e.g., new events from other users, updates to match state, login status changes) and `popup.js` (e.g., authentication status). This is typically done using `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`.
*   **Supabase Client Interaction:**
    *   Contains all logic for communicating with Supabase:
        *   User authentication (sign-up, sign-in, sign-out).
        *   CRUD (Create, Read, Update, Delete) operations for match events.
        *   Fetching match assignments or other relevant data.
*   **Real-time Subscriptions:**
    *   Uses Supabase's real-time capabilities to subscribe to specific database tables or channels (e.g., for a particular match ID).
    *   When data changes in Supabase (e.g., another user records an event), `background.js` receives these updates instantly.
*   **Event Recording Logic:**
    *   Receives event data (e.g., goal, card) from `content.js` or potentially `popup.js`.
    *   May perform validation or data transformation.
    *   Persists the event to Supabase.
*   **Notification Management:**
    *   Upon receiving real-time event updates from Supabase for tracked matches, it can use the `chrome.notifications` API to display desktop notifications to the user, informing them about new events even if they are not actively looking at the YouTube tab.

### 3. `content.js`

*   **Purpose:** This script runs in the context of specific web pages (YouTube watch pages, as defined in `manifest.json`). Its primary role is to interact with the page's DOM, inject the user interface for event tracking, and communicate user actions back to `background.js`.
*   **YouTube Page Interaction:**
    *   Verifies it is on a relevant YouTube watch page.
    *   May extract information from the page, such as the video ID or current playback time, to associate with recorded events.
*   **UI Injection (Tracker Widget):**
    *   Dynamically creates and inserts HTML elements into the YouTube page. This forms the "tracker widget" – the interface users interact with to record match events.
    *   The structure and appearance of this widget are defined by the HTML generated by `content.js` and styled by CSS files (e.g., `styles.css`) also specified in `manifest.json`.
*   **Event Capturing from the Widget:**
    *   Attaches event listeners (e.g., click handlers) to the buttons and input fields of the injected tracker widget.
    *   When a user interacts with the widget (e.g., clicks a "Record Goal" button), `content.js` captures this action and collects the relevant event details (type of event, timestamp, etc.).
*   **Communication with Background Script:**
    *   Uses `chrome.runtime.sendMessage` to send messages to `background.js`. These messages typically contain:
        *   Details of events recorded by the user.
        *   Requests for data (e.g., current login status, existing events for the current video).
    *   Listens for messages from `background.js` using `chrome.runtime.onMessage.addListener`. These messages can include:
        *   Real-time event updates from other users.
        *   Changes in authentication status.
        *   Data to populate or update the tracker widget.

### 4. `popup.html` & `popup.js`

*   **Purpose:** These files define the user interface and logic for the extension's popup, which appears when the user clicks the extension icon in the browser toolbar. The popup is typically used for settings, login/logout, and initiating actions.
*   **`popup.html`:** The HTML file that structures the popup's content. This includes elements like:
    *   Login/logout forms or buttons.
    *   Display areas for user information, match assignments, or notifications.
    *   Controls to manually start or stop tracking for a match.
*   **`popup.js`:** The JavaScript file that adds interactivity to `popup.html`.
    *   **User Authentication:**
        *   Handles user input from login forms.
        *   Sends authentication requests (with credentials or OAuth tokens) to `background.js`.
        *   Updates the popup UI based on the authentication status received from `background.js` (e.g., showing user's email when logged in, or an error message if login fails).
    *   **Displaying Match Assignments/Notifications:**
        *   May request data from `background.js` (e.g., list of active matches, recent notifications) and display it in the popup.
    *   **Manual Match Tracking Initiation:**
        *   Could provide an interface for the user to input a YouTube URL or select a match to start tracking.
        *   Sends a message to `background.js` to initiate the tracking process for the selected match.
    *   **Communication with Background Script:**
        *   Uses `chrome.runtime.sendMessage` to send requests and data to `background.js`.
        *   Uses `chrome.runtime.onMessage.addListener` (or relies on response callbacks from `sendMessage`) to receive data and status updates from `background.js` to update its own UI.

### 5. `supabase.js` (Client Library Wrapper)

*   **Purpose:** This file is not a script that runs independently but rather a JavaScript module that likely initializes and exports the Supabase client instance.
*   **Role:**
    *   It abstracts the Supabase client setup. `background.js` (and potentially other scripts if they needed direct Supabase access, though this is less common for security reasons) imports the initialized client from this file.
    *   Ensures that Supabase client configuration (like API URL and anon key) is centralized.
    *   The actual Supabase JavaScript SDK (loaded from `web_accessible_resources` or bundled) provides the methods for database interaction, authentication, and real-time subscriptions.

### Component Interactions Flow (Illustrative Examples)

*   **User Logs In:**
    1.  User clicks extension icon, `popup.html` loads.
    2.  User enters credentials in `popup.html`; `popup.js` captures them.
    3.  `popup.js` sends a `{type: "LOGIN", payload: credentials}` message to `background.js`.
    4.  `background.js` receives the message, uses the imported Supabase client (from `supabase.js`) to authenticate the user.
    5.  `background.js` sends a `{type: "AUTH_STATUS", payload: {success: true/false, user: ...}}` message back to `popup.js`.
    6.  `popup.js` updates `popup.html` to show login status.
    7.  `background.js` may also send a message to all relevant `content.js` instances to update their UIs regarding the new auth state.

*   **User Records an Event via Content Script:**
    1.  User is on a YouTube watch page where `content.js` has injected a tracker widget.
    2.  User clicks a button on the widget (e.g., "Record Foul").
    3.  `content.js` captures the event details (type, timestamp from video player).
    4.  `content.js` sends a `{type: "RECORD_EVENT", payload: eventData}` message to `background.js`.
    5.  `background.js` receives the message, validates data, and uses the Supabase client to save the event to the database.
    6.  (Optional) `background.js` sends an acknowledgment back to `content.js`.

*   **Real-time Event Propagation:**
    1.  `background.js` is connected to Supabase and has an active real-time subscription for "match_events" on a specific `match_id`.
    2.  Another user (or the current user via a different session) records an event, and it's saved to Supabase.
    3.  Supabase detects the database change and pushes the new event data to all subscribed clients, including this user's `background.js`.
    4.  `background.js` receives the new event data.
    5.  `background.js` processes the event:
        *   It might trigger a desktop notification using `chrome.notifications.create()`.
        *   It sends a `{type: "NEW_EVENT", payload: newEventData}` message to the relevant `content.js` (if the user has that match's YouTube page open).
    6.  `content.js` receives the message and updates the tracker widget on the YouTube page to display the new event in real-time.

## Chrome Extension Data Flow and Communication Paths

This section describes the data flow and communication mechanisms within the Football Match Event Tracker Chrome extension, illustrating how user actions trigger operations and how data is managed across different components.

### Core Communication Mechanisms

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

### Key Data Items and Their Management

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

### Data Flow Scenarios (Illustrative Examples)

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

### Triggering Background Script Operations

Operations in `background.js` (especially those involving Supabase API calls) are triggered by:

*   **Messages from UI components:** As seen above, `popup.js` and `content.js` send messages for actions like login, event recording, or data requests.
*   **Extension Lifecycle Events:**
    *   `chrome.runtime.onInstalled`: For one-time setup when the extension is first installed or updated (e.g., initializing default settings in `chrome.storage.local`).
    *   `chrome.runtime.onStartup`: When Chrome starts, if the extension needs to perform tasks at that point.
*   **Supabase Real-time Events:** Incoming messages from Supabase's real-time subscriptions trigger event handling logic in `background.js`.
*   **`chrome.alarms` API (Less likely for this specific app but possible):** For scheduling periodic tasks, though this extension seems more event-driven.
*   **Browser Events (e.g., `chrome.tabs.onUpdated`):** `background.js` can listen for tab updates to know when a user navigates to/from a YouTube watch page, potentially to manage `content.js` lifecycle or start/stop tracking.

## Chrome Extension Supabase Integration

This section details how the Chrome extension integrates with Supabase for backend services, including authentication, database interactions, and real-time features.

### 1. Authentication

The extension uses Supabase Auth to manage user identity.

*   **Login/Logout Process:**
    *   **Initiation:** Users initiate login or logout via the UI in `popup.html`.
    *   **`popup.js` Role:**
        *   Captures user credentials (e.g., email/password) or OAuth provider choice (e.g., Google, as suggested by `signInWithGoogle` function).
        *   Sends a message to `background.js` to handle the authentication request. Examples:
            *   `{ type: 'LOGIN', data: { email, password } }`
            *   `{ type: 'LOGIN_WITH_GOOGLE' }`
            *   `{ type: 'LOGOUT' }`
    *   **`background.js` Role (Authentication Handler):**
        *   Receives the message from `popup.js`.
        *   Calls the relevant Supabase client authentication methods:
            *   `supabase.auth.signInWithPassword({ email, password })`
            *   `supabase.auth.signInWithOAuth({ provider: 'google' })` (Note: OAuth requires careful redirect URI configuration in Supabase and the extension).
            *   `supabase.auth.signOut()`
        *   Communicates the outcome (success/failure, user data) back to `popup.js`.

*   **Session Management and Storage:**
    *   **`supabase.auth.onAuthStateChange`:** `background.js` utilizes this crucial Supabase listener to react to changes in the authentication state (e.g., `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`).
    *   **Storage in `chrome.storage.local`:**
        *   When a `SIGNED_IN` event occurs, the callback receives the `session` object. `background.js` then stores the `session.user` object (or parts of it) in `chrome.storage.local`:
            `chrome.storage.local.set({ user: session.user });`
        *   This allows the user's logged-in state to persist across browser sessions.
        *   When a `SIGNED_OUT` event occurs, `background.js` removes the user data from storage:
            `chrome.storage.local.remove(['user']);`
    *   **Session Restoration:** On extension startup, `background.js` can check `chrome.storage.local` for existing user data to restore the session. The Supabase client might also automatically attempt to refresh the session if a valid refresh token is available.

*   **Session Usage:**
    *   `background.js` checks for the presence of user data in `chrome.storage.local` or its own state (derived from `onAuthStateChange`) to determine if a user is logged in.
    *   Authenticated Supabase client: For operations requiring authentication (e.g., writing to user-specific tables, fetching restricted data), the Supabase client, when initialized or updated with a valid session/JWT, automatically includes the necessary authorization headers in its requests.

### 2. Database Interactions

The extension interacts with Supabase database tables for storing and retrieving data.

*   **Event Recording (from `content.js` via `background.js` to Supabase):**
    1.  **`content.js`:** User records an event (e.g., goal, card) using the injected tracker widget on a YouTube page. Event details (match ID, type, timestamp, etc.) are collected.
    2.  **Message Passing:** `content.js` sends a message (e.g., `{ type: 'RECORD_EVENT', data: eventData }`) to `background.js`.
    3.  **`background.js`:**
        *   Receives the event data.
        *   It is presumed to perform an `insert` operation into a Supabase table (e.g., `match_events`, though the table name is not explicitly stated for this action in the provided `background.js` snippets).
        *   This operation would look something like: `await supabase.from('table_for_match_events').insert({ ...eventData, userId: currentUser.id });`

*   **Fetching and Managing Match Assignment Notifications (`notifications` table):**
    *   **Fetching (`popup.js` via `background.js`):**
        1.  `popup.js` requests notifications by sending a message like `{ type: 'GET_NOTIFICATIONS' }` to `background.js`.
        2.  `background.js` queries the `notifications` table in Supabase:
            `const { data: notifications, error } = await supabase.from('notifications').select('*').eq('read', false).order('created_at', { ascending: false });`
        3.  The fetched notifications are sent back to `popup.js` for display.
    *   **Marking as Read (`popup.js` via `background.js`):**
        1.  User interacts with a notification in `popup.html` to mark it as read.
        2.  `popup.js` sends a message like `{ type: 'MARK_NOTIFICATION_READ', payload: { id: notificationId } }` to `background.js`.
        3.  `background.js` updates the specific notification in Supabase:
            `await supabase.from('notifications').update({ read: true }).eq('id', notificationId);`

### 3. Real-time Features

Supabase's real-time capabilities are used for instant updates and collaborative features.

*   **User-Specific Notifications (Subscription to `notifications` table):**
    *   **`background.js` Subscription:** After a user logs in, `background.js` establishes a real-time subscription to the `notifications` table, filtered for new entries relevant to that user.
        `supabase.channel('custom-insert-channel') // Potentially should be user-specific channel name for clarity
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}` // Dynamically set user.id
          }, (payload) => {
            // New notification received
            const newNotification = payload.new;
            // Store it locally / update badge count
            chrome.storage.local.set({ notifications: updatedNotifications }); // Example update
            // Send to popup if open
            chrome.runtime.sendMessage({ type: 'NEW_NOTIFICATION', payload: newNotification });
            // Display desktop notification
            chrome.notifications.create(`notif-${newNotification.id}`, { /* ... options ... */ });
          })
          .subscribe();`
    *   **Functionality:** When a new row matching the user's ID is inserted into the `notifications` table (e.g., due to a match assignment), Supabase pushes this new data (`payload.new`) to `background.js` in real-time.
    *   `background.js` then processes this: updates local storage, informs `popup.js` (if active), and triggers a desktop notification.

*   **Unified Match Channel (`unified_match_${matchId}`):**
    *   **Purpose:** To share tracker status and potentially other real-time collaborative data among users watching the same match.
    *   **`background.js` Channel Management:**
        *   A unique channel is created for each `matchId` a user might be interacting with:
            `const channel = supabase.channel(`unified_match_${matchId}`);`
    *   **Broadcast:**
        *   Used to send messages to all clients subscribed to this specific match channel.
        *   Example from `background.js`: `channel.send({ type: 'broadcast', event: 'tracker-status', payload: { status: 'active', userId: data.userId } });`
        *   This allows, for instance, one user activating their tracker to notify other users on the same match channel about this activity.
    *   **Presence (Implied):**
        *   Supabase channels support presence tracking, allowing an extension to know which users are currently "joined" to (i.e., active on) a specific match channel. While the provided snippets don't detail the handling of presence events (`channel.on('presence', { event: 'join' | 'leave' }, ...)`), the setup of a named channel like this is a common prerequisite for using presence.
    *   **Subscription and Event Handling:**
        *   `channel.subscribe((status) => { ... });` is used to join the channel.
        *   `background.js` would also have handlers (`channel.on(...)`) for specific broadcast event types it expects to receive on this channel, updating its state or relaying information to `content.js` as needed.

This integration with Supabase provides the extension with robust authentication, data persistence, and powerful real-time communication capabilities, forming the core of its backend functionality.
