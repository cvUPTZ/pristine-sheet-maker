class YouTubeFootballTracker {
  constructor() {
    this.trackerWidget = null;
    this.isActive = false;
    this.videoElement = null;
    this.videoTitle = '';
    this.videoId = '';
    this.activeMatchIdForTracking = null;
    this.isTabFocused = !document.hidden;
    
    console.log('YouTube Football Tracker: Initializing...');
    this.setupMessageListener();
    this.initializeYouTubeIntegration();
    this.setupVisibilityChangeListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script: Received message:', message.type);
      this.handleMessage(message, sender, sendResponse);
      // Return true for async sendResponse
      if (message.type === 'GET_VIDEO_INFO' || message.type === 'LAUNCH_TRACKER' || message.type === 'SET_ACTIVE_MATCH_CONTEXT') {
        return true;
      }
    });
  }

  initializeYouTubeIntegration() {
    console.log('YouTube Integration: Starting...');
    // Wait for YouTube to load
    this.waitForYouTube(() => {
      console.log('YouTube loaded, detecting video changes...');
      this.detectVideoChange();
      this.addYouTubeControls();
    });
  }

  waitForYouTube(callback) {
    if (window.location.hostname.includes('youtube.com') && document.querySelector('video')) {
      console.log('YouTube video element found');
      callback();
    } else {
      console.log('Waiting for YouTube to load...');
      setTimeout(() => this.waitForYouTube(callback), 1000);
    }
  }

  detectVideoChange() {
    // Get video information
    this.videoElement = document.querySelector('video');
    this.videoId = this.extractVideoId(window.location.href);
    this.videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || 'Unknown Video';

    console.log('Video detected:', { id: this.videoId, title: this.videoTitle });

    // Listen for URL changes (YouTube is a SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        console.log('URL changed, handling video change...');
        this.onVideoChange();
      }
    }).observe(document, { subtree: true, childList: true });

    // Listen for video events
    if (this.videoElement) {
      this.videoElement.addEventListener('timeupdate', () => this.onVideoTimeUpdate());
      this.videoElement.addEventListener('play', () => this.onVideoPlay(true));
      this.videoElement.addEventListener('pause', () => this.onVideoPause(true));
      console.log('Video event listeners attached');
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
      
      console.log('Video changed:', { oldId: oldVideoId, newId: this.videoId });
      
      if (this.isActive) {
        this.updateTrackerVideoInfo();
      }

      if (this.activeMatchIdForTracking && oldVideoId !== this.videoId) {
        console.log(`Video changed. Old: ${oldVideoId}, New: ${this.videoId}. Active Match ID: ${this.activeMatchIdForTracking}`);
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'VIDEO_NAVIGATED_AWAY',
            oldMatchId: this.activeMatchIdForTracking,
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
    launchButton.addEventListener('click', () => {
      console.log('Launch button clicked');
      this.quickLaunch();
    });
    document.body.appendChild(launchButton);
    console.log('YouTube controls added');
  }

  quickLaunch() {
    if (!this.videoId) {
      alert('Please navigate to a YouTube video to start tracking');
      return;
    }

    console.log('Quick launching tracker for video:', this.videoId);
    // Quick launch with default settings
    this.launchTracker({
      matchId: this.videoId,
      videoTitle: this.videoTitle,
      apiUrl: 'https://your-api.com',
      authToken: ''
    });
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('Content script: Handling message:', message.type);
    
    try {
      switch (message.type) {
        case '':
          console.log('Content script: LAUNCH_TRACKER message received', message.data);
          this.activeMatchIdForTracking = message.data.matchId;
          this.targetYoutubeVideoId = message.data.youtubeVideoId;
          this.currentUserId = message.data.userId;
          await this.launchTracker(message.data);
          sendResponse({ success: true, receivedData: message.data });
          break;
        
        case 'CLOSE_TRACKER':
          this.closeTracker();
          sendResponse({ success: true });
          break;
          
        case 'GET_VIDEO_INFO':
          const videoInfo = {
            videoId: this.videoId,
            videoTitle: this.videoTitle,
            currentTime: this.videoElement?.currentTime || 0,
            isPlaying: this.videoElement ? !this.videoElement.paused : false
          };
          console.log('Sending video info:', videoInfo);
          sendResponse(videoInfo);
          break;
          
        case 'SET_ACTIVE_MATCH_CONTEXT':
          this.activeMatchIdForTracking = message.matchId;
          this.targetYoutubeVideoId = message.youtubeVideoId;
          this.currentUserId = message.userId || this.currentUserId;

          this.videoId = this.extractVideoId(window.location.href);

          console.log('Content script: Active match context set by background. MatchID:', this.activeMatchIdForTracking, 'Expected VideoID:', this.targetYoutubeVideoId, 'Current Page VideoID:', this.videoId);

          if (this.targetYoutubeVideoId && this.videoId && this.targetYoutubeVideoId !== this.videoId) {
            console.warn(`CONTEXT MISMATCH from SET_ACTIVE_MATCH_CONTEXT: Active match context (match ${this.activeMatchIdForTracking}) expects video ${this.targetYoutubeVideoId}, but current page is ${this.videoId}. Events will be associated with ${this.videoId}.`);
          }

          if (this.trackerWidget && this.activeMatchIdForTracking && this.isActive) {
            const matchIdDisplayElement = this.trackerWidget.querySelector('.connection-info span:not(.status-dot)');
            if (matchIdDisplayElement) {
              matchIdDisplayElement.textContent = `Tracking: ${this.activeMatchIdForTracking}`;
            }
          }
          
          if (this.activeMatchIdForTracking && this.videoElement && !this.videoElement.paused && this.isTabFocused) {
            this.sendMessageToBackground({ type: 'VIDEO_PLAYING', matchId: this.activeMatchIdForTracking, videoId: this.videoId });
          } else if (this.activeMatchIdForTracking && this.isTabFocused) {
            this.sendMessageToBackground({ type: 'VIDEO_PAUSED', matchId: this.activeMatchIdForTracking, videoId: this.videoId });
          }
          sendResponse({ success: true });
          break;
          
        default:
          console.log('Content script received unhandled message type:', message.type);
          sendResponse({ success: true, message: 'Message received but not handled' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async launchTracker(connectionData) {
    if (this.isActive) {
      this.closeTracker();
    }

    this.videoId = this.extractVideoId(window.location.href);

    if (!this.videoId) {
      console.error('Could not extract video ID from URL for launching tracker.');
      alert('Error: Could not identify YouTube video for tracker.');
      return;
    }

    console.log(`Launching Tracker UI. General Match Context: ${this.activeMatchIdForTracking}, Expected Video by Context: ${this.targetYoutubeVideoId}, Current Page Video: ${this.videoId}`);

    if (this.targetYoutubeVideoId && this.videoId !== this.targetYoutubeVideoId) {
      console.warn(`VIDEO ID MISMATCH: Tracker launched for match context ${this.activeMatchIdForTracking} (expected video ${this.targetYoutubeVideoId}) but current video is ${this.videoId}. Events will be logged for current video: ${this.videoId}.`);
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
              <span>Tracking: ${this.activeMatchIdForTracking}</span>
            </div>
            <div class="video-controls">
              <button id="play-pause-btn" class="video-btn">⏸️</button>
              <button id="rewind-btn" class="video-btn">⏪ 10s</button>
              <button id="forward-btn" class="video-btn">⏩ 10s</button>
            </div>
            <div class="event-piano">
              <div class="piano-section">
                <h4>Primary Events</h4>
                <div class="event-buttons primary" id="primary-event-buttons">
                  <!-- Buttons will be rendered here by renderPianoButtons -->
                </div>
              </div>
              <div class="piano-section">
                <h4>Secondary Events</h4>
                <div class="event-buttons secondary" id="secondary-event-buttons">
                  <!-- Buttons will be rendered here by renderPianoButtons -->
                </div>
              </div>
            </div>
            <div id="piano-status-message" style="text-align: center; padding: 10px;"></div>
            <div class="recent-events">
              <h4>Recent Events</h4>
              <div id="recent-events-list"></div>
            </div>
          </div>
        </div>
      `;

      // Add overlay to page
      document.body.appendChild(overlay);
      
      // Setup event listeners
      this.setupTrackerEventListeners(overlay, connectionData);
      
      this.trackerWidget = overlay;
      this.isActive = true;

      // Start video time sync
      this.startVideoTimeSync();

      // Fetch and render assigned event buttons
      if (this.activeMatchIdForTracking && this.currentUserId) {
        this.fetchAndRenderAssignedEvents(this.activeMatchIdForTracking, this.currentUserId);
      } else {
        console.warn("Missing matchId or userId, cannot fetch assignments.",
                     "activeMatchId:", this.activeMatchIdForTracking,
                     "currentUserId:", this.currentUserId);
        this.renderPianoError("Configuration error: Missing match or user ID for assignments.");
      }

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
    if (this.isActive && isDirectEvent) {
      const playPauseBtn = document.querySelector('#play-pause-btn');
      if (playPauseBtn) playPauseBtn.textContent = '⏸️';
    }
    if (this.activeMatchIdForTracking && this.isTabFocused) {
      this.sendMessageToBackground({ type: 'VIDEO_PLAYING', matchId: this.activeMatchIdForTracking, videoId: this.videoId });
    }
  }

  onVideoPause(isDirectEvent = false) {
    if (this.isActive && isDirectEvent) {
      const playPauseBtn = document.querySelector('#play-pause-btn');
      if (playPauseBtn) playPauseBtn.textContent = '▶️';
    }
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
      if (btn) btn.classList.add('recording');

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

      if (response && response.success) {
        this.addRecentEvent(eventType, videoTime);
        if (btn) btn.classList.add('success');
      } else {
        if (btn) btn.classList.add('error');
        console.error('Failed to record event:', response?.error);
      }

      // Remove visual feedback after 2 seconds
      setTimeout(() => {
        if (btn) btn.classList.remove('recording', 'success', 'error');
      }, 2000);

    } catch (error) {
      console.error('Error recording event:', error);
    }
  }

  addRecentEvent(eventType, videoTime) {
    const recentList = document.getElementById('recent-events-list');
    if (!recentList) return;
    
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

  async fetchAndRenderAssignedEvents(matchId, userId) {
    if (!this.trackerWidget) {
      console.error("Tracker widget not available to render assigned events.");
      return;
    }
    console.log(`Fetching assigned events for Match ID: ${matchId}, User ID: ${userId}`);
    
    const pianoStatusContainer = this.trackerWidget.querySelector('#piano-status-message');
    if (pianoStatusContainer) {
      pianoStatusContainer.innerHTML = '<p style="text-align:center;">Loading event assignments...</p>';
    }

    chrome.runtime.sendMessage(
      {
        type: 'GET_TRACKER_ASSIGNMENTS',
        data: { matchId: matchId, userId: userId }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error fetching assignments:', chrome.runtime.lastError.message);
          this.renderPianoError("Failed to load event assignments due to an extension error.");
          return;
        }

        if (response && response.success) {
          console.log('Successfully fetched event types:', response.eventTypes);
          this.renderPianoButtons(response.eventTypes);
        } else {
          console.error('Failed to fetch assignments:', response?.error);
          this.renderPianoError(response?.error || "Could not fetch event assignments from background.");
        }
      }
    );
  }

  renderPianoButtons(eventTypes) {
    const primaryEventsContainer = this.trackerWidget?.querySelector('#primary-event-buttons');
    const secondaryEventsContainer = this.trackerWidget?.querySelector('#secondary-event-buttons');
    const pianoStatusContainer = this.trackerWidget?.querySelector('#piano-status-message');

    if (!primaryEventsContainer || !secondaryEventsContainer || !pianoStatusContainer) {
      console.error('Piano containers not found in tracker widget.');
      return;
    }

    // Clear existing buttons and status message
    primaryEventsContainer.innerHTML = '';
    secondaryEventsContainer.innerHTML = '';
    pianoStatusContainer.innerHTML = '';

    if (!eventTypes || !Array.isArray(eventTypes) || eventTypes.length === 0) {
      pianoStatusContainer.innerHTML = '<p style="text-align:center;">No event types assigned for tracking.</p>';
      return;
    }

    const eventTypeDetails = {
      'goal': { label: '⚽ Goal', category: 'primary' },
      'shot_on_target': { label: '🎯 Shot (On Target)', category: 'primary' },
      'shot_off_target': { label: '💨 Shot (Off Target)', category: 'primary' },
      'blocked_shot': { label: '🧱 Shot (Blocked)', category: 'primary' },
      'pass_accurate': { label: '✅ Pass (Accurate)', category: 'secondary' },
      'pass_inaccurate': { label: '❌ Pass (Inaccurate)', category: 'secondary' },
      'tackle_won': { label: '🛡️ Tackle (Won)', category: 'primary' },
      'tackle_lost': { label: '🩹 Tackle (Lost)', category: 'secondary' },
      'foul_committed': { label: '⚠️ Foul (Committed)', category: 'secondary' },
      'foul_won': { label: '🙌 Foul (Won)', category: 'secondary' },
      'yellow_card': { label: '🟨 Yellow Card', category: 'secondary' },
      'red_card': { label: '🟥 Red Card', category: 'secondary' },
      'corner_kick': { label: '📐 Corner Kick', category: 'secondary' },
      'free_kick_taken': { label: '🎯 Free Kick (Taken)', category: 'secondary' },
      'offside': { label: '🏳️ Offside', category: 'secondary' },
      'save_goalkeeper': { label: '🧤 Save (GK)', category: 'primary' },
      'interception': { label: '✋ Interception', category: 'primary' },
      'clearance': { label: '🧹 Clearance', category: 'secondary' },
      'substitution': { label: '🔄 Substitution', category: 'secondary' },
    };

    eventTypes.forEach(eventTypeKey => {
      const details = eventTypeDetails[eventTypeKey] || { 
        label: eventTypeKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
        category: 'secondary' 
      };

      const button = document.createElement('button');
      button.className = 'event-btn';
      button.dataset.event = eventTypeKey;
      button.textContent = details.label;

      button.addEventListener('click', async () => {
        await this.recordEvent(eventTypeKey);
      });

      if (details.category === 'primary' && primaryEventsContainer) {
        primaryEventsContainer.appendChild(button);
      } else if (secondaryEventsContainer) {
        secondaryEventsContainer.appendChild(button);
      }
    });

    if (primaryEventsContainer.children.length === 0 && secondaryEventsContainer.children.length === 0) {
      pianoStatusContainer.innerHTML = '<p style="text-align:center;">No recognized event types assigned.</p>';
    }
  }

  renderPianoError(errorMessage) {
    const pianoStatusContainer = this.trackerWidget?.querySelector('#piano-status-message');
    if (pianoStatusContainer) {
      pianoStatusContainer.innerHTML = `<p style="color:red; text-align:center;">Error: ${errorMessage}</p>`;
    }
    // Clear button containers too
    const primaryEventsContainer = this.trackerWidget?.querySelector('#primary-event-buttons');
    const secondaryEventsContainer = this.trackerWidget?.querySelector('#secondary-event-buttons');
    if (primaryEventsContainer) primaryEventsContainer.innerHTML = '';
    if (secondaryEventsContainer) secondaryEventsContainer.innerHTML = '';
  }

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
console.log('Content script loading...');
if (window.location.hostname.includes('youtube.com') && window.location.pathname.startsWith('/watch')) {
  console.log('YouTube watch page detected, initializing tracker...');
  new YouTubeFootballTracker();
} else {
  console.log("Not a YouTube watch page, Football Tracker content script not initializing main features.");
  // Still set up a minimal message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SET_ACTIVE_MATCH_CONTEXT') {
      console.log('Content script (non-watch): Active match context received', message.matchId);
      sendResponse({success: true, message: "Context received by non-watch page listener"});
    }
  });
}
