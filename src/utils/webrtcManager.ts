
interface WebRTCManagerOptions {
  localStream: MediaStream;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onPeerDisconnected: (userId: string) => void;
  onError: (error: Error) => void;
}

interface PeerState {
  connection: RTCPeerConnection;
  isNegotiating: boolean;
  pendingIceCandidates: RTCIceCandidateInit[];
  lastActivity: number;
}

export class WebRTCManager {
  private peers = new Map<string, PeerState>();
  private localStream: MediaStream;
  private onRemoteStream: (userId: string, stream: MediaStream) => void;
  private onPeerDisconnected: (userId: string) => void;
  private onError: (error: Error) => void;
  private signalingQueue = new Map<string, Promise<void>>();

  constructor(options: WebRTCManagerOptions) {
    this.localStream = options.localStream;
    this.onRemoteStream = options.onRemoteStream;
    this.onPeerDisconnected = options.onPeerDisconnected;
    this.onError = options.onError;
  }

  private queueSignalingOperation<T>(userId: string, operation: () => Promise<T>): Promise<T> {
    const existingOperation = this.signalingQueue.get(userId) || Promise.resolve();
    
    const newOperation = existingOperation
      .then(() => operation())
      .catch(error => {
        console.error(`Signaling operation failed for ${userId}:`, error);
        throw error;
      });
    
    this.signalingQueue.set(userId, newOperation.catch(() => {})); // Don't propagate errors to queue
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

      // Add local stream tracks
      this.localStream.getTracks().forEach(track => {
        console.log(`📤 Adding local ${track.kind} track for:`, userId);
        peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📡 Received remote track from:', userId, 'streams:', event.streams.length);
        const [remoteStream] = event.streams;
        
        if (remoteStream && remoteStream.getTracks().length > 0) {
          console.log('🎵 Remote stream has tracks:', remoteStream.getTracks().map(t => t.kind));
          this.onRemoteStream(userId, remoteStream);
          peerState.lastActivity = Date.now();
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

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`🔌 Connection state for ${userId}:`, peerConnection.connectionState);
        peerState.lastActivity = Date.now();
        
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC connection established with:', userId);
          // Process any pending ICE candidates
          this.processPendingIceCandidates(userId);
        } else if (peerConnection.connectionState === 'disconnected' || 
                   peerConnection.connectionState === 'failed') {
          console.log('❌ WebRTC connection lost with:', userId);
          this.handlePeerDisconnection(userId);
        }
      };

      // Handle ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state for ${userId}:`, peerConnection.iceConnectionState);
        peerState.lastActivity = Date.now();
        
        if (peerConnection.iceConnectionState === 'failed') {
          console.log('🔄 ICE connection failed, attempting restart for:', userId);
          this.restartIce(userId);
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

  private handlePeerDisconnection(userId: string): void {
    const peerState = this.peers.get(userId);
    if (!peerState) return;
    
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

  // Health monitoring
  startHealthMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      this.peers.forEach((state, userId) => {
        const timeSinceActivity = now - state.lastActivity;
        
        if (timeSinceActivity > 60000) { // 1 minute of inactivity
          console.warn(`⚠️ Peer ${userId} inactive for ${timeSinceActivity}ms`);
          
          if (timeSinceActivity > 300000) { // 5 minutes - force disconnect
            console.log(`🔌 Force disconnecting inactive peer: ${userId}`);
            this.handlePeerDisconnection(userId);
          }
        }
      });
    }, 30000); // Check every 30 seconds
  }
}
