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
    this.loadStoredData();
    this.setupEventListeners();
    this.checkConnectionStatus();
    this.checkAuthState();
  }

  initializeElements() {
    this.elements = {
      // Existing elements with updated IDs to match new labels
      matchId: document.getElementById('matchId'),
      apiUrl: document.getElementById('apiUrl'),
      authToken: document.getElementById('authToken'),
      connectBtn: document.getElementById('connectBtn'),
      launchBtn: document.getElementById('launchBtn'),
      statusIndicator: document.getElementById('statusIndicator'),
      statusText: document.getElementById('statusText'),
      statusInfo: document.getElementById('statusInfo'),
      settingsBtn: document.getElementById('settingsBtn'),
      helpBtn: document.getElementById('helpBtn'),

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

      // Form sections for conditional display
      formSection: document.getElementById('formSection'),
      buttonGroup: document.getElementById('buttonGroup'),
      quickActions: document.getElementById('quickActions')
    };
    this.currentUserId = null;
  }

  async loadStoredData() {
    try {
      const data = await chrome.storage.sync.get(['matchId', 'apiUrl', 'authToken', 'isConnected']);
      
      if (data.matchId) this.elements.matchId.value = data.matchId;
      if (data.apiUrl) this.elements.apiUrl.value = data.apiUrl;
      if (data.authToken) this.elements.authToken.value = data.authToken;
      
      if (data.isConnected) {
        this.updateConnectionStatus(true);
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  }

  setupEventListeners() {
    this.elements.connectBtn.addEventListener('click', () => this.handleConnect());
    this.elements.launchBtn.addEventListener('click', () => this.handleLaunch());
    this.elements.settingsBtn.addEventListener('click', () => this.handleSettings());
    this.elements.helpBtn.addEventListener('click', () => this.handleHelp());

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

    // Auto-save inputs
    ['matchId', 'apiUrl', 'authToken'].forEach(field => {
      this.elements[field].addEventListener('input', () => this.saveData());
    });
  }

  async saveData() {
    try {
      await chrome.storage.sync.set({
        matchId: this.elements.matchId.value,
        apiUrl: this.elements.apiUrl.value,
        authToken: this.elements.authToken.value
      });
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async handleConnect() {
    const matchId = this.elements.matchId.value.trim();
    const apiUrl = this.elements.apiUrl.value.trim();
    const authToken = this.elements.authToken.value.trim();

    if (!matchId || !apiUrl) {
      this.showStatus('Please fill in Game Number and Server Address', 'error');
      return;
    }

    this.elements.connectBtn.classList.add('loading');
    this.elements.connectBtn.textContent = 'Connecting...';

    try {
      // Test connection to the API
      const response = await fetch(`${apiUrl}/matches/${matchId}`, {
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await chrome.storage.sync.set({ isConnected: true });
        this.updateConnectionStatus(true);
        this.showStatus('Connected successfully! Ready to track.', 'success');
        
        // Send connection data to background script
        chrome.runtime.sendMessage({
          type: 'CONNECTION_ESTABLISHED',
          data: { matchId, apiUrl, authToken }
        });
      } else {
        throw new Error(`Connection failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      this.showStatus('Could not connect. Please check your settings and try again.', 'error');
      this.updateConnectionStatus(false);
    } finally {
      this.elements.connectBtn.classList.remove('loading');
      this.elements.connectBtn.textContent = 'Connect to System';
    }
  }

  async handleLaunch() {
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to launch the tracker
      chrome.tabs.sendMessage(tab.id, {
        type: 'LAUNCH_TRACKER',
        data: {
          matchId: this.elements.matchId.value,
          apiUrl: this.elements.apiUrl.value,
          authToken: this.elements.authToken.value
        }
      });

      // Close popup
      window.close();
    } catch (error) {
      console.error('Error launching tracker:', error);
      this.showStatus('Failed to start tracking', 'error');
    }
  }

  handleSettings() {
    chrome.tabs.create({ url: 'chrome-extension://' + chrome.runtime.id + '/settings.html' });
  }

  handleHelp() {
    chrome.tabs.create({ url: 'chrome-extension://' + chrome.runtime.id + '/help.html' });
  }

  updateConnectionStatus(isConnected) {
    if (isConnected) {
      this.elements.statusIndicator.className = 'status-indicator online';
      this.elements.statusText.textContent = 'Connected';
      this.elements.launchBtn.disabled = false;
      this.elements.connectBtn.textContent = 'Reconnect';
    } else {
      this.elements.statusIndicator.className = 'status-indicator offline';
      this.elements.statusText.textContent = 'Offline';
      this.elements.launchBtn.disabled = true;
      this.elements.connectBtn.textContent = 'Connect to System';
    }
  }

  showStatus(message, type) {
    this.elements.statusInfo.textContent = message;
    this.elements.statusInfo.className = `status-info ${type}`;
    
    setTimeout(() => {
      this.elements.statusInfo.className = 'status-info';
      this.elements.statusInfo.textContent = 'Ready to connect to match tracking system';
    }, 3000);
  }

  async checkConnectionStatus() {
    try {
      const data = await chrome.storage.sync.get(['isConnected']);
      this.updateConnectionStatus(data.isConnected || false);
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
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
      this.elements.loginForm.style.display = 'none';
      this.elements.userInfo.style.display = 'block';
      this.elements.userEmailDisplay.textContent = userEmail;
      this.elements.loginError.style.display = 'none';
      if (this.elements.matchTrackingSection) this.elements.matchTrackingSection.style.display = 'block';

      // Show elements that require login
      this.elements.connectionStatus.style.display = 'block';
      if (this.elements.formSection) this.elements.formSection.style.display = 'block';
      if (this.elements.buttonGroup) this.elements.buttonGroup.style.display = 'flex';
      if (this.elements.quickActions) this.elements.quickActions.style.display = 'flex';
      if (this.elements.statusInfo) this.elements.statusInfo.textContent = 'Ready to start tracking matches.';

    } else {
      this.elements.loginForm.style.display = 'block';
      this.elements.userInfo.style.display = 'none';
      this.elements.userEmailDisplay.textContent = '';
      if (this.elements.matchTrackingSection) this.elements.matchTrackingSection.style.display = 'none';
      this.currentUserId = null;

      // Hide elements that require login
      this.elements.connectionStatus.style.display = 'none';
      if (this.elements.formSection) this.elements.formSection.style.display = 'none';
      if (this.elements.buttonGroup) this.elements.buttonGroup.style.display = 'none';
      if (this.elements.quickActions) this.elements.quickActions.style.display = 'none';
      if (this.elements.statusInfo) this.elements.statusInfo.textContent = 'Please log in to use the tracker.';
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
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TrackerPopup();
});
