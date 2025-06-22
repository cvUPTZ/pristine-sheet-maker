
// Import Supabase client library
try {
  importScripts('supabase.js');
} catch (e) {
  console.error('Failed to import supabase.js:', e);
}

class TrackerBackground {
  constructor() {
    // Use the actual Supabase project URL and anon key
    this.SUPABASE_URL = 'https://mnlioiefwzpzucacehpn.supabase.co';
    this.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ubGlvaWVmd3pwenVjYWNlaHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MjA4MDAsImV4cCI6MjA1MDE5NjgwMH0.L8d5Q9Cg--xpgFIBgcg4xQZmS_9a7hRB6iEy_qYdpH8';
    this.supabase = null;
    this.realtimeChannel = null;
    this.userId = null;
    this.unifiedMatchChannel = null;
    this.currentMatchId = null;
    this.currentUserIdInMatch = null;
    this.lastBroadcastTimestamp = 0;

    this._initializeSupabaseClient();
    this.setupEventListeners();
    this.connectionData = null;
    this._checkCurrentUserAndSetupRealtime();
    this._checkCurrentMatchAndSetupChannel();
  }

  _initializeSupabaseClient() {
    if (typeof self !== 'undefined' && self.supabase && typeof self.supabase.createClient === 'function') {
      try {
        this.supabase = self.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully in background script.');
      } catch (error) {
        console.error('Error initializing Supabase client:', error);
      }
    } else {
      console.error('Supabase client is not available in background script. Ensure supabase.js is imported.');
    }
  }

  async _checkCurrentUserAndSetupRealtime() {
    try {
      const result = await chrome.storage.local.get('supabaseSession');
      if (result.supabaseSession && result.supabaseSession.user) {
        const storedUser = result.supabaseSession.user;
        if (storedUser && storedUser.id) {
          this.userId = storedUser.id;
          console.log('Current user ID for notifications:', this.userId);
          this.initializeRealtimeNotifications();
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
        this.currentUserIdInMatch = result.currentUserId;
        console.log(`Found stored match: ${this.currentMatchId} for user: ${this.currentUserIdInMatch}. Reconnecting to unified channel.`);
        this.connectToUnifiedMatchChannel(this.currentMatchId, this.currentUserIdInMatch);
      } else {
        console.log('No current match tracking data found in storage.');
      }
    } catch (error) {
      console.error('Error checking current match from storage:', error);
    }
  }

  setupEventListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    if (chrome.notifications && chrome.notifications.onClicked) {
      chrome.notifications.onClicked.addListener((notificationId) => {
        this.handleNotificationClick(notificationId);
      });
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'CONNECTION_ESTABLISHED':
          this.connectionData = message.data;
          await this.storeConnectionData(message.data);
          sendResponse({ success: true });
          break;

        case 'USER_LOGGED_IN':
          console.log('USER_LOGGED_IN message received in background');
          this.userId = message.userId;
          if (this.userId) {
            this.initializeRealtimeNotifications();
          } else {
            await this._checkCurrentUserAndSetupRealtime();
          }
          sendResponse({ success: true });
          break;

        case 'USER_LOGGED_OUT':
          console.log('USER_LOGGED_OUT message received in background');
          await this.cleanupRealtimeNotifications();
          await this.disconnectFromUnifiedMatchChannel();
          this.userId = null;
          this.currentMatchId = null;
          this.currentUserIdInMatch = null;
          await chrome.storage.local.remove(['currentMatchId', 'currentUserId']);
          sendResponse({ success: true });
          break;

        case 'START_MATCH_TRACKING':
          console.log('START_MATCH_TRACKING message received', message);
          const youtubeVideoIdFromMessage = message.youtubeVideoId;
          console.log('Extracted youtubeVideoId from message:', youtubeVideoIdFromMessage);
          
          if (message.matchId && message.userId) {
            this.currentMatchId = message.matchId;
            this.currentUserIdInMatch = message.userId;

            if (!this.userId) this.userId = message.userId;

            console.log(`Background: START_MATCH_TRACKING for Match ID: ${this.currentMatchId}, User ID: ${this.currentUserIdInMatch}, YouTube Video ID: ${youtubeVideoIdFromMessage}`);

            await this.connectToUnifiedMatchChannel(this.currentMatchId, this.currentUserIdInMatch);

            await chrome.storage.local.set({
              currentMatchId: this.currentMatchId,
              currentUserId: this.currentUserIdInMatch,
              currentTargetVideoId: youtubeVideoIdFromMessage
            });

            chrome.tabs.query({}, (tabs) => {
              tabs.forEach(tab => {
                if (tab.url && tab.url.includes('youtube.com/watch') && tab.id) {
                  chrome.tabs.sendMessage(tab.id, {
                    type: 'SET_ACTIVE_MATCH_CONTEXT',
                    matchId: this.currentMatchId,
                    userId: this.currentUserIdInMatch,
                    youtubeVideoId: youtubeVideoIdFromMessage
                  }, response => {
                    if (chrome.runtime.lastError) {
                      // Silently handle errors
                    } else if (response && response.success) {
                      console.log(`Background: SET_ACTIVE_MATCH_CONTEXT acknowledged by content script on tab ${tab.id}.`);
                    }
                  });
                }
              });
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
              status: 'recording',
              action: `Event: ${message.data.eventType}`
            });
          }
          sendResponse(eventResult);
          break;

        case 'STOP_MATCH_TRACKING':
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
          await this.showNotification(message.data.title, message.data.message, message.data.type, message.data.notificationId);
          sendResponse({ success: true });
          break;

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
            this.broadcastTrackerStatus({ status: 'active', action: 'Tab focused/active' });
          }
          sendResponse({ success: true });
          break;

        case 'GET_TRACKER_ASSIGNMENTS':
          (async () => {
            console.log('Background: GET_TRACKER_ASSIGNMENTS received for matchId:', message.data?.matchId, 'userId:', message.data?.userId);
            if (!this.supabase) {
              console.error('Supabase client not initialized. Cannot fetch tracker assignments.');
              sendResponse({ success: false, error: 'Supabase client not available.', eventTypes: [] });
              return;
            }
            if (!message.data || !message.data.matchId || !message.data.userId) {
              console.error('GET_TRACKER_ASSIGNMENTS: Missing matchId or userId in message data.');
              sendResponse({ success: false, error: 'matchId and userId are required.', eventTypes: [] });
              return;
            }

            try {
              const { data: assignments, error } = await this.supabase
                .from('match_tracker_assignments')
                .select('assigned_event_types')
                .eq('match_id', message.data.matchId)
                .eq('tracker_user_id', message.data.userId);

              if (error) {
                console.error('Error fetching tracker assignments from Supabase:', error);
                sendResponse({ success: false, error: error.message, eventTypes: [] });
                return;
              }

              let allEventTypes = [];
              if (assignments && assignments.length > 0) {
                assignments.forEach(assignment => {
                  if (assignment.assigned_event_types && Array.isArray(assignment.assigned_event_types)) {
                    allEventTypes.push(...assignment.assigned_event_types);
                  }
                });
              }

              const uniqueEventTypes = [...new Set(allEventTypes)];
              console.log('Background: Sending tracker assignments:', uniqueEventTypes);
              sendResponse({ success: true, eventTypes: uniqueEventTypes });

            } catch (e) {
              console.error('Exception while fetching tracker assignments:', e);
              sendResponse({ success: false, error: e.message || 'An unexpected error occurred.', eventTypes: [] });
            }
          })();
          break;

        case 'PING':
          sendResponse({ success: true, message: 'pong' });
          break;

        default:
          sendResponse({ error: 'Unknown message type in background' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      await chrome.storage.sync.set({
        settings: {
          autoConnect: false,
          notifications: true,
          keyboardShortcuts: true,
          theme: 'light'
        }
      });

      await this.showNotification(
        'Football Tracker Installed!',
        'Click the extension icon to get started with match tracking.',
        'basic'
      );
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

  async getAuthToken() {
    try {
      const result = await chrome.storage.local.get(['supabaseSession']);
      if (result.supabaseSession && result.supabaseSession.access_token) {
        return result.supabaseSession.access_token;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving auth token:', error);
      return null;
    }
  }

  async recordEvent(eventData) {
    if (!this.supabase) {
      console.error('Supabase client not available for recording event');
      return { success: false, error: 'Supabase client not available' };
    }

    const authToken = await this.getAuthToken();
    if (!authToken) {
      console.error('No auth token available for recording event');
      return { success: false, error: 'Authentication required' };
    }

    try {
      // Record event directly to Supabase
      const { data, error } = await this.supabase
        .from('match_events')
        .insert({
          match_id: this.currentMatchId,
          event_type: eventData.eventType,
          timestamp: new Date().toISOString(),
          video_time: eventData.videoTime || 0,
          video_id: eventData.videoId,
          event_data: eventData.details || {},
          user_id: this.userId
        });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      await this.showNotification(
        'Event Recorded',
        `${eventData.eventType} event recorded successfully`,
        'basic'
      );

      return { success: true, data: data };
    } catch (error) {
      console.error('Error recording event:', error);
      
      await this.showNotification(
        'Recording Failed',
        `Failed to record ${eventData.eventType} event`,
        'basic'
      );

      return { success: false, error: error.message };
    }
  }

  async showNotification(title, message, type = 'basic', notificationId = `tracker_${Date.now()}`) {
    if (!chrome.notifications) {
      console.warn('Notifications API not available');
      return;
    }

    try {
      await chrome.notifications.create(notificationId, {
        type: type,
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: 2
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  handleNotificationClick(notificationId) {
    console.log('Notification clicked:', notificationId);
    if (notificationId.startsWith('match_')) {
      // Could open specific match URL
    } else {
      chrome.action.openPopup();
    }
    chrome.notifications.clear(notificationId);
  }

  // Realtime notification methods with fixed WebSocket usage
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
    try {
      this.realtimeChannel = this.supabase
        .channel(userChannelName, { config: { broadcast: { self: false } } })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${this.userId}`
          },
          (payload) => {
            console.log('New notification received:', payload);
            if (payload.new) {
              const notificationData = payload.new;
              const title = notificationData.title || 'New Match Notification';
              const message = notificationData.message || `You have a new update for match ${notificationData.match_id || ''}.`;
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
    } catch (error) {
      console.error('Error setting up realtime notifications:', error);
    }
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

  // Unified match channel methods with fixed WebSocket usage
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
      await this.disconnectFromUnifiedMatchChannel();
    }

    this.currentMatchId = matchId;
    this.currentUserIdInMatch = userId;

    const channelName = `unified_match_${matchId}`;
    console.log(`Attempting to connect to unified match channel: ${channelName} for user ${userId}`);

    try {
      this.unifiedMatchChannel = this.supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: userId }
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
        } else if (status === 'TIMED_OUT') {
          console.warn(`Subscription timed out for unified match channel: ${channelName}`, err);
        } else if (status === 'CLOSED') {
          console.log(`Unified match channel ${channelName} closed.`);
        } else {
          console.log(`Unified match channel status (${channelName}): ${status}`, err ? err : '');
        }
      });
    } catch (error) {
      console.error('Error connecting to unified match channel:', error);
    }
  }

  async disconnectFromUnifiedMatchChannel() {
    if (this.unifiedMatchChannel) {
      console.log(`Disconnecting from unified match channel: ${this.unifiedMatchChannel.topic}`);
      
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
          await this.supabase.removeChannel(this.unifiedMatchChannel);
        }
        this.unifiedMatchChannel = null;
        console.log('Unified match channel object removed.');
      }
    } else {
      console.log('No active unified match channel to disconnect.');
    }
  }

  broadcastTrackerStatus({ status, action, battery_level = null, network_quality = null }) {
    if (!this.unifiedMatchChannel) {
      return;
    }
    if (!this.currentMatchId || !this.currentUserIdInMatch) {
      console.warn('Cannot broadcast tracker status: Missing matchId or userIdInMatch.');
      return;
    }

    const now = Date.now();
    if (now - this.lastBroadcastTimestamp < 3000 && action !== 'Disconnected from match channel') {
      return;
    }

    const payload = {
      type: 'tracker_status',
      user_id: this.currentUserIdInMatch,
      status: status,
      action: action,
      timestamp: new Date(now).toISOString(),
      battery_level: battery_level,
      network_quality: network_quality,
      source: 'chrome_extension'
    };

    console.log('Broadcasting tracker status:', payload, 'to channel', this.unifiedMatchChannel.topic);
    this.unifiedMatchChannel.send({
      type: 'broadcast',
      event: 'tracker_status',
      payload: payload
    }).catch(error => {
      console.error('Error broadcasting tracker status:', error);
    });
    this.lastBroadcastTimestamp = now;
  }
}

// Initialize background script
new TrackerBackground();
