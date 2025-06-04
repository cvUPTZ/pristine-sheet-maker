
import { ConnectionMonitor } from './connectionMonitor';
import { VoiceConnectionRecovery } from './connectionRecovery';
import { PRODUCTION_VOICE_CONFIG } from '@/config/voiceConfig';

interface WebRTCManagerOptions {
  localStream: MediaStream;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onPeerDisconnected: (userId: string) => void;
  onError: (error: Error) => void;
  onConnectionQuality?: (userId: string, quality: any) => void;
  onDataChannel?: (userId: string, channel: RTCDataChannel) => void;
}

interface PeerState {
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  isNegotiating: boolean;
  pendingIceCandidates: RTCIceCandidateInit[];
  lastActivity: number;
  connectionAttempts: number;
  isStable: boolean;
}

export class WebRTCManager {
  private peers = new Map<string, PeerState>();
  private localStream: MediaStream;
  private onRemoteStream: (userId: string, stream: MediaStream) => void;
  private onPeerDisconnected: (userId: string) => void;
  private onError: (error: Error) => void;
  private onConnectionQuality?: (userId: string, quality: any) => void;
  private onDataChannel?: (userId: string, channel: RTCDataChannel) => void;
  private signalingQueue = new Map<string, Promise<void>>();
  private connectionMonitor: ConnectionMonitor;
  private connectionRecovery: VoiceConnectionRecovery;
  private healthCheckInterval?: NodeJS.Timeout;
  private statsCollectionInterval?: NodeJS.Timeout;
  private reconnectionAttempts = new Map<string, number>();

  constructor(options: WebRTCManagerOptions) {
    this.localStream = options.localStream;
    this.onRemoteStream = options.onRemoteStream;
    this.onPeerDisconnected = options.onPeerDisconnected;
    this.onError = options.onError;
    this.onConnectionQuality = options.onConnectionQuality;
    this.onDataChannel = options.onDataChannel;

    // Initialize connection monitor with production settings
    this.connectionMonitor = new ConnectionMonitor({
      onQualityChange: (userId, quality) => {
        console.log(`📊 Connection quality for ${userId}:`, quality.quality, `(${quality.rtt}ms RTT, ${quality.packetsLost} lost)`);
        this.onConnectionQuality?.(userId, quality);
        
        // Auto-handle poor connections
        if (quality.quality === 'poor') {
          this.handlePoorConnection(userId);
        }
      },
      onConnectionLoss: (userId) => {
        console.log(`📡 Connection loss detected for: ${userId}`);
        this.handlePeerDisconnection(userId);
      },
      checkInterval: 3000 // More frequent monitoring for production
    });

    // Initialize connection recovery with production settings
    this.connectionRecovery = new VoiceConnectionRecovery((attempt, maxRetries) => {
      console.log(`🔄 Voice connection recovery attempt ${attempt}/${maxRetries}`);
    });
  }

  private async handlePoorConnection(userId: string): Promise<void> {
    const peerState = this.peers.get(userId);
    if (!peerState || !peerState.isStable) return;

    console.log(`⚠️ Handling poor connection for ${userId}`);
    
    try {
      // Try ICE restart first
      await this.restartIce(userId);
      console.log(`🔄 ICE restart initiated for ${userId}`);
    } catch (error) {
      console.error(`❌ ICE restart failed for ${userId}:`, error);
      this.attemptReconnection(userId);
    }
  }

  private async attemptReconnection(userId: string): Promise<void> {
    const currentAttempts = this.reconnectionAttempts.get(userId) || 0;
    if (currentAttempts >= PRODUCTION_VOICE_CONFIG.reconnectionAttempts) {
      console.error(`❌ Max reconnection attempts reached for ${userId}`);
      this.handlePeerDisconnection(userId);
      return;
    }

    this.reconnectionAttempts.set(userId, currentAttempts + 1);
    console.log(`🔄 Attempting reconnection ${currentAttempts + 1}/${PRODUCTION_VOICE_CONFIG.reconnectionAttempts} for ${userId}`);
    
    try {
      await this.closePeerConnection(userId);
      await this.createPeerConnection(userId);
    } catch (error) {
      console.error(`❌ Reconnection attempt failed for ${userId}:`, error);
    }
  }

  private handlePeerDisconnection(userId: string): void {
    console.log(`🔌 Handling peer disconnection for: ${userId}`);
    this.reconnectionAttempts.delete(userId);
    this.connectionMonitor.removePeer(userId);
    this.onPeerDisconnected(userId);
  }

  private async restartIce(userId: string): Promise<void> {
    const peerState = this.peers.get(userId);
    if (!peerState) return;

    try {
      await peerState.connection.restartIce();
      console.log(`🧊 ICE restart completed for ${userId}`);
    } catch (error) {
      console.error(`❌ ICE restart failed for ${userId}:`, error);
      throw error;
    }
  }

  private queueSignalingOperation<T>(userId: string, operation: () => Promise<T>): Promise<T> {
    const existingOperation = this.signalingQueue.get(userId) || Promise.resolve();
    
    const newOperation = existingOperation
      .then(() => operation())
      .catch(error => {
        console.error(`❌ Signaling operation failed for ${userId}:`, error);
        throw error;
      });
    
    this.signalingQueue.set(userId, newOperation.then(() => {}).catch(() => {}));
    return newOperation;
  }

  async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    return this.queueSignalingOperation(userId, async () => {
      console.log('🔗 Creating peer connection for:', userId);
      
      // Close existing connection if any
      if (this.peers.has(userId)) {
        await this.closePeerConnection(userId);
      }
      
      const peerConnection = new RTCPeerConnection({
        iceServers: PRODUCTION_VOICE_CONFIG.iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'balanced',
        rtcpMuxPolicy: 'require'
      });
      
      const peerState: PeerState = {
        connection: peerConnection,
        isNegotiating: false,
        pendingIceCandidates: [],
        lastActivity: Date.now(),
        connectionAttempts: 0,
        isStable: false
      };
      
      this.peers.set(userId, peerState);

      // Add to connection monitor
      this.connectionMonitor.addPeer(userId, peerConnection);

      // Add local stream tracks with production audio settings
      this.localStream.getTracks().forEach(track => {
        console.log(`📤 Adding local ${track.kind} track for:`, userId);
        const sender = peerConnection.addTrack(track, this.localStream);
        
        // Configure audio encoding parameters for production
        if (track.kind === 'audio') {
          // Get current parameters and modify only the encodings
          const currentParams = sender.getParameters();
          if (currentParams.encodings && currentParams.encodings.length > 0) {
            currentParams.encodings[0].maxBitrate = 64000;
            sender.setParameters(currentParams).catch(error => 
              console.warn('Failed to set encoding parameters:', error)
            );
          }
        }
      });

      // Create data channel for control messages
      const dataChannel = peerConnection.createDataChannel('control', {
        ordered: true
      });
      
      dataChannel.onopen = () => {
        console.log(`📱 Data channel opened for ${userId}`);
        peerState.dataChannel = dataChannel;
        this.onDataChannel?.(userId, dataChannel);
      };

      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleDataChannelMessage(userId, message);
        } catch (error) {
          console.error('Failed to parse data channel message:', error);
        }
      };

      // Handle incoming data channels
      peerConnection.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleDataChannelMessage(userId, message);
          } catch (error) {
            console.error('Failed to parse incoming data channel message:', error);
          }
        };
      };

      // Enhanced remote stream handling
      peerConnection.ontrack = (event) => {
        console.log('📡 Received remote track from:', userId, 'streams:', event.streams.length);
        const [remoteStream] = event.streams;
        
        if (remoteStream && remoteStream.getTracks().length > 0) {
          console.log('🎵 Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.id}`));
          
          // Configure audio tracks for production
          const audioTracks = remoteStream.getAudioTracks();
          audioTracks.forEach(track => {
            track.enabled = true;
            console.log(`🎤 Audio track configured for ${userId}:`, {
              id: track.id,
              readyState: track.readyState,
              muted: track.muted,
              settings: track.getSettings()
            });
          });
          
          this.onRemoteStream(userId, remoteStream);
          peerState.lastActivity = Date.now();
          peerState.isStable = true;
        } else {
          console.warn('⚠️ Remote stream has no tracks for:', userId);
        }
      };

      // ICE candidate handling with better buffering
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE candidate for:', userId, event.candidate.type);
          peerState.pendingIceCandidates.push(event.candidate.toJSON());
        } else {
          console.log('🧊 ICE gathering complete for:', userId);
        }
      };

      // Production connection state handling
      peerConnection.onconnectionstatechange = () => {
        console.log(`🔌 Connection state for ${userId}:`, peerConnection.connectionState);
        peerState.lastActivity = Date.now();
        
        switch (peerConnection.connectionState) {
          case 'connected':
            console.log('✅ WebRTC connection established with:', userId);
            peerState.isStable = true;
            peerState.connectionAttempts = 0;
            this.processPendingIceCandidates(userId);
            break;
          case 'disconnected':
            console.log('⚠️ WebRTC connection disconnected with:', userId);
            peerState.isStable = false;
            this.attemptReconnection(userId);
            break;
          case 'failed':
            console.log('❌ WebRTC connection failed with:', userId);
            peerState.isStable = false;
            this.attemptReconnection(userId);
            break;
          case 'closed':
            console.log('🔒 WebRTC connection closed with:', userId);
            this.handlePeerDisconnection(userId);
            break;
        }
      };

      // ICE connection state handling
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE state for ${userId}:`, peerConnection.iceConnectionState);
        peerState.lastActivity = Date.now();
        
        if (peerConnection.iceConnectionState === 'failed') {
          console.log('🔄 ICE connection failed, restarting for:', userId);
          this.restartIce(userId);
        }
      };

      return peerConnection;
    });
  }

  private handleDataChannelMessage(userId: string, message: any): void {
    console.log(`📱 Data channel message from ${userId}:`, message);
    
    switch (message.type) {
      case 'mute_status':
        // Handle mute status updates
        break;
      case 'quality_report':
        // Handle quality reports
        break;
      case 'ping':
        // Respond to ping for latency measurement
        this.sendDataChannelMessage(userId, { type: 'pong', timestamp: message.timestamp });
        break;
    }
  }

  sendDataChannelMessage(userId: string, message: any): void {
    const peerState = this.peers.get(userId);
    if (peerState?.dataChannel && peerState.dataChannel.readyState === 'open') {
      try {
        peerState.dataChannel.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send data channel message to ${userId}:`, error);
      }
    }
  }

  startProductionMonitoring(): void {
    console.log('🎯 Starting production voice monitoring');
    
    // Start connection quality monitoring
    this.connectionMonitor.startMonitoring();
    
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    // Stats collection every 10 seconds
    this.statsCollectionInterval = setInterval(() => {
      this.collectConnectionStats();
    }, 10000);
  }

  private performHealthCheck(): void {
    const now = Date.now();
    
    this.peers.forEach((state, userId) => {
      const timeSinceActivity = now - state.lastActivity;
      
      // Send ping if no activity for 60 seconds
      if (timeSinceActivity > 60000) {
        this.sendDataChannelMessage(userId, {
          type: 'ping',
          timestamp: now
        });
      }
      
      // Force reconnection if no activity for 5 minutes
      if (timeSinceActivity > 300000) {
        console.warn(`⚠️ Forcing reconnection for inactive peer: ${userId}`);
        this.attemptReconnection(userId);
      }
    });
  }

  private async collectConnectionStats(): Promise<void> {
    for (const [userId, peerState] of this.peers.entries()) {
      if (peerState.connection.connectionState === 'connected') {
        try {
          const stats = await peerState.connection.getStats();
          // Process and log important stats for monitoring
          this.processConnectionStats(userId, stats);
        } catch (error) {
          console.warn(`Failed to collect stats for ${userId}:`, error);
        }
      }
    }
  }

  private processConnectionStats(userId: string, stats: RTCStatsReport): void {
    let bytesReceived = 0;
    let bytesSent = 0;
    let packetsLost = 0;
    let jitter = 0;

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
        bytesReceived += report.bytesReceived || 0;
        packetsLost += report.packetsLost || 0;
        jitter += report.jitter || 0;
      } else if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
        bytesSent += report.bytesSent || 0;
      }
    });

    // Log stats for monitoring (could be sent to analytics service)
    console.log(`📊 Stats for ${userId}:`, {
      bytesReceived,
      bytesSent,
      packetsLost,
      jitter: Math.round(jitter * 1000) / 1000
    });
  }

  async createOffer(userId: string): Promise<RTCSessionDescriptionInit> {
    return this.queueSignalingOperation(userId, async () => {
      const peerState = this.peers.get(userId);
      if (!peerState) throw new Error(`No peer connection for ${userId}`);

      const offer = await peerState.connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await peerState.connection.setLocalDescription(offer);
      console.log('📤 Created offer for:', userId);
      return offer;
    });
  }

  async createAnswer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    return this.queueSignalingOperation(userId, async () => {
      const peerState = this.peers.get(userId);
      if (!peerState) throw new Error(`No peer connection for ${userId}`);

      await peerState.connection.setRemoteDescription(offer);
      const answer = await peerState.connection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await peerState.connection.setLocalDescription(answer);
      console.log('📤 Created answer for:', userId);
      return answer;
    });
  }

  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    return this.queueSignalingOperation(userId, async () => {
      const peerState = this.peers.get(userId);
      if (!peerState) throw new Error(`No peer connection for ${userId}`);

      await peerState.connection.setRemoteDescription(answer);
      console.log('📥 Handled answer from:', userId);
      
      // Process any pending ICE candidates after setting remote description
      await this.processPendingIceCandidates(userId);
    });
  }

  private async processPendingIceCandidates(userId: string): Promise<void> {
    const peerState = this.peers.get(userId);
    if (!peerState || !peerState.connection.remoteDescription) return;

    const candidates = [...peerState.pendingIceCandidates];
    peerState.pendingIceCandidates = [];

    for (const candidate of candidates) {
      try {
        await peerState.connection.addIceCandidate(candidate);
        console.log('🧊 Added pending ICE candidate for:', userId);
      } catch (error) {
        console.error('❌ Failed to add pending ICE candidate:', error);
      }
    }
  }

  async addIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
    return this.queueSignalingOperation(userId, async () => {
      const peerState = this.peers.get(userId);
      if (!peerState) throw new Error(`No peer connection for ${userId}`);

      try {
        if (peerState.connection.remoteDescription) {
          await peerState.connection.addIceCandidate(candidate);
          console.log('🧊 Added ICE candidate from:', userId);
        } else {
          console.log('🧊 Buffering ICE candidate for:', userId);
          peerState.pendingIceCandidates.push(candidate);
        }
      } catch (error) {
        console.error('❌ Failed to add ICE candidate:', error);
        throw error;
      }
    });
  }

  getPendingIceCandidates(userId: string): RTCIceCandidateInit[] {
    const peerState = this.peers.get(userId);
    if (!peerState) return [];
    
    const candidates = [...peerState.pendingIceCandidates];
    peerState.pendingIceCandidates = [];
    return candidates;
  }

  async closePeerConnection(userId: string): Promise<void> {
    return this.queueSignalingOperation(userId, async () => {
      const peerState = this.peers.get(userId);
      if (peerState) {
        // Clean up reconnection attempts
        this.reconnectionAttempts.delete(userId);
        // Remove from connection monitor
        this.connectionMonitor.removePeer(userId);
        
        peerState.connection.close();
        this.peers.delete(userId);
        console.log('🔌 Closed peer connection for:', userId);
      }
      this.signalingQueue.delete(userId);
    });
  }

  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.peers.keys()).map(userId => 
      this.closePeerConnection(userId)
    );
    
    await Promise.all(closePromises);
    
    // Clean up intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    if (this.statsCollectionInterval) {
      clearInterval(this.statsCollectionInterval);
      this.statsCollectionInterval = undefined;
    }
    
    this.signalingQueue.clear();
    this.connectionMonitor.cleanup();
    this.connectionRecovery.cleanup();
    
    console.log('🔌 All peer connections closed and monitoring stopped');
  }

  getConnectionState(userId: string): RTCPeerConnectionState | null {
    const peerState = this.peers.get(userId);
    return peerState ? peerState.connection.connectionState : null;
  }

  getConnectedPeers(): string[] {
    return Array.from(this.peers.entries())
      .filter(([_, state]) => state.connection.connectionState === 'connected')
      .map(([userId]) => userId);
  }

  getConnectionMetrics(): Record<string, any> {
    const metrics = {
      totalPeers: this.peers.size,
      connectedPeers: this.getConnectedPeers().length,
      reconnectionAttempts: 0,
      avgConnectionTime: 0
    };

    this.peers.forEach((state) => {
      metrics.reconnectionAttempts += state.connectionAttempts;
    });

    return metrics;
  }

  startHealthMonitoring(): void {
    // Start connection quality monitoring
    this.connectionMonitor.startMonitoring();
    
    // Enhanced peer activity monitoring with recovery
    setInterval(() => {
      const now = Date.now();
      this.peers.forEach((state, userId) => {
        const timeSinceActivity = now - state.lastActivity;
        
        if (timeSinceActivity > 60000) { // 1 minute of inactivity
          console.warn(`⚠️ Peer ${userId} inactive for ${timeSinceActivity}ms`);
          
          if (timeSinceActivity > 180000) { // 3 minutes - attempt recovery
            console.log(`🔄 Attempting recovery for inactive peer: ${userId}`);
            this.attemptReconnection(userId);
          } else if (timeSinceActivity > 300000) { // 5 minutes - force disconnect
            console.log(`🔌 Force disconnecting inactive peer: ${userId}`);
            this.handlePeerDisconnection(userId);
          }
        }
      });
    }, 30000); // Check every 30 seconds
  }

  isRecovering(): boolean {
    return this.connectionRecovery.isInRecovery();
  }

  getReconnectionAttempts(userId: string): number {
    return this.reconnectionAttempts.get(userId) || 0;
  }
}
