class YouTubeFootballTracker {
  constructor() {
    this.trackerWidget = null;
    this.isActive = false;
    this.videoElement = null;
    this.videoTitle = '';
    this.videoId = '';
    this.activeMatchIdForTracking = null; // Added property
    this.isTabFocused = !document.hidden; // Initial tab focus state
    this.setupMessageListener();
    this.initializeYouTubeIntegration();
    this.setupVisibilityChangeListener(); // Added call
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      // Return true for async sendResponse, but only if sendResponse is actually used asynchronously.
      // For most of these, it's synchronous.
      if (message.type === 'GET_VIDEO_INFO') {
        return true; // This one might be async if DOM queries are slow
      }
    });
  }

  initializeYouTubeIntegration() {
    // Wait for YouTube to load
    this.waitForYouTube(() => {
      this.detectVideoChange();
      this.addYouTubeControls();
    });
  }

  waitForYouTube(callback) {
    if (window.location.hostname.includes('youtube.com') && document.querySelector('video')) {
      callback();
    } else {
      setTimeout(() => this.waitForYouTube(callback), 1000);
    }
  }

  detectVideoChange() {
    // Get video information
    this.videoElement = document.querySelector('video');
    this.videoId = this.extractVideoId(window.location.href);
    this.videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || 'Unknown Video';

    // Listen for URL changes (YouTube is a SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        this.onVideoChange();
      }
    }).observe(document, { subtree: true, childList: true });

    // Listen for video events
    if (this.videoElement) {
      this.videoElement.addEventListener('timeupdate', () => this.onVideoTimeUpdate());
      this.videoElement.addEventListener('play', () => this.onVideoPlay(true)); // Pass true to indicate it's a direct play event
      this.videoElement.addEventListener('pause', () => this.onVideoPause(true)); // Pass true for direct pause
    }
  }

  extractVideoId(url) {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : '';
  }

  onVideoChange() {
    // Update video information when URL changes
    const oldVideoId = this.videoId;
    setTimeout(() => {
      this.videoElement = document.querySelector('video');
      this.videoId = this.extractVideoId(window.location.href);
      this.videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || 'Unknown Video';
      
      if (this.isActive) {
        this.updateTrackerVideoInfo();
      }

      if (this.activeMatchIdForTracking && oldVideoId !== this.videoId) {
        console.log(`Video changed. Old: ${oldVideoId}, New: ${this.videoId}. Active Match ID: ${this.activeMatchIdForTracking}`);
        // Assuming a video change means navigation away from the tracked match context unless new videoId matches a new context
        // This logic might need to be more sophisticated depending on how matchId relates to videoId
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                type: 'VIDEO_NAVIGATED_AWAY',
                oldMatchId: this.activeMatchIdForTracking, // Send the matchId that was being tracked
                oldVideoId: oldVideoId,
                newVideoId: this.videoId
            });
        }
      }
    }, 1000);
  }

  addYouTubeControls() {
    // Add floating launch button
    const launchButton = document.createElement('div');
    launchButton.id = 'football-tracker-launch-btn';
    launchButton.innerHTML = `
      <button title="Launch Football Tracker">
        ⚽ Track Match
      </button>
    `;
    launchButton.addEventListener('click', () => this.quickLaunch());
    document.body.appendChild(launchButton);

    // Add styles for launch button
    // this.injectLaunchButtonStyles(); // Styles are now in content.css. Call removed.
  }

  quickLaunch() {
    if (!this.videoId) {
      alert('Please navigate to a YouTube video to start tracking');
      return;
    }

    // Quick launch with default settings
    this.launchTracker({
      matchId: this.videoId,
      videoTitle: this.videoTitle,
      apiUrl: 'https://your-api.com', // Default API URL
      authToken: ''
    });
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'LAUNCH_TRACKER':
        await this.launchTracker(message.data);
        sendResponse({ success: true });
        break;
      
      case 'CLOSE_TRACKER':
        this.closeTracker();
        sendResponse({ success: true });
        break;
        
      case 'GET_VIDEO_INFO':
        sendResponse({
          videoId: this.videoId,
          videoTitle: this.videoTitle,
          currentTime: this.videoElement?.currentTime || 0,
          isPlaying: this.videoElement ? !this.videoElement.paused : false
        });
        break;
      case 'SET_ACTIVE_MATCH_CONTEXT':
        this.activeMatchIdForTracking = message.matchId;
        console.log('Content script: Active match context set to', this.activeMatchIdForTracking);
        // When a new match tracking starts, if video is already playing, send initial status
        if (this.activeMatchIdForTracking && this.videoElement && !this.videoElement.paused && this.isTabFocused) {
            this.sendMessageToBackground({ type: 'VIDEO_PLAYING', matchId: this.activeMatchIdForTracking, videoId: this.videoId });
        } else if (this.activeMatchIdForTracking && this.isTabFocused) {
            // If tab is focused but video is not playing (or no video element yet)
            this.sendMessageToBackground({ type: 'VIDEO_PAUSED', matchId: this.activeMatchIdForTracking, videoId: this.videoId });
        }
        sendResponse({ success: true });
        break;
      default:
        // sendResponse({ error: 'Unknown message type' }); // Avoid error for messages not meant for content script
        console.log('Content script received unhandled message type or message not for it:', message.type);
    }
  }

  async launchTracker(connectionData) {
    if (this.isActive) {
      this.closeTracker();
    }

    try {
      // Create overlay container
      const overlay = document.createElement('div');
      overlay.id = 'football-tracker-overlay';
      overlay.innerHTML = `
        <div class="tracker-container">
          <div class="tracker-header">
            <h3>⚽ Football Tracker Piano</h3>
            <div class="video-info">
              <span class="video-title">${this.videoTitle}</span>
              <span class="video-time" id="tracker-video-time">00:00</span>
            </div>
            <div class="tracker-controls">
              <button id="tracker-sync" title="Sync with Video">⏱️</button>
              <button id="tracker-minimize" title="Minimize">−</button>
              <button id="tracker-close" title="Close">×</button>
            </div>
          </div>
          <div class="tracker-content">
            <div class="connection-info">
              <span class="status-dot online"></span>
              <span>Tracking: ${connectionData.matchId}</span>
            </div>
            <div class="video-controls">
              <button id="play-pause-btn" class="video-btn">⏸️</button>
              <button id="rewind-btn" class="video-btn">⏪ 10s</button>
              <button id="forward-btn" class="video-btn">⏩ 10s</button>
            </div>
            <div class="event-piano">
              <div class="piano-section">
                <h4>Primary Events</h4>
                <div class="event-buttons primary">
                  <button class="event-btn" data-event="goal">⚽ Goal</button>
                  <button class="event-btn" data-event="shot">🎯 Shot</button>
                  <button class="event-btn" data-event="pass">⚡ Pass</button>
                  <button class="event-btn" data-event="tackle">🛡️ Tackle</button>
                </div>
              </div>
              <div class="piano-section">
                <h4>Secondary Events</h4>
                <div class="event-buttons secondary">
                  <button class="event-btn" data-event="foul">⚠️ Foul</button>
                  <button class="event-btn" data-event="assist">🎯 Assist</button>
                  <button class="event-btn" data-event="save">🥅 Save</button>
                  <button class="event-btn" data-event="corner">📐 Corner</button>
                  <button class="event-btn" data-event="freeKick">⚽ Free Kick</button>
                </div>
              </div>
            </div>
            <div class="recent-events">
              <h4>Recent Events</h4>
              <div id="recent-events-list"></div>
            </div>
          </div>
        </div>
      `;

      // Add styles
      // this.injectStyles(); // Styles are now in content.css
      
      // Add overlay to page
      document.body.appendChild(overlay);
      
      // Setup event listeners
      this.setupTrackerEventListeners(overlay, connectionData);
      
      this.trackerWidget = overlay;
      this.isActive = true;

      // Start video time sync
      this.startVideoTimeSync();

      console.log('Football Tracker launched for YouTube video:', this.videoTitle);
    } catch (error) {
      console.error('Error launching tracker:', error);
    }
  }

  setupTrackerEventListeners(overlay, connectionData) {
    // Close button
    overlay.querySelector('#tracker-close').addEventListener('click', () => {
      this.closeTracker();
    });

    // Minimize button
    overlay.querySelector('#tracker-minimize').addEventListener('click', () => {
      overlay.classList.toggle('minimized');
    });

    // Sync button
    overlay.querySelector('#tracker-sync').addEventListener('click', () => {
      this.syncWithVideo();
    });

    // Video control buttons
    overlay.querySelector('#play-pause-btn').addEventListener('click', () => {
      if (this.videoElement) {
        if (this.videoElement.paused) {
          this.videoElement.play();
        } else {
          this.videoElement.pause();
        }
      }
    });

    overlay.querySelector('#rewind-btn').addEventListener('click', () => {
      if (this.videoElement) {
        this.videoElement.currentTime = Math.max(0, this.videoElement.currentTime - 10);
      }
    });

    overlay.querySelector('#forward-btn').addEventListener('click', () => {
      if (this.videoElement) {
        this.videoElement.currentTime = Math.min(this.videoElement.duration, this.videoElement.currentTime + 10);
      }
    });

    // Event buttons
    overlay.querySelectorAll('.event-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const eventType = e.target.dataset.event;
        await this.recordEvent(eventType, connectionData);
      });
    });

    // Make draggable
    this.makeDraggable(overlay);
  }

  startVideoTimeSync() {
    this.videoTimeInterval = setInterval(() => {
      if (this.videoElement && this.trackerWidget) {
        const timeDisplay = this.trackerWidget.querySelector('#tracker-video-time');
        if (timeDisplay) {
          const minutes = Math.floor(this.videoElement.currentTime / 60);
          const seconds = Math.floor(this.videoElement.currentTime % 60);
          timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      }
    }, 1000);
  }

  syncWithVideo() {
    if (this.videoElement) {
      // Flash sync indicator
      const syncBtn = document.querySelector('#tracker-sync');
      syncBtn.style.background = '#22c55e';
      setTimeout(() => {
        syncBtn.style.background = '';
      }, 500);
    }
  }

  onVideoTimeUpdate() {
    // Update time display if tracker is active
    if (this.isActive) {
      // Time display is updated by startVideoTimeSync interval
    }
  }

  onVideoPlay(isDirectEvent = false) {
    if (this.isActive && isDirectEvent) { // Check isDirectEvent for existing widget logic
      const playPauseBtn = document.querySelector('#play-pause-btn');
      if (playPauseBtn) playPauseBtn.textContent = '⏸️';
    }
    if (this.activeMatchIdForTracking && this.isTabFocused) { // Only send if tab is focused
      this.sendMessageToBackground({ type: 'VIDEO_PLAYING', matchId: this.activeMatchIdForTracking, videoId: this.videoId });
    }
  }

  onVideoPause(isDirectEvent = false) {
    if (this.isActive && isDirectEvent) { // Check isDirectEvent for existing widget logic
      const playPauseBtn = document.querySelector('#play-pause-btn');
      if (playPauseBtn) playPauseBtn.textContent = '▶️';
    }
    // Send VIDEO_PAUSED even if tab is not focused, as pausing is an explicit action.
    if (this.activeMatchIdForTracking) {
       this.sendMessageToBackground({ type: 'VIDEO_PAUSED', matchId: this.activeMatchIdForTracking, videoId: this.videoId });
    }
  }

  setupVisibilityChangeListener() {
    document.addEventListener('visibilitychange', () => {
      if (!this.activeMatchIdForTracking) return;

      if (document.hidden) {
        this.isTabFocused = false;
        this.sendMessageToBackground({ type: 'TAB_HIDDEN', matchId: this.activeMatchIdForTracking, videoId: this.videoId });
      } else {
        this.isTabFocused = true;
        this.sendMessageToBackground({ type: 'TAB_FOCUSED', matchId: this.activeMatchIdForTracking, videoId: this.videoId });
        // When tab becomes focused, re-send current video state
        if (this.videoElement && !this.videoElement.paused) {
          this.onVideoPlay();
        } else {
          this.onVideoPause();
        }
      }
    });
  }

  sendMessageToBackground(message) {
    if (this.activeMatchIdForTracking && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          console.warn(`Error sending message type ${message.type} to background:`, chrome.runtime.lastError.message);
        } else if (response && !response.success) {
          console.warn(`Background script did not acknowledge ${message.type}:`, response.error);
        }
      });
    }
  }

  updateTrackerVideoInfo() {
    if (this.trackerWidget) {
      const videoTitleEl = this.trackerWidget.querySelector('.video-title');
      if (videoTitleEl) {
        videoTitleEl.textContent = this.videoTitle;
      }
    }
  }

  async recordEvent(eventType, connectionData) {
    try {
      // Visual feedback
      const btn = document.querySelector(`[data-event="${eventType}"]`);
      btn.classList.add('recording');

      const videoTime = this.videoElement ? this.videoElement.currentTime : 0;

      // Send to background script with video timestamp
      const response = await chrome.runtime.sendMessage({
        type: 'RECORD_EVENT',
        data: {
          eventType,
          timestamp: Date.now(),
          videoTime: videoTime,
          videoId: this.videoId,
          details: { 
            recorded_via: 'youtube_extension',
            video_timestamp: videoTime,
            video_title: this.videoTitle
          }
        }
      });

      if (response.success) {
        this.addRecentEvent(eventType, videoTime);
        btn.classList.add('success');
      } else {
        btn.classList.add('error');
        console.error('Failed to record event:', response.error);
      }

      // Remove visual feedback after 2 seconds
      setTimeout(() => {
        btn.classList.remove('recording', 'success', 'error');
      }, 2000);

    } catch (error) {
      console.error('Error recording event:', error);
    }
  }

  addRecentEvent(eventType, videoTime) {
    const recentList = document.getElementById('recent-events-list');
    const eventItem = document.createElement('div');
    eventItem.className = 'recent-event';
    
    const minutes = Math.floor(videoTime / 60);
    const seconds = Math.floor(videoTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    eventItem.innerHTML = `
      <span>${eventType}</span>
      <span class="timestamp">${timeStr}</span>
    `;
    
    recentList.insertBefore(eventItem, recentList.firstChild);
    
    // Keep only last 5 events
    while (recentList.children.length > 5) {
      recentList.removeChild(recentList.lastChild);
    }
  }

  makeDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const header = element.querySelector('.tracker-header');

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || header.contains(e.target)) {
        isDragging = true;
        element.style.cursor = 'grabbing';
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    }

    function dragEnd() {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      element.style.cursor = 'default';
    }
  }

  // Removed injectLaunchButtonStyles() function
  // Removed injectStyles() function

  closeTracker() {
    if (this.trackerWidget) {
      this.trackerWidget.remove();
      this.trackerWidget = null;
      this.isActive = false;
    }
    
    if (this.videoTimeInterval) {
      clearInterval(this.videoTimeInterval);
      this.videoTimeInterval = null;
    }
  }
}

// Initialize YouTube Football Tracker
if (window.location.hostname.includes('youtube.com') && window.location.pathname.startsWith('/watch')) {
    new YouTubeFootballTracker();
} else {
    console.log("Not a YouTube watch page, Football Tracker content script not initializing main features.");
    // Still set up a minimal message listener for SET_ACTIVE_MATCH_CONTEXT in case the user navigates
    // to a watch page later or if background needs to communicate universally.
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SET_ACTIVE_MATCH_CONTEXT') {
            // Store it globally or in a way that a new Tracker instance can pick it up if page becomes a watch page.
            // This part is tricky as content script instances are per-page load.
            // For simplicity, we'll rely on re-initialization on actual watch pages.
            console.log('Content script (non-watch): Active match context received', message.matchId);
            // window.activeMatchIdForTracker = message.matchId; // Example of a global store (not recommended for complex scenarios)
            sendResponse({success: true, message: "Context received by non-watch page listener"});
        }
    });
}
