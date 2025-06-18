
class TrackerPopup {
  constructor() {
    this.initializeElements();
    this.loadStoredData();
    this.setupEventListeners();
    this.checkConnectionStatus();
  }

  initializeElements() {
    this.elements = {
      matchId: document.getElementById('matchId'),
      apiUrl: document.getElementById('apiUrl'),
      authToken: document.getElementById('authToken'),
      connectBtn: document.getElementById('connectBtn'),
      launchBtn: document.getElementById('launchBtn'),
      statusIndicator: document.getElementById('statusIndicator'),
      statusText: document.getElementById('statusText'),
      statusInfo: document.getElementById('statusInfo'),
      settingsBtn: document.getElementById('settingsBtn'),
      helpBtn: document.getElementById('helpBtn')
    };
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
      this.showStatus('Please fill in Match ID and API URL', 'error');
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
        this.showStatus('Connected successfully!', 'success');
        
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
      this.showStatus('Connection failed. Please check your settings.', 'error');
      this.updateConnectionStatus(false);
    } finally {
      this.elements.connectBtn.classList.remove('loading');
      this.elements.connectBtn.textContent = 'Connect';
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
      this.showStatus('Failed to launch tracker', 'error');
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
      this.elements.connectBtn.textContent = 'Connect';
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
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TrackerPopup();
});
