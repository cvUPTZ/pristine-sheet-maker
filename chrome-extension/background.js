
// Import Supabase client library
try {
  importScripts('supabase.js'); // Make sure supabase.js is in the extension's root directory
} catch (e) {
  console.error('Failed to import supabase.js:', e);
}

class TrackerBackground {
  constructor() {
    this.SUPABASE_URL = 'YOUR_SUPABASE_URL';
    this.SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    this.supabase = null;
    this.realtimeChannel = null; // For user-specific notifications
    this.userId = null;

    // For unified match channel
    this.unifiedMatchChannel = null;
    this.currentMatchId = null;
    this.currentUserIdInMatch = null; // This will be the same as this.userId but contextually for the match
    this.lastBroadcastTimestamp = 0;

    this._initializeSupabaseClient();
    this.setupEventListeners();
    this.connectionData = null;
    this._checkCurrentUserAndSetupRealtime(); // Sets up user-specific notifications
    this._checkCurrentMatchAndSetupChannel(); // Sets up unified match channel if applicable
  }

  _initializeSupabaseClient() {
    if (self.supabase && typeof self.supabase.createClient === 'function') {
      this.supabase = self.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
      console.log('Supabase client initialized in background script.');
    } else {
      console.error('Supabase client is not available in background script. Ensure supabase.js is imported.');
    }
  }

  async _checkCurrentUserAndSetupRealtime() {
    try {
      const result = await chrome.storage.local.get('supabaseSession');
      if (result.supabaseSession && result.supabaseSession.user_email) { // Assuming user_id is part of the session
        // Attempt to get user_id from the user object within the session
        // The actual path to user_id might differ based on how it's structured in your session
        // e.g. result.supabaseSession.user.id
        // For this example, let's assume user_email can serve as a unique identifier for notifications
        // or that you have a way to get a persistent user_id.
        // Ideally, the user object stored in supabaseSession would have an `id` field.
        // For now, we'll use a placeholder logic. If user_email is not suitable, this needs adjustment.
        const storedUser = await this._getStoredUser();
        if (storedUser && storedUser.id) {
            this.userId = storedUser.id;
            console.log('Current user ID for notifications:', this.userId);
            this.initializeRealtimeNotifications(); // For user-specific notifications
        } else {
            console.log('User ID not found in session, user-specific realtime notifications not started.');
        }
      } else {
        console.log('No active session found, user-specific realtime notifications not started.');
      }
    } catch (error) {
      console.error('Error checking current user for user-specific realtime setup:', error);
    }
  }

  async _checkCurrentMatchAndSetupChannel() {
    try {
      const result = await chrome.storage.local.get(['currentMatchId', 'currentUserId']);
      if (result.currentMatchId && result.currentUserId) {
        this.currentMatchId = result.currentMatchId;
        this.currentUserIdInMatch = result.currentUserId; // This should align with this.userId if a user is logged in
        console.log(`Found stored match: ${this.currentMatchId} for user: ${this.currentUserIdInMatch}. Reconnecting to unified channel.`);
        this.connectToUnifiedMatchChannel(this.currentMatchId, this.currentUserIdInMatch);
      } else {
        console.log('No current match tracking data found in storage.');
      }
    } catch (error) {
      console.error('Error checking current match from storage:', error);
    }
  }

  // Helper to get user data, specifically the ID
  async _getStoredUser() {
    try {
      const result = await chrome.storage.local.get(['supabaseSession']);
      // Ensure user object and its id are present
      if (result.supabaseSession && result.supabaseSession.user && result.supabaseSession.user.id) {
        return result.supabaseSession.user;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving stored user:', error);
      return null;
    }
  }

  setupEventListeners() {
    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle extension install/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // Handle notifications
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'CONNECTION_ESTABLISHED':
          this.connectionData = message.data;
          await this.storeConnectionData(message.data);
          sendResponse({ success: true });
          break;
        case 'USER_LOGGED_IN': // Message from popup.js on successful login
            console.log('USER_LOGGED_IN message received in background');
            this.userId = message.userId; // Assuming popup.js sends userId
            if (this.userId) {
                this.initializeRealtimeNotifications();
            } else {
                // If userId is not directly sent, try to re-fetch from storage
                await this._checkCurrentUserAndSetupRealtime();
            }
            sendResponse({ success: true });
            break;
        case 'USER_LOGGED_OUT': // Message from popup.js on logout
          console.log('USER_LOGGED_OUT message received in background');
          await this.cleanupRealtimeNotifications(); // For user-specific notifications
          await this.disconnectFromUnifiedMatchChannel(); // For unified match channel
          this.userId = null;
          this.currentMatchId = null;
          this.currentUserIdInMatch = null;
          // Clear from storage too, although popup also does this for currentMatchId
          await chrome.storage.local.remove(['currentMatchId', 'currentUserId']);
          sendResponse({ success: true });
          break;
        case 'START_MATCH_TRACKING':
          console.log('START_MATCH_TRACKING message received', message);
          if (message.matchId && message.userId) {
            this.currentMatchId = message.matchId;
            this.currentUserIdInMatch = message.userId; // Should be same as this.userId
            // Ensure this.userId is also set if not already (e.g. if login flow was quick)
            if(!this.userId) this.userId = message.userId;

            await this.connectToUnifiedMatchChannel(this.currentMatchId, this.currentUserIdInMatch);
            // Persist this choice, so background can resume if it restarts
            await chrome.storage.local.set({ currentMatchId: this.currentMatchId, currentUserId: this.currentUserIdInMatch });

            // Inform content script about the active match context
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  type: 'SET_ACTIVE_MATCH_CONTEXT',
                  matchId: this.currentMatchId
                }, response => {
                  if (chrome.runtime.lastError) {
                    console.warn('Error sending SET_ACTIVE_MATCH_CONTEXT to content script:', chrome.runtime.lastError.message);
                  } else {
                    console.log('SET_ACTIVE_MATCH_CONTEXT acknowledged by content script:', response);
                  }
                });
              } else {
                console.warn('Could not find active tab to send SET_ACTIVE_MATCH_CONTEXT.');
              }
            });
            sendResponse({ success: true });
          } else {
            console.error('START_MATCH_TRACKING message missing matchId or userId');
            sendResponse({ success: false, error: 'Missing matchId or userId' });
          }
          break;
        case 'RECORD_EVENT':
          const eventResult = await this.recordEvent(message.data);
          if (eventResult.success) {
            this.broadcastTrackerStatus({
              status: 'recording', // Or 'active' if 'recording' is too transient
              action: `Event: ${message.data.eventType}`
            });
            // Optional: revert to 'active' after a short delay if 'recording' is temporary
            // setTimeout(() => this.broadcastTrackerStatus({ status: 'active', action: 'Watching video' }), 1000);
          }
          sendResponse(eventResult);
          break;
        case 'STOP_MATCH_TRACKING': // Example for future use
            console.log('STOP_MATCH_TRACKING message received');
            await this.disconnectFromUnifiedMatchChannel();
            await chrome.storage.local.remove(['currentMatchId', 'currentUserId']);
            this.currentMatchId = null;
            this.currentUserIdInMatch = null;
            sendResponse({ success: true });
            break;
        case 'GET_CONNECTION_DATA':
          const data = await this.getConnectionData();
          sendResponse(data);
          break;

        case 'SHOW_NOTIFICATION':
          // This case can be used by other parts of the extension to show generic notifications
          // The realtime listener will call displayNotification directly.
          await this.showNotification(message.data.title, message.data.message, message.data.type, message.data.notificationId);
          sendResponse({ success: true });
          break;

        // Content script messages for video/tab status
        case 'VIDEO_PLAYING':
          if (message.matchId === this.currentMatchId) {
            this.broadcastTrackerStatus({ status: 'active', action: 'Watching video: ' + message.videoId });
          }
          sendResponse({ success: true });
          break;
        case 'VIDEO_PAUSED':
          if (message.matchId === this.currentMatchId) {
            this.broadcastTrackerStatus({ status: 'inactive', action: 'Video paused: ' + message.videoId });
          }
          sendResponse({ success: true });
          break;
        case 'VIDEO_NAVIGATED_AWAY':
          if (message.oldMatchId === this.currentMatchId) {
            this.broadcastTrackerStatus({ status: 'inactive', action: `Navigated from video for match ${message.oldMatchId} to ${message.newVideoId}` });
            // Optionally, if navigating away means stopping tracking for this match:
            // await this.disconnectFromUnifiedMatchChannel();
            // await chrome.storage.local.remove(['currentMatchId', 'currentUserId']);
            // this.currentMatchId = null;
            // this.currentUserIdInMatch = null;
          }
          sendResponse({ success: true });
          break;
        case 'TAB_HIDDEN':
          if (message.matchId === this.currentMatchId) {
            this.broadcastTrackerStatus({ status: 'inactive', action: 'Tab hidden/inactive' });
          }
          sendResponse({ success: true });
          break;
        case 'TAB_FOCUSED':
          if (message.matchId === this.currentMatchId) {
            // When tab is re-focused, content.js will also send a play/pause event,
            // so this action might be redundant or could simply be 'Tab focused'.
            // The content script's play/pause after focus will provide more accurate video state.
            this.broadcastTrackerStatus({ status: 'active', action: 'Tab focused/active' });
          }
          sendResponse({ success: true });
          break;

        default:
          // console.log('Background received unhandled message type:', message.type);
          sendResponse({ error: 'Unknown message type in background' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      // Set default settings
      await chrome.storage.sync.set({
        settings: {
          autoConnect: false,
          notifications: true,
          keyboardShortcuts: true,
          theme: 'light'
        }
      });

      // Show welcome notification
      await this.showNotification({
        title: 'Football Tracker Installed!',
        message: 'Click the extension icon to get started with match tracking.',
        type: 'basic'
      });
    }
  }

  async storeConnectionData(data) {
    await chrome.storage.local.set({
      connectionData: data,
      lastConnected: Date.now()
    });
  }

  async getConnectionData() {
    const result = await chrome.storage.local.get(['connectionData']);
    return result.connectionData || null;
  }

  // --- Auth Token Helper ---
  async getAuthToken() {
    try {
      const result = await chrome.storage.local.get(['supabaseSession']);
      if (result.supabaseSession && result.supabaseSession.access_token) {
        // TODO: Check for token expiry and refresh if necessary
        // For now, just return the token
        return result.supabaseSession.access_token;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving auth token:', error);
      return null;
    }
  }

  async recordEvent(eventData) {
    if (!this.connectionData) {
      const stored = await this.getConnectionData();
      if (!stored) {
        console.error('Recording event failed: No connection data found.');
        await this.showNotification({
          title: 'Recording Failed',
          message: 'Connection not configured. Please connect via popup.',
          type: 'basic'
        });
        return { success: false, error: 'No connection established' };
      }
      this.connectionData = stored;
    }

    const authToken = await this.getAuthToken();
    if (!authToken) {
      console.error('Recording event failed: No auth token available. Please log in.');
      // Potentially notify the user they need to log in again
      await this.showNotification({
        title: 'Authentication Required',
        message: 'Please log in via the extension popup to record events.',
        type: 'basic'
      });
      return { success: false, error: 'Authentication token not found' };
    }

    try {
      const response = await fetch(`${this.connectionData.apiUrl}/match-events`, {
        method: 'POST',
        headers: {
          // Use the Supabase token for Authorization
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_id: this.connectionData.matchId,
          event_type: eventData.eventType,
          player_id: eventData.playerId,
          timestamp: Math.floor(Date.now() / 1000),
          event_data: eventData.details || {}
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Show success notification
      await this.showNotification({
        title: 'Event Recorded',
        message: `${eventData.eventType} event recorded successfully`,
        type: 'basic'
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error recording event:', error);
      
      // Show error notification
      await this.showNotification({
        title: 'Recording Failed',
        message: `Failed to record ${eventData.eventType} event`,
        type: 'basic'
      });

      return { success: false, error: error.message };
    }
  }

  async showNotification(title, message, type = 'basic', notificationId = `tracker_${Date.now()}`) {
    // Ensure existing notifications are cleared if a new one with the same ID is created
    // or if it's a new notification that should replace an old one.
    // For realtime updates, you might want unique IDs or a strategy to update existing ones.
    await chrome.notifications.create(notificationId, {
      type: type,
      iconUrl: 'icons/icon128.png', // Ensure you have a 128x128 icon
      title: title,
      message: message,
      priority: 2 // Higher priority
    });

    // Consider making auto-clear configurable or based on notification type
    // For important match notifications, might not want to auto-clear or have a longer timeout.
    // setTimeout(() => {
    //   chrome.notifications.clear(notificationId);
    // }, 5000); // Increased timeout
  }

  handleNotificationClick(notificationId) {
    console.log('Notification clicked:', notificationId);
    // Example: Open the extension popup or a specific page
    if (notificationId.startsWith('match_')) {
        // Potentially open a specific match URL if the ID contains match info
        // chrome.tabs.create({ url: `https://yourapp.com/matches/${matchId}` });
    } else {
        // Generic action: open the extension's popup or main page
        // This requires knowing the popup's HTML file or a main page of your app.
        // Example: To open the popup (if it's defined in manifest.json action)
        chrome.action.openPopup();
    }
    chrome.notifications.clear(notificationId);
  }

  // --- Realtime Notification Methods (User-Specific) ---
  initializeRealtimeNotifications() {
    if (!this.supabase) {
      console.error('Supabase client not initialized. Cannot set up user-specific notifications.');
      return;
    }
    if (!this.userId) {
      console.log('User ID not available. User-specific realtime notifications cannot be started.');
      return;
    }
    if (this.realtimeChannel) {
      console.log('User-specific realtime channel already initialized.');
      return;
    }

    const userChannelName = `realtime_notifications_user_${this.userId}`;
    this.realtimeChannel = this.supabase
      .channel(userChannelName, { config: { broadcast: { self: false } } })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.userId}` // Ensure this matches your DB column
        },
        (payload) => {
          console.log('New notification received:', payload);
          if (payload.new) {
            const notificationData = payload.new;
            // Customize title and message based on notificationData
            const title = notificationData.title || 'New Match Notification';
            const message = notificationData.message || `You have a new update for match ${notificationData.match_id || ''}.`;
            // Create a unique ID for the notification, possibly using an ID from the payload
            const notificationId = `match_notification_${notificationData.id || Date.now()}`;
            this.showNotification(title, message, 'basic', notificationId);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to user-specific channel: ${userChannelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to user-specific channel: ${userChannelName}`, err);
          this.cleanupRealtimeNotifications();
        } else if (status === 'TIMED_OUT') {
          console.error(`Subscription timed out for user-specific channel: ${userChannelName}`, err);
        } else {
          console.log(`User-specific realtime channel status: ${status}`, err ? err : '');
        }
      });
    console.log(`Attempting to subscribe to user-specific channel: ${userChannelName}`);
  }

  async cleanupRealtimeNotifications() {
    if (this.realtimeChannel) {
      try {
        console.log('Cleaning up user-specific notifications. Unsubscribing from channel.');
        const status = await this.realtimeChannel.unsubscribe();
        console.log('Unsubscribed from user-specific channel, status:', status);
      } catch (error) {
        console.error('Error unsubscribing from user-specific channel:', error);
      } finally {
        if (this.supabase && this.realtimeChannel && typeof this.supabase.removeChannel === 'function') {
             await this.supabase.removeChannel(this.realtimeChannel);
        }
        this.realtimeChannel = null;
        console.log('User-specific realtime channel removed.');
      }
    } else {
      console.log('No active user-specific realtime channel to clean up.');
    }
  }

  // --- Unified Match Channel Methods ---

  async connectToUnifiedMatchChannel(matchId, userId) {
    if (!this.supabase) {
      console.error('Supabase client not initialized. Cannot connect to unified match channel.');
      return;
    }
    if (!matchId || !userId) {
      console.error('Match ID or User ID is missing. Cannot connect to unified match channel.');
      return;
    }

    if (this.unifiedMatchChannel) {
      console.log('Unified match channel already exists. Disconnecting before reconnecting.');
      await this.disconnectFromUnifiedMatchChannel(); // Ensure await here
    }

    this.currentMatchId = matchId; // Set them before subscribe attempts
    this.currentUserIdInMatch = userId;

    const channelName = `unified_match_${matchId}`;
    console.log(`Attempting to connect to unified match channel: ${channelName} for user ${userId}`);

    this.unifiedMatchChannel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Do not receive broadcasts sent by this client
        presence: { key: userId }    // Unique key for this client's presence
      }
    });

    this.unifiedMatchChannel.on('presence', { event: 'sync' }, () => {
      console.log(`Presence sync on ${channelName}. Current state:`, this.unifiedMatchChannel.presenceState());
    });

    this.unifiedMatchChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log(`Presence join on ${channelName}: ${key} joined. New presences:`, newPresences);
    });

    this.unifiedMatchChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log(`Presence leave on ${channelName}: ${key} left. Left presences:`, leftPresences);
    });

    this.unifiedMatchChannel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to unified match channel: ${channelName}`);
        this.broadcastTrackerStatus({ status: 'active', action: 'Connected to match channel' });
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Failed to subscribe to unified match channel: ${channelName}`, err);
        // this.unifiedMatchChannel = null; // Don't nullify here, disconnect handles it
      } else if (status === 'TIMED_OUT') {
        console.warn(`Subscription timed out for unified match channel: ${channelName}`, err);
      } else if (status === 'CLOSED') {
        console.log(`Unified match channel ${channelName} closed.`);
      } else {
        console.log(`Unified match channel status (${channelName}): ${status}`, err ? err : '');
      }
    });
  }

  async disconnectFromUnifiedMatchChannel() {
    if (this.unifiedMatchChannel) {
      console.log(`Disconnecting from unified match channel: ${this.unifiedMatchChannel.topic}`);
      // Broadcast 'inactive' status before unsubscribing
      // Ensure currentMatchId and currentUserIdInMatch are still set for this last broadcast
      if (this.currentMatchId && this.currentUserIdInMatch) {
          this.broadcastTrackerStatus({ status: 'inactive', action: 'Disconnected from match channel' });
      } else {
          console.warn("Cannot broadcast inactive status: currentMatchId or currentUserIdInMatch is null.");
      }

      try {
        const status = await this.unifiedMatchChannel.unsubscribe();
        console.log(`Unsubscribed from unified match channel ${this.unifiedMatchChannel.topic}, status:`, status);
      } catch (error) {
        console.error(`Error unsubscribing from unified match channel ${this.unifiedMatchChannel.topic}:`, error);
      } finally {
        if (this.supabase && typeof this.supabase.removeChannel === 'function') {
          await this.supabase.removeChannel(this.unifiedMatchChannel); // Ensure it's awaited if it's async
        }
        this.unifiedMatchChannel = null;
        console.log('Unified match channel object removed.');
        // Do NOT nullify this.currentMatchId or this.currentUserIdInMatch here,
        // as they might be needed if the user logs out and then logs back in to the same match.
        // Let logout or new match tracking initiation handle those.
      }
    } else {
      console.log('No active unified match channel to disconnect.');
    }
  }

  broadcastTrackerStatus({ status, action, battery_level = null, network_quality = null }) {
    if (!this.unifiedMatchChannel) {
      // console.warn('Cannot broadcast tracker status: No unified match channel.');
      return;
    }
    if (!this.currentMatchId || !this.currentUserIdInMatch) {
      console.warn('Cannot broadcast tracker status: Missing matchId or userIdInMatch.');
      return;
    }

    const now = Date.now();
    if (now - this.lastBroadcastTimestamp < 3000 && action !== 'Disconnected from match channel') { // Allow disconnect message to bypass throttle
      // console.log('Broadcast throttled for action:', action);
      return;
    }

    const payload = {
      type: 'tracker_status', // Matches the event in useUnifiedTrackerConnection
      user_id: this.currentUserIdInMatch,
      status: status, // 'active', 'inactive', 'recording'
      action: action, // e.g., "Watching video", "Logged event: Goal"
      timestamp: new Date(now).toISOString(),
      battery_level: battery_level,
      network_quality: network_quality,
      source: 'chrome_extension'
    };

    console.log('Broadcasting tracker status:', payload, 'to channel', this.unifiedMatchChannel.topic);
    this.unifiedMatchChannel.send({
      type: 'broadcast',
      event: 'tracker_status', // This is the event name listened for by other clients
      payload: payload
    }).catch(error => {
        console.error('Error broadcasting tracker status:', error);
    });
    this.lastBroadcastTimestamp = now;
  }
}

// Initialize background script
new TrackerBackground();
