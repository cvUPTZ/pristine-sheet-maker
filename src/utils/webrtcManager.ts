
interface WebRTCManagerOptions {
  localStream: MediaStream;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onPeerDisconnected: (userId: string) => void;
  onError: (error: Error) => void;
}

export class WebRTCManager {
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream;
  private onRemoteStream: (userId: string, stream: MediaStream) => void;
  private onPeerDisconnected: (userId: string) => void;
  private onError: (error: Error) => void;

  constructor(options: WebRTCManagerOptions) {
    this.localStream = options.localStream;
    this.onRemoteStream = options.onRemoteStream;
    this.onPeerDisconnected = options.onPeerDisconnected;
    this.onError = options.onError;
  }

  async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    console.log('🔗 Creating peer connection for:', userId);
    
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    this.peerConnections.set(userId, peerConnection);

    // Add local stream tracks
    this.localStream.getTracks().forEach(track => {
      console.log(`📤 Adding local ${track.kind} track for:`, userId);
      peerConnection.addTrack(track, this.localStream);
    });

    // Handle remote stream - IMPROVED
    peerConnection.ontrack = (event) => {
      console.log('📡 Received remote track from:', userId, 'streams:', event.streams.length);
      const [remoteStream] = event.streams;
      
      if (remoteStream && remoteStream.getTracks().length > 0) {
        console.log('🎵 Remote stream has tracks:', remoteStream.getTracks().map(t => t.kind));
        this.onRemoteStream(userId, remoteStream);
      } else {
        console.warn('⚠️ Remote stream has no tracks for:', userId);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 New ICE candidate for:', userId, event.candidate.type);
        (peerConnection as any).pendingIceCandidate = event.candidate;
      } else {
        console.log('🧊 ICE gathering complete for:', userId);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`🔌 Connection state for ${userId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        console.log('✅ WebRTC connection established with:', userId);
      } else if (peerConnection.connectionState === 'disconnected' || 
                 peerConnection.connectionState === 'failed') {
        console.log('❌ WebRTC connection lost with:', userId);
        this.onPeerDisconnected(userId);
      }
    };

    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state for ${userId}:`, peerConnection.iceConnectionState);
    };

    return peerConnection;
  }

  async createOffer(userId: string): Promise<RTCSessionDescriptionInit> {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) throw new Error(`No peer connection for ${userId}`);

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    await peerConnection.setLocalDescription(offer);
    console.log('📤 Created offer for:', userId);
    return offer;
  }

  async createAnswer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) throw new Error(`No peer connection for ${userId}`);

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    await peerConnection.setLocalDescription(answer);
    console.log('📤 Created answer for:', userId);
    return answer;
  }

  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) throw new Error(`No peer connection for ${userId}`);

    await peerConnection.setRemoteDescription(answer);
    console.log('📥 Handled answer from:', userId);
  }

  async addIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) throw new Error(`No peer connection for ${userId}`);

    try {
      await peerConnection.addIceCandidate(candidate);
      console.log('🧊 Added ICE candidate from:', userId);
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
    }
  }

  getPendingIceCandidate(userId: string): RTCIceCandidate | null {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) return null;
    
    const candidate = (peerConnection as any).pendingIceCandidate;
    (peerConnection as any).pendingIceCandidate = null;
    return candidate;
  }

  closePeerConnection(userId: string): void {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
      console.log('🔌 Closed peer connection for:', userId);
    }
  }

  closeAllConnections(): void {
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
      console.log('🔌 Closed peer connection for:', userId);
    });
    this.peerConnections.clear();
  }
}
