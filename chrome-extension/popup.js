
class TrackerPopup {
  constructor() {
    // Define Supabase constants (replace with your actual URL and Key)
    this.SUPABASE_URL = 'https://itwnghrwolvydupxmnqw.supabase.co';
    this.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0d25naHJ3b2x2eWR1cHhtbnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0OTQ1MzAsImV4cCI6MjA0OTA3MDUzMH0.kYGz7VengZjUvokGlAE4dDSEbrFKbg2fq09RuTNv31k';
    
    // Check if Supabase is available and initialize client
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      try {
        this.supabase = supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
      } catch (e) {
        console.error('Failed to create Supabase client:', e);
        this.supabase = null;
      }
    } else {
      console.error('Supabase library not loaded. Make sure supabase.js is included.');
      this.supabase = null;
    }

    this.initializeElements();
    this.setupEventListeners();
    this.checkAuthState();
  }

  initializeElements() {
    this.elements = {
      // Auth elements
      loginForm: document.getElementById('loginForm'),
      emailInput: document.getElementById('email'),
      passwordInput: document.getElementById('password'),
      loginBtn: document.getElementById('loginBtn'),
      loginError: document.getElementById('loginError'),
      userInfo: document.getElementById('userInfo'),
      userEmailDisplay: document.getElementById('userEmail'),
      logoutBtn: document.getElementById('logoutBtn'),

      // Dashboard elements
      dashboardSection: document.getElementById('dashboardSection'),
      notificationsSection: document.getElementById('notificationsSection'),
      notificationsList: document.getElementById('notificationsList'),
      loadingNotifications: document.getElementById('loadingNotifications'),
      noNotifications: document.getElementById('noNotifications'),

      // Manual match tracking elements
      manualMatchSection: document.getElementById('manualMatchSection'),
      userProvidedMatchId: document.getElementById('userProvidedMatchId'),
      startMatchTrackingBtn: document.getElementById('startMatchTrackingBtn'),
      matchTrackingError: document.getElementById('matchTrackingError'),

      // Status elements
      connectionStatus: document.getElementById('connectionStatus'),
      statusIndicator: document.getElementById('statusIndicator'),
      statusText: document.getElementById('statusText'),
      statusInfo: document.getElementById('statusInfo')
    };
    this.currentUserId = null;
    this.notifications = [];
  }

  setupEventListeners() {
    // Auth event listeners
    if (this.elements.loginBtn) {
        this.elements.loginBtn.addEventListener('click', () => this.handleLogin());
    }
    if (this.elements.logoutBtn) {
        this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
    }
    if (this.elements.startMatchTrackingBtn) {
        this.elements.startMatchTrackingBtn.addEventListener('click', () => this.handleManualMatchTracking());
    }
  }

  showStatus(message, type) {
    this.elements.statusInfo.textContent = message;
    this.elements.statusInfo.className = `status-info ${type}`;
    
    setTimeout(() => {
      this.elements.statusInfo.className = 'status-info';
      if (this.currentUserId) {
        this.elements.statusInfo.textContent = 'Dashboard loaded - ready for tracking';
      } else {
        this.elements.statusInfo.textContent = 'Please log in to view your match assignments';
      }
    }, 3000);
  }

  // --- Authentication Methods ---

  async handleLogin() {
    if (!this.supabase) {
      this.elements.loginError.textContent = 'System not ready. Please refresh and try again.';
      this.elements.loginError.style.display = 'block';
      return;
    }
    const email = this.elements.emailInput.value;
    const password = this.elements.passwordInput.value;
    this.elements.loginError.style.display = 'none';

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      if (data.session) {
        await chrome.storage.local.set({
          supabaseSession: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.user
          }
        });
        this.updateAuthState(data.user.email);
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'USER_LOGGED_IN', userId: data.user.id }, response => {
            if (chrome.runtime.lastError) {
              console.warn('Error sending USER_LOGGED_IN message:', chrome.runtime.lastError.message);
            } else if (response && response.success) {
              console.log('USER_LOGGED_IN message acknowledged by background.');
            }
          });
        }
      } else {
        this.elements.loginError.textContent = 'Login failed. Please try again.';
        this.elements.loginError.style.display = 'block';
      }
    } catch (error) {
      console.error('Login error:', error);
      this.elements.loginError.textContent = error.message || 'Login failed. Please check your credentials.';
      this.elements.loginError.style.display = 'block';
      this.updateAuthState(null);
    }
  }

  async handleLogout() {
    if (!this.supabase) {
        console.error('Supabase client not initialized for logout.');
        return;
    }
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await chrome.storage.local.remove('supabaseSession');
      await chrome.storage.local.remove(['currentMatchId', 'currentUserId']);
      this.currentUserId = null;
      this.notifications = [];
      this.updateAuthState(null);
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'USER_LOGGED_OUT' }, response => {
          if (chrome.runtime.lastError) {
            console.warn('Error sending USER_LOGGED_OUT message:', chrome.runtime.lastError.message);
          } else if (response && response.success) {
            console.log('USER_LOGGED_OUT message acknowledged by background.');
          }
        });
      }
    }
  }

  async checkAuthState() {
    try {
      const result = await chrome.storage.local.get(['supabaseSession']);
      if (result.supabaseSession && result.supabaseSession.access_token && result.supabaseSession.user) {
        this.currentUserId = result.supabaseSession.user.id;
        this.updateAuthState(result.supabaseSession.user.email);
      } else {
        if (this.supabase) {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session && session.user) {
                this.currentUserId = session.user.id;
                await chrome.storage.local.set({
                    supabaseSession: {
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        user: session.user
                    }
                });
                this.updateAuthState(session.user.email);
            } else {
                this.currentUserId = null;
                this.updateAuthState(null);
            }
        } else {
            this.currentUserId = null;
            this.updateAuthState(null);
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      this.currentUserId = null;
      this.updateAuthState(null);
    }
  }

  updateAuthState(userEmail) {
    if (userEmail && this.currentUserId) {
      // User is logged in - show dashboard
      this.elements.loginForm.style.display = 'none';
      this.elements.userInfo.style.display = 'block';
      this.elements.userEmailDisplay.textContent = userEmail;
      this.elements.loginError.style.display = 'none';
      this.elements.dashboardSection.style.display = 'block';
      this.elements.connectionStatus.style.display = 'block';
      this.elements.statusText.textContent = 'Connected';
      this.elements.statusIndicator.className = 'status-indicator online';
      this.elements.statusInfo.textContent = 'Dashboard loaded - ready for tracking';

      // Load notifications
      this.loadNotifications();
    } else {
      // User is not logged in
      this.elements.loginForm.style.display = 'block';
      this.elements.userInfo.style.display = 'none';
      this.elements.userEmailDisplay.textContent = '';
      this.elements.dashboardSection.style.display = 'none';
      this.elements.connectionStatus.style.display = 'none';
      this.currentUserId = null;
      this.notifications = [];
      this.elements.statusInfo.textContent = 'Please log in to view your match assignments';
    }
  }

  // --- Notifications Methods ---

  async loadNotifications() {
    if (!this.supabase || !this.currentUserId) {
      console.error('Cannot load notifications: missing supabase client or user ID');
      return;
    }

    this.elements.loadingNotifications.style.display = 'block';
    this.elements.noNotifications.style.display = 'none';

    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select(`
          id,
          match_id,
          title,
          message,
          type,
          is_read,
          created_at,
          notification_data
        `)
        .eq('user_id', this.currentUserId)
        .eq('is_read', false)
        .in('type', ['match_assignment', 'urgent_replacement_assignment'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      this.notifications = data || [];
      this.renderNotifications();
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.elements.loadingNotifications.textContent = 'Error loading notifications';
    }
  }

  async renderNotifications() {
    this.elements.loadingNotifications.style.display = 'none';

    if (this.notifications.length === 0) {
      this.elements.noNotifications.style.display = 'block';
      return;
    }

    this.elements.noNotifications.style.display = 'none';

    // Clear existing notifications
    const existingNotifications = this.elements.notificationsList.querySelectorAll('.notification-item');
    existingNotifications.forEach(item => item.remove());

    // Render each notification
    for (const notification of this.notifications) {
      const notificationElement = await this.createNotificationElement(notification);
      this.elements.notificationsList.appendChild(notificationElement);
    }
  }

  async createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = 'notification-item';
    div.style.cssText = `
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 8px;
      background: ${notification.type === 'urgent_replacement_assignment' ? '#fff5f5' : '#f8f9fa'};
      border-left: 4px solid ${notification.type === 'urgent_replacement_assignment' ? '#dc3545' : '#007bff'};
    `;

    // Get match information if available
    let matchInfo = '';
    if (notification.match_id && this.supabase) {
      try {
        const { data: matchData } = await this.supabase
          .from('matches')
          .select('name, home_team_name, away_team_name')
          .eq('id', notification.match_id)
          .single();

        if (matchData) {
          matchInfo = matchData.name || `${matchData.home_team_name} vs ${matchData.away_team_name}`;
        }
      } catch (error) {
        console.error('Error fetching match data:', error);
      }
    }

    // Attempt to extract youtube_video_id
    const youtubeVideoId = notification.notification_data?.youtube_video_id;

    let buttonHtml = `<button class="btn primary" style="font-size: 11px; padding: 4px 8px;" onclick="window.trackerPopup.handleNotificationTracking('${notification.match_id}', '${notification.id}', this)" data-match-id="${notification.match_id}" data-notification-id="${notification.id}"`;
    if (youtubeVideoId) {
      buttonHtml += ` data-youtube-video-id="${youtubeVideoId}"`;
    }
    buttonHtml += `>Start Tracking</button>`;

    div.innerHTML = `
      <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">
        ${notification.title}
        ${notification.type === 'urgent_replacement_assignment' ? '<span style="color: #dc3545;">🚨 URGENT</span>' : ''}
      </div>
      ${matchInfo ? `<div style="font-size: 11px; color: #666; margin-bottom: 6px;">${matchInfo}</div>` : ''}
      <div style="font-size: 11px; color: #555; margin-bottom: 8px;">${notification.message}</div>
      ${buttonHtml}
    `;

    return div;
  }

  async handleNotificationTracking(matchId, notificationId, buttonElement) {
    if (!matchId || matchId === 'null') {
      this.showStatus('Error: Invalid match ID', 'error');
      return;
    }
    if (!this.currentUserId) {
      this.showStatus('You must be logged in to start tracking.', 'error');
      return;
    }

    try {
      // Mark notification as read
      if (this.supabase) {
        await this.supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
      }
       // No need to remove from UI here, loadNotifications will refresh

      const youtubeVideoId = buttonElement ? buttonElement.dataset.youtubeVideoId : null;
      let targetTabId = null;

      if (youtubeVideoId) {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let currentTabVideoId = null;

        if (currentTab && currentTab.url && currentTab.url.includes('youtube.com/watch')) {
          try {
            const url = new URL(currentTab.url);
            currentTabVideoId = url.searchParams.get('v');
          } catch (e) {
            console.warn('Could not parse URL for video ID:', currentTab.url, e);
          }
        }

        if (currentTabVideoId === youtubeVideoId) {
          targetTabId = currentTab.id;
          console.log(`Correct video already open in current tab ${targetTabId}. Launching tracker there.`);
          this.showStatus(`Tracker will launch in current tab.`, 'info');
        } else {
          this.showStatus(`Opening new tab for video...`, 'info');
          console.log(`Opening new tab for YouTube video ID: ${youtubeVideoId}`);
          const newTab = await chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${youtubeVideoId}`, active: true });
          targetTabId = newTab.id;
          // IMPORTANT: This delay is a simplification. A more robust solution
          // would use chrome.tabs.onUpdated to ensure the tab is fully loaded
          // and content scripts are injected before sending the message.
          await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5-second delay
          console.log(`New tab ${targetTabId} should be ready. Launching tracker.`);
        }
      } else {
        // No youtube_video_id from notification, try to use current tab if it's a YouTube watch page
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (currentTab && currentTab.url && currentTab.url.includes('youtube.com/watch')) {
          targetTabId = currentTab.id;
          console.log('No YouTube video ID in notification, but current tab is a YouTube watch page. Attempting to launch tracker there.');
          this.showStatus('Tracker will attempt to launch in current tab.', 'info');
        } else {
          this.showStatus('Cannot start tracking. No specific YouTube video in notification and current tab is not a YouTube watch page.', 'error');
          console.error('Cannot start tracking. No specific YouTube video ID in notification and current tab is not a YouTube watch page.');
          this.loadNotifications(); // Refresh to show the notification again if tracking failed early
          return;
        }
      }

      // Proceed to start tracking
      await this.startTracking(matchId, youtubeVideoId, targetTabId);
      
      // Refresh notifications list
      this.loadNotifications();
    } catch (error) {
      console.error('Error handling notification tracking:', error);
      this.showStatus(`Failed to handle notification: ${error.message}`, 'error');
      this.loadNotifications(); // Ensure list is refreshed on error
    }
  }

  async handleManualMatchTracking() {
    this.elements.matchTrackingError.style.display = 'none';
    const userProvidedMatchId = this.elements.userProvidedMatchId.value.trim();
    
    if (!userProvidedMatchId) {
      this.elements.matchTrackingError.textContent = 'Please enter a match code.';
      this.elements.matchTrackingError.style.display = 'block';
      return;
    }
    // For manual tracking, youtubeVideoId is null, targetTabId will be determined by launchTrackerOnYouTube or be the active tab.
    await this.startTracking(userProvidedMatchId, null, null);
  }

  async startTracking(matchId, youtubeVideoId = null, targetTabId = null) {
    if (!this.currentUserId) {
      this.showStatus('Please log in first', 'error');
      return;
    }

    try {
      // currentMatchId and currentUserId are still relevant for the extension's state.
      await chrome.storage.local.set({
        currentMatchId: matchId,
        currentUserId: this.currentUserId
      });

      console.log(`Attempting to start tracking for match: ${matchId}, User ID: ${this.currentUserId}, YouTube Video ID: ${youtubeVideoId}, Target Tab ID: ${targetTabId}`);
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'START_MATCH_TRACKING',
          matchId: matchId,
          userId: this.currentUserId,
          youtubeVideoId: youtubeVideoId // Pass youtubeVideoId to background
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('Error sending START_MATCH_TRACKING message:', chrome.runtime.lastError.message);
            this.showStatus(`Error starting tracking: ${chrome.runtime.lastError.message}`, 'error');
          } else if (response && response.success) {
            console.log('START_MATCH_TRACKING message acknowledged by background.');
            this.showStatus('Tracking started successfully!', 'success');
            this.launchTrackerOnYouTube(matchId, youtubeVideoId, targetTabId);
          } else {
            this.showStatus(`Failed to start tracking. ${response?.message || ''}`, 'error');
          }
        });
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
      this.showStatus(`Error starting tracking: ${error.message}`, 'error');
    }
  }

  async launchTrackerOnYouTube(matchId, youtubeVideoId = null, targetTabId = null) {
    console.log(`Launching tracker on YouTube. Match ID: ${matchId}, YouTube Video ID: ${youtubeVideoId}, Target Tab ID: ${targetTabId}`);
    const launchData = {
      matchId: matchId,
      userId: this.currentUserId,
      youtubeVideoId: youtubeVideoId
    };

    if (targetTabId) {
      try {
        await chrome.tabs.sendMessage(targetTabId, { type: 'LAUNCH_TRACKER', data: launchData });
        this.showStatus('Tracker launch signal sent to target tab.', 'success');
      } catch (e) {
          // This catch block might be triggered if sending message immediately after tab creation fails.
          // The delay in handleNotificationTracking is meant to mitigate this.
          console.error(`Error launching tracker on target tab ${targetTabId}:`, e.message);
          this.showStatus(`Error launching tracker on target tab. ${e.message}`, 'error');
      }
    } else {
      // Fallback: if targetTabId couldn't be determined (e.g. manual tracking without specific video)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'LAUNCH_TRACKER', data: launchData });
          this.showStatus('Tracker launch signal sent to active tab.', 'success');
        } catch (e) {
          console.error('Error launching tracker on active tab:', e.message);
          this.showStatus(`Error launching tracker. Ensure you are on a YouTube watch page. ${e.message}`, 'error');
        }
      } else {
        this.showStatus('Could not launch tracker: Not on a YouTube watch page or no specific tab targeted.', 'error');
      }
    }
    // Close popup after attempting to launch
    setTimeout(() => {
      window.close();
    }, 1500); // Delay to allow user to see messages
  }
}

// Make instance globally available for onclick handlers
window.trackerPopup = null;

// Wait for DOM and Supabase to be loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit to ensure Supabase script is fully loaded
  setTimeout(() => {
    window.trackerPopup = new TrackerPopup();
  }, 100);
});
