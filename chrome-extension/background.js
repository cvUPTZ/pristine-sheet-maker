
class TrackerBackground {
  constructor() {
    this.setupEventListeners();
    this.connectionData = null;
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

        case 'RECORD_EVENT':
          const result = await this.recordEvent(message.data);
          sendResponse(result);
          break;

        case 'GET_CONNECTION_DATA':
          const data = await this.getConnectionData();
          sendResponse(data);
          break;

        case 'SHOW_NOTIFICATION':
          await this.showNotification(message.data);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
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

  async recordEvent(eventData) {
    if (!this.connectionData) {
      const stored = await this.getConnectionData();
      if (!stored) {
        throw new Error('No connection established');
      }
      this.connectionData = stored;
    }

    try {
      const response = await fetch(`${this.connectionData.apiUrl}/match-events`, {
        method: 'POST',
        headers: {
          'Authorization': this.connectionData.authToken ? `Bearer ${this.connectionData.authToken}` : '',
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

  async showNotification(data) {
    const notificationId = `tracker_${Date.now()}`;
    
    await chrome.notifications.create(notificationId, {
      type: data.type || 'basic',
      iconUrl: 'icons/icon48.png',
      title: data.title,
      message: data.message
    });

    // Auto-clear notification after 3 seconds
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 3000);
  }

  handleNotificationClick(notificationId) {
    // Handle notification clicks if needed
    chrome.notifications.clear(notificationId);
  }
}

// Initialize background script
new TrackerBackground();
