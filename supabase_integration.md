# Chrome Extension Supabase Integration

This document details how the Chrome extension integrates with Supabase for backend services, including authentication, database interactions, and real-time features.

## 1. Authentication

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

## 2. Database Interactions

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

## 3. Real-time Features

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
