interface WebRTCManagerOptions {
  localStream: MediaStream;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onPeerDisconnected: (userId: string) => void;
  onError: (error: Error) => void;
  onConnectionQuality?: (userId: string, quality: any) => void;
}

interface PeerState {
  connection: RTCPeerConnection;
  isNegotiating: boolean;
  pendingIceCandidates: RTCIceCandidateInit[];
  lastActivity: number;
}

import { ConnectionMonitor } from './connectionMonitor';
import { VoiceConnectionRecovery } from './connectionRecovery';

export class WebRTCManager {
  private peers = new Map<string, PeerState>();
  private localStream: MediaStream;
  private onRemoteStream: (userId: string, stream: MediaStream) => void;
  private onPeerDisconnected: (userId: string) => void;
  private onError: (error: Error) => void;
  private onConnectionQuality?: (userId: string, quality: any) => void;
  private signalingQueue = new Map<string, Promise<void>>();
  private connectionMonitor: ConnectionMonitor;
  private connectionRecovery: VoiceConnectionRecovery;
  private reconnectionAttempts = new Map<string, number>();
  private maxReconnectionAttempts = 3;

  constructor(options: WebRTCManagerOptions) {
    this.localStream = options.localStream;
    this.onRemoteStream = options.onRemoteStream;
    this.onPeerDisconnected = options.onPeerDisconnected;
    this.onError = options.onError;
    this.onConnectionQuality = options.onConnectionQuality;

    // Initialize connection monitor
    this.connectionMonitor = new ConnectionMonitor({
      onQualityChange: (userId, quality) => {
        console.log(`📊 Connection quality for ${userId}:`, quality.quality, `(${quality.rtt}ms RTT)`);
        this.onConnectionQuality?.(userId, quality);
      },
      onConnectionLoss: (userId) => {
        console.log(`📡 Connection lost detected for: ${userId}`);
        this.handlePeerDisconnection(userId);
      }
    });

    // Initialize connection recovery
    this.connectionRecovery = new VoiceConnectionRecovery((attempt, maxRetries) => {
      console.log(`🔄 Voice connection recovery attempt ${attempt}/${maxRetries}`);
    });
  }

  private queueSignalingOperation<T>(userId: string, operation: () => Promise<T>): Promise<T> {
    const existingOperation = this.signalingQueue.get(userId) || Promise.resolve();
    
    const newOperation = existingOperation
      .then(() => operation())
      .catch(error => {
        console.error(`Signaling operation failed for ${userId}:`, error);
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
      
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      };

      const peerConnection = new RTCPeerConnection(configuration);
      
      const peerState: PeerState = {
        connection: peerConnection,
        isNegotiating: false,
        pendingIceCandidates: [],
        lastActivity: Date.now()
      };
      
      this.peers.set(userId, peerState);

      // Add to connection monitor
      this.connectionMonitor.addPeer(userId, peerConnection);

      // Add local stream tracks
      this.localStream.getTracks().forEach(track => {
        console.log(`📤 Adding local ${track.kind} track for:`, userId);
        peerConnection.addTrack(track, this.localStream);
      });

      // FIXED: Handle remote stream with proper audio setup
      peerConnection.ontrack = (event) => {
        console.log('📡 Received remote track from:', userId, 'streams:', event.streams.length);
        const [remoteStream] = event.streams;
        
        if (remoteStream && remoteStream.getTracks().length > 0) {
          console.log('🎵 Remote stream has tracks:', remoteStream.getTracks().map(t => t.kind));
          
          // Ensure audio tracks are enabled and properly configured
          const audioTracks = remoteStream.getAudioTracks();
          audioTracks.forEach(track => {
            track.enabled = true;
            console.log(`🎤 Audio track enabled for ${userId}:`, track.id, track.readyState);
          });
          
          this.onRemoteStream(userId, remoteStream);
          peerState.lastActivity = Date.now();
          // Reset reconnection attempts on successful connection
          this.reconnectionAttempts.delete(userId);
        } else {
          console.warn('⚠️ Remote stream has no tracks for:', userId);
        }
      };

      // Handle ICE candidates - buffer them properly
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 New ICE candidate for:', userId, event.candidate.type);
          peerState.pendingIceCandidates.push(event.candidate.toJSON());
        } else {
          console.log('🧊 ICE gathering complete for:', userId);
        }
      };

      // Handle negotiation needed
      peerConnection.onnegotiationneeded = async () => {
        if (peerState.isNegotiating) {
          console.log('⚠️ Already negotiating for:', userId);
          return;
        }
        
        try {
          peerState.isNegotiating = true;
          console.log('🤝 Negotiation needed for:', userId);
        } catch (error) {
          console.error('❌ Negotiation error for:', userId, error);
          this.onError(error as Error);
        } finally {
          peerState.isNegotiating = false;
        }
      };

      // Enhanced connection state handling with auto-recovery
      peerConnection.onconnectionstatechange = () => {
        console.log(`🔌 Connection state for ${userId}:`, peerConnection.connectionState);
        peerState.lastActivity = Date.now();
        
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC connection established with:', userId);
          // Process any pending ICE candidates
          this.processPendingIceCandidates(userId);
          // Reset reconnection attempts
          this.reconnectionAttempts.delete(userId);
        } else if (peerConnection.connectionState === 'disconnected') {
          console.log('⚠️ WebRTC connection disconnected with:', userId);
          this.attemptReconnection(userId);
        } else if (peerConnection.connectionState === 'failed') {
          console.log('❌ WebRTC connection failed with:', userId);
          this.attemptReconnection(userId);
        }
      };

      // Enhanced ICE connection state handling
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state for ${userId}:`, peerConnection.iceConnectionState);
        peerState.lastActivity = Date.now();
        
        if (peerConnection.iceConnectionState === 'failed') {
          console.log('🔄 ICE connection failed, attempting restart for:', userId);
          this.restartIce(userId);
        } else if (peerConnection.iceConnectionState === 'disconnected') {
          console.log('⚠️ ICE connection disconnected for:', userId);
          // Give it a moment before attempting recovery
          setTimeout(() => {
            if (peerConnection.iceConnectionState === 'disconnected') {
              this.attemptReconnection(userId);
            }
          }, 5000);
        }
      };

      return peerConnection;
    });
  }

  private async processPendingIceCandidates(userId: string): Promise<void> {
    const peerState = this.peers.get(userId);
    if (!peerState || peerState.pendingIceCandidates.length === 0) return;
    
    console.log(`🧊 Processing ${peerState.pendingIceCandidates.length} pending ICE candidates for:`, userId);
    
    for (const candidate of peerState.pendingIceCandidates) {
      try {
        await peerState.connection.addIceCandidate(candidate);
      } catch (error) {
        console.error('❌ Failed to add pending ICE candidate:', error);
      }
    }
    
    peerState.pendingIceCandidates = [];
  }

  private async restartIce(userId: string): Promise<void> {
    const peerState = this.peers.get(userId);
    if (!peerState) return;
    
    try {
      await peerState.connection.restartIce();
      console.log('🔄 ICE restart initiated for:', userId);
    } catch (error) {
      console.error('❌ ICE restart failed for:', userId, error);
      this.handlePeerDisconnection(userId);
    }
  }

  private async attemptReconnection(userId: string): Promise<void> {
    const attempts = this.reconnectionAttempts.get(userId) || 0;
    
    if (attempts >= this.maxReconnectionAttempts) {
      console.log(`❌ Max reconnection attempts reached for ${userId}, giving up`);
      this.handlePeerDisconnection(userId);
      return;
    }

    this.reconnectionAttempts.set(userId, attempts + 1);
    
    try {
      console.log(`🔄 Attempting reconnection ${attempts + 1}/${this.maxReconnectionAttempts} for:`, userId);
      
      await this.connectionRecovery.attemptRecovery(async () => {
        // Try ICE restart first
        await this.restartIce(userId);
        
        // Wait a moment for ICE restart to take effect
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const peerState = this.peers.get(userId);
        if (peerState && peerState.connection.connectionState !== 'connected') {
          throw new Error('ICE restart did not restore connection');
        }
      });
      
      console.log(`✅ Reconnection successful for: ${userId}`);
      
    } catch (error) {
      console.error(`❌ Reconnection failed for ${userId}:`, error);
      
      if (attempts + 1 >= this.maxReconnectionAttempts) {
        this.handlePeerDisconnection(userId);
      }
    }
  }

  private handlePeerDisconnection(userId: string): void {
    const peerState = this.peers.get(userId);
    if (!peerState) return;
    
    // Remove from connection monitor
    this.connectionMonitor.removePeer(userId);
    
    // Clean up reconnection attempts
    this.reconnectionAttempts.delete(userId);
    
    // Clean up the peer connection
    peerState.connection.close();
    this.peers.delete(userId);
    this.signalingQueue.delete(userId);
    
    console.log('🔌 Cleaned up peer connection for:', userId);
    this.onPeerDisconnected(userId);
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
    this.signalingQueue.clear();
    this.reconnectionAttempts.clear();
    this.connectionMonitor.cleanup();
    this.connectionRecovery.cleanup();
    console.log('🔌 Closed all peer connections');
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

  // Enhanced health monitoring with recovery
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

  // New methods for recovery status
  isRecovering(): boolean {
    return this.connectionRecovery.isInRecovery();
  }

  getReconnectionAttempts(userId: string): number {
    return this.reconnectionAttempts.get(userId) || 0;
  }
}
