import { AudioManager } from '@/services/AudioManager';
import { toast } from '@/components/ui/use-toast';

interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  isConnected: boolean;
  lastActivity: number;
  dataChannel?: RTCDataChannel;
}

interface WebRTCCallbacks {
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onRemoteStream?: (userId: string, stream: MediaStream) => void;
  onConnectionStateChanged?: (userId: string, state: string) => void;
  onError?: (error: Error) => void;
}

export class WebRTCManager {
  private static instance: WebRTCManager;
  private peers: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private isInitialized = false;
  private callbacks: WebRTCCallbacks = {};
  private myUserId: string | null = null;
  private roomId: string | null = null;
  private signalingPromises: Map<string, Promise<any>> = new Map();
  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  private audioManager: AudioManager;

  private constructor() {
    this.audioManager = AudioManager.getInstance();
  }

  public static getInstance(): WebRTCManager {
    if (!WebRTCManager.instance) {
      WebRTCManager.instance = new WebRTCManager();
    }
    return WebRTCManager.instance;
  }

  public async initialize(userId: string, callbacks: WebRTCCallbacks = {}): Promise<void> {
    if (this.isInitialized) {
      console.warn('WebRTCManager already initialized');
      return;
    }

    this.myUserId = userId;
    this.callbacks = callbacks;

    try {
      // AudioManager doesn't have initialize method, just get user media directly
      this.localStream = await this.audioManager.getUserMedia();
      console.log('✅ WebRTC initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  public async joinRoom(roomId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('WebRTCManager not initialized');
    }

    this.roomId = roomId;
    console.log(`📞 Joining room: ${roomId}`);
    
    // Set up periodic activity monitoring
    this.startActivityMonitoring();
  }

  public async createPeerConnection(userId: string): Promise<void> {
    if (this.peers.has(userId)) {
      console.warn(`Peer connection for ${userId} already exists`);
      return;
    }

    try {
      const peerConnection = new RTCPeerConnection(this.configuration);
      
      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      }

      // Set up event handlers
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignalingMessage(userId, {
            type: 'ice-candidate',
            candidate: event.candidate
          });
        }
      };

      peerConnection.ontrack = (event) => {
        console.log(`📺 Remote stream received from ${userId}`);
        const [remoteStream] = event.streams;
        this.callbacks.onRemoteStream?.(userId, remoteStream);
        this.audioManager.playRemoteStream(remoteStream);
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`🔄 Connection state changed for ${userId}: ${state}`);
        
        const peer = this.peers.get(userId);
        if (peer) {
          peer.isConnected = state === 'connected';
          peer.lastActivity = Date.now();
        }
        
        this.callbacks.onConnectionStateChanged?.(userId, state);
        
        if (state === 'disconnected' || state === 'failed') {
          this.handlePeerDisconnection(userId);
        }
      };

      // Create data channel for additional communication
      const dataChannel = peerConnection.createDataChannel('data', {
        ordered: true
      });
      
      dataChannel.onopen = () => {
        console.log(`📡 Data channel opened with ${userId}`);
      };

      const peer: PeerConnection = {
        id: userId,
        connection: peerConnection,
        isConnected: false,
        lastActivity: Date.now(),
        dataChannel
      };

      this.peers.set(userId, peer);
      console.log(`🤝 Peer connection created for ${userId}`);

    } catch (error) {
      console.error(`❌ Failed to create peer connection for ${userId}:`, error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  public async createOffer(userId: string): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) {
      throw new Error(`No peer connection found for ${userId}`);
    }

    try {
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);
      
      this.sendSignalingMessage(userId, {
        type: 'offer',
        offer: offer
      });
      
      console.log(`📤 Offer sent to ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to create offer for ${userId}:`, error);
      throw error;
    }
  }

  public async handleOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    await this.createPeerConnection(userId);
    const peer = this.peers.get(userId);
    if (!peer) {
      throw new Error(`No peer connection found for ${userId}`);
    }

    try {
      await peer.connection.setRemoteDescription(offer);
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);
      
      this.sendSignalingMessage(userId, {
        type: 'answer',
        answer: answer
      });
      
      console.log(`📥 Offer handled and answer sent to ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to handle offer from ${userId}:`, error);
      throw error;
    }
  }

  public async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) {
      throw new Error(`No peer connection found for ${userId}`);
    }

    try {
      await peer.connection.setRemoteDescription(answer);
      console.log(`📥 Answer handled from ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to handle answer from ${userId}:`, error);
      throw error;
    }
  }

  public async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(userId);
    if (!peer) {
      console.warn(`No peer connection found for ${userId} when handling ICE candidate`);
      return;
    }

    try {
      await peer.connection.addIceCandidate(candidate);
      console.log(`🧊 ICE candidate added for ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to add ICE candidate for ${userId}:`, error);
    }
  }

  private sendSignalingMessage(userId: string, message: any): void {
    // Queue signaling operations to avoid conflicts
    const operationKey = `${userId}-${message.type}`;
    const existingOperation = this.signalingPromises.get(operationKey) || Promise.resolve();
    
    const operation = async () => {
      try {
        // This would normally send via WebSocket or similar signaling server
        console.log(`📡 Signaling to ${userId}:`, message.type);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Update last activity
        const peer = this.peers.get(userId);
        if (peer) {
          peer.lastActivity = Date.now();
        }
      } catch (error) {
        console.error(`❌ Signaling failed for ${userId}:`, error);
        throw error;
      }
    };
    
    const newOperation = existingOperation
      .then(() => operation())
      .catch((error: Error) => {
        console.error(`❌ Signaling operation failed for ${userId}:`, error);
        throw error;
      });
    
    this.signalingPromises.set(operationKey, newOperation);
    
    // Clean up completed operations
    newOperation.finally(() => {
      if (this.signalingPromises.get(operationKey) === newOperation) {
        this.signalingPromises.delete(operationKey);
      }
    });
  }

  private handlePeerDisconnection(userId: string): void {
    console.log(`🔌 Handling disconnection for ${userId}`);
    
    const peer = this.peers.get(userId);
    if (peer) {
      peer.connection.close();
      peer.dataChannel?.close();
      this.audioManager.removeRemoteStream(userId);
    }
    
    this.peers.delete(userId);
    this.callbacks.onUserLeft?.(userId);
  }

  private startActivityMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds timeout
      
      for (const [userId, peer] of this.peers.entries()) {
        if (peer.isConnected && (now - peer.lastActivity) > timeout) {
          console.warn(`⚠️ Peer ${userId} inactive for ${now - peer.lastActivity}ms`);
          this.handlePeerDisconnection(userId);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
        console.log(`🎤 Microphone ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }

  public async leaveRoom(): Promise<void> {
    console.log('🚪 Leaving room...');
    
    // Close all peer connections
    for (const [userId, peer] of this.peers.entries()) {
      peer.connection.close();
      peer.dataChannel?.close();
      this.callbacks.onUserLeft?.(userId);
    }
    
    this.peers.clear();
    this.roomId = null;
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    console.log('✅ Left room successfully');
  }

  public getPeerCount(): number {
    return this.peers.size;
  }

  public getConnectedPeers(): string[] {
    return Array.from(this.peers.entries())
      .filter(([_, peer]) => peer.isConnected)
      .map(([userId, _]) => userId);
  }

  public isConnectedToPeer(userId: string): boolean {
    const peer = this.peers.get(userId);
    return peer?.isConnected || false;
  }

  private async withErrorHandling<T>(operation: () => Promise<T>, context: string): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`❌ Error in ${context}:`, error);
      
      // Show user-friendly error messages
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access to use voice chat.",
          variant: "destructive"
        });
      } else if (error.name === 'NotFoundError') {
        toast({
          title: "No Microphone Found",
          description: "Please connect a microphone to use voice chat.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Voice Chat Error",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive"
        });
      }
      
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  public async reconnectToPeer(userId: string): Promise<void> {
    await this.withErrorHandling(async () => {
      console.log(`🔄 Reconnecting to peer ${userId}`);
      
      // Clean up existing connection
      if (this.peers.has(userId)) {
        this.handlePeerDisconnection(userId);
      }
      
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create new connection
      await this.createPeerConnection(userId);
      await this.createOffer(userId);
      
      console.log(`✅ Reconnection initiated for ${userId}`);
    }, `reconnectToPeer(${userId})`);
  }

  public async updateConfiguration(config: Partial<RTCConfiguration>): Promise<void> {
    this.configuration = { ...this.configuration, ...config };
    console.log('🔧 WebRTC configuration updated');
  }

  public getConnectionStats(userId: string): Promise<RTCStatsReport> | null {
    const peer = this.peers.get(userId);
    if (!peer) {
      return null;
    }
    
    return peer.connection.getStats();
  }

  public dispose(): void {
    console.log('🧹 Disposing WebRTCManager...');
    
    this.leaveRoom();
    this.signalingPromises.clear();
    this.isInitialized = false;
    this.myUserId = null;
    this.callbacks = {};
    
    console.log('✅ WebRTCManager disposed');
  }
}
