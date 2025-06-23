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
        console.log('Content script: LAUNCH_TRACKER message received', message.data);
        this.activeMatchIdForTracking = message.data.matchId; // General match context from notification
        this.targetYoutubeVideoId = message.data.youtubeVideoId; // Specific video ID for this session
        this.currentUserId = message.data.userId; // Store the user ID
        await this.launchTracker(message.data); // Pass all data through, launchTracker will use new class properties
        sendResponse({ success: true, receivedData: message.data }); // Acknowledge receipt
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
        this.activeMatchIdForTracking = message.matchId; // General match context from notification
        this.targetYoutubeVideoId = message.youtubeVideoId; // Specific video ID for this session
        this.currentUserId = message.userId || this.currentUserId; // User ID from background, keep existing if not provided

        // It's crucial to have the current page's videoId to compare against the targetYoutubeVideoId
        // Ensure this.videoId is fresh, especially if this message can arrive before onVideoChange fires on a new page.
        this.videoId = this.extractVideoId(window.location.href);

        console.log('Content script: Active match context set by background. MatchID:', this.activeMatchIdForTracking, 'Expected VideoID:', this.targetYoutubeVideoId, 'Current Page VideoID:', this.videoId);

        if (this.targetYoutubeVideoId && this.videoId && this.targetYoutubeVideoId !== this.videoId) {
            console.warn(`CONTEXT MISMATCH from SET_ACTIVE_MATCH_CONTEXT: Active match context (match ${this.activeMatchIdForTracking}) expects video ${this.targetYoutubeVideoId}, but current page is ${this.videoId}. Events will be associated with ${this.videoId}.`);
            // TODO: If tracker UI is active, display a warning to the user.
            // Example: if (this.trackerWidget && this.isActive && this.trackerInterface) { this.trackerInterface.showContextMismatchWarning(this.targetYoutubeVideoId, this.videoId); }
        }

        // If tracker UI is already present, update its display or state if necessary
        if (this.trackerWidget && this.activeMatchIdForTracking && this.isActive) { // Check isActive as well
             const matchIdDisplayElement = this.trackerWidget.querySelector('.connection-info span:not(.status-dot)');
             if (matchIdDisplayElement) { // Check if element exists
                 matchIdDisplayElement.textContent = `Tracking: ${this.activeMatchIdForTracking}`;
             }
        }
        // When context is set (or re-set), if video is already playing, send initial status
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

  async launchTracker(connectionData) { // connectionData now contains matchId, userId, youtubeVideoId
    if (this.isActive) {
      this.closeTracker();
    }

    // Ensure this.videoId is the current page's video ID.
    // It should ideally be set by detectVideoChange or by the calling message handler (SET_ACTIVE_MATCH_CONTEXT/LAUNCH_TRACKER).
    // Extract it here again as a fallback or if it wasn't set reliably before.
    this.videoId = this.extractVideoId(window.location.href);

    if (!this.videoId) {
      console.error('Could not extract video ID from URL for launching tracker.');
      alert('Error: Could not identify YouTube video for tracker.'); // User-facing alert
      return;
    }

    // activeMatchIdForTracking and targetYoutubeVideoId are now class properties,
    // set by the handleMessage (LAUNCH_TRACKER or SET_ACTIVE_MATCH_CONTEXT).
    // connectionData.matchId is equivalent to this.activeMatchIdForTracking.
    // connectionData.youtubeVideoId is equivalent to this.targetYoutubeVideoId.

    console.log(`Launching Tracker UI. General Match Context: ${this.activeMatchIdForTracking}, Expected Video by Context: ${this.targetYoutubeVideoId}, Current Page Video: ${this.videoId}`);

    // Perform validation: Compare expected video ID (from context) with current page's video ID
    if (this.targetYoutubeVideoId && this.videoId !== this.targetYoutubeVideoId) {
        console.warn(`VIDEO ID MISMATCH: Tracker launched for match context ${this.activeMatchIdForTracking} (expected video ${this.targetYoutubeVideoId}) but current video is ${this.videoId}. Events will be logged for current video: ${this.videoId}.`);
        // TODO: Display a warning in the tracker UI itself.
        // This could be a small, noticeable text element in the tracker UI, possibly managed by a refined TrackerInterface class.
        // For example: if (this.trackerInterface) this.trackerInterface.showPermanentWarning(`Warning: Video mismatch. Expected ${this.targetYoutubeVideoId}`);
    }

    try {
      // Create overlay container
      const overlay = document.createElement('div');
      overlay.id = 'football-tracker-overlay';
      // Display the general match context (this.activeMatchIdForTracking) in the UI
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
              {/* Display the general match context (activeMatchIdForTracking) */}
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
                  {/* Buttons will be rendered here by renderPianoButtons */}
                </div>
              </div>
              <div class="piano-section">
                <h4>Secondary Events</h4>
                <div class="event-buttons secondary" id="secondary-event-buttons">
                  {/* Buttons will be rendered here by renderPianoButtons */}
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

      // Fetch and render assigned event buttons
      // this.activeMatchIdForTracking and this.currentUserId are set by the message handler (LAUNCH_TRACKER/SET_ACTIVE_MATCH_CONTEXT)
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

    // Event buttons listeners will be added by renderPianoButtons directly to the dynamically created buttons.
    // So, the generic .event-btn listener setup is removed from here.

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

  async fetchAndRenderAssignedEvents(matchId, userId) {
    if (!this.trackerWidget) {
      console.error("Tracker widget not available to render assigned events.");
      return;
    }
    console.log(`Fetching assigned events for Match ID: ${matchId}, User ID: ${userId}`);
    // Show loading message
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

    // TODO: Implement button creation logic based on eventTypes and eventTypeDetails map
    // For now, just log that we received event types.
    // console.log('Received event types for piano:', eventTypes);

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
      'interception': { label: ' interception', category: 'primary' },
      'clearance': { label: '🧹 Clearance', category: 'secondary' },
      'substitution': { label: '🔄 Substitution', category: 'secondary' },
      // Add more standard football event types as needed
    };

    eventTypes.forEach(eventTypeKey => {
      const details = eventTypeDetails[eventTypeKey] || { label: eventTypeKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), category: 'secondary' }; // Default if not in map

      const button = document.createElement('button');
      button.className = 'event-btn';
      button.dataset.event = eventTypeKey;
      button.textContent = details.label;

      button.addEventListener('click', async () => {
        // connectionData is not directly available here. We need activeMatchIdForTracking and videoId from the class instance.
        // The recordEvent function itself uses this.videoId and this.activeMatchIdForTracking.
        // The original connectionData in setupTrackerEventListeners was just for context, but recordEvent is now self-reliant on class properties.
        await this.recordEvent(eventTypeKey);
      });

      if (details.category === 'primary' && primaryEventsContainer) {
        primaryEventsContainer.appendChild(button);
      } else if (secondaryEventsContainer) { // Default to secondary if category is not 'primary' or unknown
        secondaryEventsContainer.appendChild(button);
      }
    });

    if (primaryEventsContainer.children.length === 0 && secondaryEventsContainer.children.length === 0) {
         // This case should ideally be caught by the initial check for eventTypes.length === 0
         // But as a fallback if all eventTypes were unknown and defaulted to no category.
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
