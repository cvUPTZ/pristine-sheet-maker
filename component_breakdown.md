# Chrome Extension Component Breakdown

This document outlines the role and interactions of each major component of the Football Match Event Tracker Chrome extension.

## 1. `manifest.json`

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

## 2. `background.js` (Service Worker)

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

## 3. `content.js`

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

## 4. `popup.html` & `popup.js`

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

## 5. `supabase.js` (Client Library Wrapper)

*   **Purpose:** This file is not a script that runs independently but rather a JavaScript module that likely initializes and exports the Supabase client instance.
*   **Role:**
    *   It abstracts the Supabase client setup. `background.js` (and potentially other scripts if they needed direct Supabase access, though this is less common for security reasons) imports the initialized client from this file.
    *   Ensures that Supabase client configuration (like API URL and anon key) is centralized.
    *   The actual Supabase JavaScript SDK (loaded from `web_accessible_resources` or bundled) provides the methods for database interaction, authentication, and real-time subscriptions.

## Component Interactions Flow (Illustrative Examples)

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
