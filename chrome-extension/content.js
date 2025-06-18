class TrackerContent {
  constructor() {
    this.trackerWidget = null;
    this.isActive = false;
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
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
        
      default:
        sendResponse({ error: 'Unknown message type' });
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
            <div class="tracker-controls">
              <button id="tracker-minimize" title="Minimize">−</button>
              <button id="tracker-close" title="Close">×</button>
            </div>
          </div>
          <div class="tracker-content">
            <div class="connection-info">
              <span class="status-dot online"></span>
              <span>Match ID: ${connectionData.matchId}</span>
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
      this.injectStyles();
      
      // Add overlay to page
      document.body.appendChild(overlay);
      
      // Setup event listeners
      this.setupTrackerEventListeners(overlay, connectionData);
      
      this.trackerWidget = overlay;
      this.isActive = true;

      console.log('Football Tracker launched successfully');
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

  async recordEvent(eventType, connectionData) {
    try {
      // Visual feedback
      const btn = document.querySelector(`[data-event="${eventType}"]`);
      btn.classList.add('recording');

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        type: 'RECORD_EVENT',
        data: {
          eventType,
          timestamp: Date.now(),
          details: { recorded_via: 'chrome_extension' }
        }
      });

      if (response.success) {
        this.addRecentEvent(eventType);
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

  addRecentEvent(eventType) {
    const recentList = document.getElementById('recent-events-list');
    const eventItem = document.createElement('div');
    eventItem.className = 'recent-event';
    eventItem.innerHTML = `
      <span>${eventType}</span>
      <span class="timestamp">${new Date().toLocaleTimeString()}</span>
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

  injectStyles() {
    if (document.getElementById('football-tracker-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'football-tracker-styles';
    styles.textContent = `
      #football-tracker-overlay {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
      }

      #football-tracker-overlay.minimized {
        height: 60px;
        overflow: hidden;
      }

      .tracker-container {
        padding: 16px;
      }

      .tracker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        cursor: grab;
        user-select: none;
      }

      .tracker-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
      }

      .tracker-controls {
        display: flex;
        gap: 8px;
      }

      .tracker-controls button {
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 6px;
        background: #f3f4f6;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        color: #6b7280;
        transition: all 0.2s;
      }

      .tracker-controls button:hover {
        background: #e5e7eb;
        color: #374151;
      }

      .connection-info {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        padding: 8px 12px;
        background: rgba(34, 197, 94, 0.1);
        border-radius: 8px;
        font-size: 12px;
        color: #059669;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        animation: pulse 2s infinite;
      }

      .piano-section {
        margin-bottom: 16px;
      }

      .piano-section h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .event-buttons {
        display: grid;
        gap: 8px;
      }

      .event-buttons.primary {
        grid-template-columns: repeat(2, 1fr);
      }

      .event-buttons.secondary {
        grid-template-columns: repeat(3, 1fr);
      }

      .event-btn {
        padding: 12px 8px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        background: linear-gradient(135deg, #ffffff, #f8fafc);
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        transition: all 0.2s;
        text-align: center;
      }

      .event-btn:hover {
        border-color: #3b82f6;
        background: linear-gradient(135deg, #dbeafe, #bfdbfe);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
      }

      .event-btn.recording {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        border-color: #f59e0b;
        color: white;
        animation: pulse 0.5s infinite;
      }

      .event-btn.success {
        background: linear-gradient(135deg, #10b981, #059669);
        border-color: #059669;
        color: white;
      }

      .event-btn.error {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border-color: #dc2626;
        color: white;
      }

      .recent-events h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .recent-event {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #f9fafb;
        border-radius: 8px;
        margin-bottom: 4px;
        font-size: 12px;
        color: #6b7280;
      }

      .recent-event:last-child {
        margin-bottom: 0;
      }

      .timestamp {
        font-weight: 600;
        color: #9ca3af;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
      }
    `;

    document.head.appendChild(styles);
  }

  closeTracker() {
    if (this.trackerWidget) {
      this.trackerWidget.remove();
      this.trackerWidget = null;
      this.isActive = false;
    }
  }
}

// Initialize content script
new TrackerContent();
