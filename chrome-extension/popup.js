
class TrackerPopup {
  constructor() {
    // Define Supabase constants (replace with your actual URL and Key)
    this.SUPABASE_URL = 'YOUR_SUPABASE_URL';
    this.SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    try {
      this.supabase = supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
    } catch (e) {
      console.error('Supabase client initialization failed. Make sure Supabase JS is loaded.', e);
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

      // Match Tracking elements
      matchTrackingSection: document.getElementById('matchTrackingSection'),
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
        this.elements.startMatchTrackingBtn.addEventListener('click', () => this.handleStartMatchTracking());
    }
  }

  showStatus(message, type) {
    this.elements.statusInfo.textContent = message;
    this.elements.statusInfo.className = `status-info ${type}`;
    
    setTimeout(() => {
      this.elements.statusInfo.className = 'status-info';
      if (this.currentUserId) {
        this.elements.statusInfo.textContent = 'Ready to start tracking matches';
      } else {
        this.elements.statusInfo.textContent = 'Please log in to start tracking matches';
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
      // User is logged in
      this.elements.loginForm.style.display = 'none';
      this.elements.userInfo.style.display = 'block';
      this.elements.userEmailDisplay.textContent = userEmail;
      this.elements.loginError.style.display = 'none';
      this.elements.matchTrackingSection.style.display = 'block';
      this.elements.connectionStatus.style.display = 'block';
      this.elements.statusText.textContent = 'Ready';
      this.elements.statusIndicator.className = 'status-indicator online';
      this.elements.statusInfo.textContent = 'Ready to start tracking matches';
    } else {
      // User is not logged in
      this.elements.loginForm.style.display = 'block';
      this.elements.userInfo.style.display = 'none';
      this.elements.userEmailDisplay.textContent = '';
      this.elements.matchTrackingSection.style.display = 'none';
      this.elements.connectionStatus.style.display = 'none';
      this.currentUserId = null;
      this.elements.statusInfo.textContent = 'Please log in to start tracking matches';
    }
  }

  async handleStartMatchTracking() {
    this.elements.matchTrackingError.style.display = 'none';
    if (!this.currentUserId) {
      this.elements.matchTrackingError.textContent = 'Please log in first.';
      this.elements.matchTrackingError.style.display = 'block';
      return;
    }
    const userProvidedMatchId = this.elements.userProvidedMatchId.value.trim();
    if (!userProvidedMatchId) {
      this.elements.matchTrackingError.textContent = 'Please enter the match code from the main app.';
      this.elements.matchTrackingError.style.display = 'block';
      return;
    }

    try {
      await chrome.storage.local.set({
        currentMatchId: userProvidedMatchId,
        currentUserId: this.currentUserId
      });

      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'START_MATCH_TRACKING', matchId: userProvidedMatchId, userId: this.currentUserId }, response => {
          if (chrome.runtime.lastError) {
            console.error('Error sending START_MATCH_TRACKING message:', chrome.runtime.lastError.message);
            this.elements.matchTrackingError.textContent = `Error starting tracking: ${chrome.runtime.lastError.message}`;
            this.elements.matchTrackingError.style.display = 'block';
          } else if (response && response.success) {
            console.log('START_MATCH_TRACKING message acknowledged by background.');
            this.elements.matchTrackingError.textContent = 'Match tracking started successfully!';
            this.elements.matchTrackingError.style.color = 'green';
            this.elements.matchTrackingError.style.display = 'block';
            
            // Try to launch tracker on current YouTube page
            this.launchTrackerOnYouTube();
          } else {
            this.elements.matchTrackingError.textContent = 'Failed to start tracking. Please try again.';
            this.elements.matchTrackingError.style.display = 'block';
          }
        });
      }
    } catch (error) {
      console.error('Error saving match tracking data to storage:', error);
      this.elements.matchTrackingError.textContent = `Storage error: ${error.message}`;
      this.elements.matchTrackingError.style.display = 'block';
    }
  }

  async launchTrackerOnYouTube() {
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if it's a YouTube page
      if (tab.url && tab.url.includes('youtube.com/watch')) {
        // Send message to content script to launch the tracker
        chrome.tabs.sendMessage(tab.id, {
          type: 'LAUNCH_TRACKER',
          data: {
            matchId: this.elements.userProvidedMatchId.value,
            userId: this.currentUserId
          }
        });

        // Close popup after launching
        setTimeout(() => {
          window.close();
        }, 1000);
      }
    } catch (error) {
      console.error('Error launching tracker on YouTube:', error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TrackerPopup();
});
