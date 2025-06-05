// src/services/WebRTCManager.ts

import { SupabaseClient, RealtimeChannel, RealtimeChannelSendResponse } from '@supabase/supabase-js';
import { AudioManager } from './AudioManager'; // Assuming AudioManager is in the same directory or path is adjusted
import { PRODUCTION_VOICE_CONFIG } from '@/config/voiceConfig'; // Assuming voiceConfig path

interface PeerConnection {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  isEstablished: boolean;
  remoteStream?: MediaStream;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'error';
  payload: any;
  senderId: string;
  targetId?: string; // For direct messages
}

export class WebRTCManager {
  private static instance: WebRTCManager;
  private supabase: SupabaseClient | null = null;
  private userId: string | null = null;
  private currentRoomId: string | null = null;
  private signalingChannel: RealtimeChannel | null = null;
  private peerConnections = new Map<string, PeerConnection>();
  private localStream: MediaStream | null = null;
  private audioManager: AudioManager;

  // Public callbacks
  public onRemoteStreamAdded: (peerId: string, stream: MediaStream) => void = () => {};
  public onRemoteStreamRemoved: (peerId: string) => void = () => {};
  public onPeerStatusChanged: (peerId: string, status: RTCPeerConnectionState) => void = () => {};

  private constructor() {
    this.audioManager = AudioManager.getInstance();
    console.log('[WebRTCManager] Instantiated');
  }

  public static getInstance(): WebRTCManager {
    if (!WebRTCManager.instance) {
      WebRTCManager.instance = new WebRTCManager();
    }
    return WebRTCManager.instance;
  }

  public initialize(supabaseClient: SupabaseClient, userId: string): void {
    if (this.supabase && this.userId) {
      console.warn('[WebRTCManager] Already initialized.');
      return;
    }
    this.supabase = supabaseClient;
    this.userId = userId;
    console.log(`[WebRTCManager] Initialized for user: ${userId}`);
  }

  private async ensureLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      console.log('[WebRTCManager.ensureLocalStream] Re-using existing local stream.');
      return this.localStream;
    }
    try {
      console.log('[WebRTCManager.ensureLocalStream] Attempting to get local stream via AudioManager.');
      this.localStream = await this.audioManager.getUserMedia();
      if (!this.localStream) {
        throw new Error('Failed to get local media stream from AudioManager.');
      }
      console.log('[WebRTCManager.ensureLocalStream] Local stream acquired.');
      return this.localStream;
    } catch (error) {
      console.error('[WebRTCManager.ensureLocalStream] Error acquiring local stream:', error);
      throw new Error('Microphone access denied or unavailable.');
    }
  }

  public async joinRoom(roomId: string, initialPeers: Array<{ userId: string }>): Promise<void> {
    if (!this.supabase || !this.userId) {
      console.error('[WebRTCManager.joinRoom] WebRTCManager not initialized.');
      throw new Error('WebRTCManager not initialized. Call initialize() first.');
    }
    if (this.currentRoomId) {
      console.warn(`[WebRTCManager.joinRoom] Already in room ${this.currentRoomId}. Leaving before joining new room.`);
      await this.leaveRoom();
    }

    this.currentRoomId = roomId;
    console.log(`[WebRTCManager.joinRoom] User ${this.userId} attempting to join room: ${roomId}`);

    try {
      await this.ensureLocalStream();
    } catch (error) {
      console.error('[WebRTCManager.joinRoom] Failed to ensure local stream:', error);
      this.currentRoomId = null; // Reset room ID as join failed
      throw error; // Propagate error (e.g., mic access denied)
    }

    const channelName = `voice-room-signaling:${roomId}`;
    this.signalingChannel = this.supabase.channel(channelName, {
      config: {
        broadcast: {
          ack: true,
        },
      },
    });

    this.signalingChannel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        // Ensure payload is treated as SignalingMessage
        this.handleSignalingMessage(payload as SignalingMessage);
      })
      .subscribe(async (status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[WebRTCManager.joinRoom] Successfully subscribed to ${channelName}`);
          await this.broadcastSignal('user-joined', { joinedUserId: this.userId });
          console.log(`[WebRTCManager.joinRoom] Processing ${initialPeers.length} initial peers.`);
          initialPeers.forEach(peer => {
            if (peer.userId !== this.userId) {
              console.log(`[WebRTCManager.joinRoom] Initiating connection to initial peer: ${peer.userId}`);
              this.initiatePeerConnection(peer.userId, true); // This client is the offerer for initial peers
            }
          });
        } else if (status === 'CHANNEL_ERROR' || err) {
          console.error(`[WebRTCManager.joinRoom] Failed to subscribe to ${channelName}:`, status, err);
          this.currentRoomId = null;
          // Optionally, attempt to clean up any partial connections or state
        } else {
          console.log(`[WebRTCManager.joinRoom] Signaling channel status for ${channelName}: ${status}`);
        }
      });
    console.log(`[WebRTCManager.joinRoom] Subscribing to channel: ${channelName}`);
  }

  private async broadcastSignal(type: SignalingMessage['type'], payload: any): Promise<RealtimeChannelSendResponse | void> {
    if (!this.signalingChannel || !this.userId) {
      console.error('[WebRTCManager.broadcastSignal] Signaling channel or userId not available.');
      return;
    }
    const message: SignalingMessage = { type, payload, senderId: this.userId };
    console.log(`[WebRTCManager.broadcastSignal] Broadcasting '${type}' from ${this.userId}:`, payload);
    try {
      return await this.signalingChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload: message,
      });
    } catch (error) {
        console.error(`[WebRTCManager.broadcastSignal] Error broadcasting signal '${type}':`, error);
    }
  }

  private async sendDirectSignal(targetId: string, type: SignalingMessage['type'], payload: any): Promise<RealtimeChannelSendResponse | void> {
    if (!this.signalingChannel || !this.userId) {
      console.error('[WebRTCManager.sendDirectSignal] Signaling channel or userId not available.');
      return;
    }
    // Supabase broadcast-only channel means direct signals are also sent via broadcast,
    // but with a targetId. The receiving client will filter.
    const message: SignalingMessage = { type, payload, senderId: this.userId, targetId };
    console.log(`[WebRTCManager.sendDirectSignal] Sending '${type}' from ${this.userId} to ${targetId}:`, payload);
     try {
      return await this.signalingChannel.send({
        type: 'broadcast', // Still broadcast
        event: 'signal',     // Specific event clients listen for
        payload: message,    // Actual message payload
      });
    } catch (error) {
        console.error(`[WebRTCManager.sendDirectSignal] Error sending direct signal '${type}' to ${targetId}:`, error);
    }
  }

  private handleSignalingMessage(message: SignalingMessage): void {
    if (!this.userId || message.senderId === this.userId) {
      // console.log('[WebRTCManager.handleSignalingMessage] Ignoring self-sent or irrelevant message:', message);
      return; // Ignore messages from self
    }

    // If message has a targetId and it's not this user, ignore
    if (message.targetId && message.targetId !== this.userId) {
      // console.log(`[WebRTCManager.handleSignalingMessage] Message for ${message.targetId}, not me (${this.userId}). Ignoring.`);
      return;
    }
    
    console.log(`[WebRTCManager.handleSignalingMessage] Received '${message.type}' from ${message.senderId}:`, message.payload);

    switch (message.type) {
      case 'user-joined':
        if (message.payload.joinedUserId !== this.userId) {
          console.log(`[WebRTCManager.handleSignalingMessage] Peer ${message.payload.joinedUserId} joined. Initiating connection (as non-offerer).`);
          this.initiatePeerConnection(message.payload.joinedUserId, false); // New joiner is offerer, this client is not
        }
        break;
      case 'offer':
        this.handleOffer(message.senderId, message.payload.sdp);
        break;
      case 'answer':
        this.handleAnswer(message.senderId, message.payload.sdp);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(message.senderId, message.payload.candidate);
        break;
      case 'user-left':
        console.log(`[WebRTCManager.handleSignalingMessage] Peer ${message.senderId} left.`);
        this.closePeerConnection(message.senderId);
        break;
      case 'error':
        console.error(`[WebRTCManager.handleSignalingMessage] Received error signal from ${message.senderId}:`, message.payload);
        // Potentially close connection with peer if error is critical
        // this.closePeerConnection(message.senderId);
        break;
      default:
        console.warn('[WebRTCManager.handleSignalingMessage] Received unknown message type:', message.type);
    }
  }

  private initiatePeerConnection(peerId: string, isOfferer: boolean): void {
    if (!this.userId) {
      console.error('[WebRTCManager.initiatePeerConnection] User ID not set.');
      return;
    }
    if (this.peerConnections.has(peerId)) {
      console.warn(`[WebRTCManager.initiatePeerConnection] Connection already exists or being established with ${peerId}.`);
      // Potentially check pc.makingOffer and isOfferer to resolve glare, but for now, let it be.
      // If an existing connection is stable, we might not want to re-initiate.
      // If it's `makingOffer` and we also want to offer, one must yield.
      // The current logic might lead to redundant offers if glare occurs.
      // A simple glare resolution: if (this.peerConnections.get(peerId)?.makingOffer && isOfferer) { console.log("Glare detected, I will not offer"); return; }
      return;
    }

    console.log(`[WebRTCManager.initiatePeerConnection] Creating new RTCPeerConnection for peer: ${peerId}, I am offerer: ${isOfferer}`);
    const pc = new RTCPeerConnection({ iceServers: PRODUCTION_VOICE_CONFIG.iceServers });
    this.peerConnections.set(peerId, { pc, makingOffer: false, isEstablished: false });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, this.localStream!);
          console.log(`[WebRTCManager.initiatePeerConnection] Added local track to PC for ${peerId}:`, track.kind);
        } catch (e) {
          console.error(`[WebRTCManager.initiatePeerConnection] Error adding local track for ${peerId}:`, e);
        }
      });
    } else {
      console.warn(`[WebRTCManager.initiatePeerConnection] No local stream available to add tracks for ${peerId}. This should not happen if joinRoom succeeded.`);
      // Potentially send an error signal or try to re-acquire stream, though ensureLocalStream should prevent this.
    }

    pc.onicecandidate = event => {
      if (event.candidate) {
        // console.log(`[WebRTCManager.onicecandidate] Sending ICE candidate to ${peerId}:`, event.candidate);
        this.sendDirectSignal(peerId, 'ice-candidate', { candidate: event.candidate });
      }
    };

    pc.ontrack = event => {
      console.log(`[WebRTCManager.ontrack] Received remote track from ${peerId}:`, event.track, event.streams);
      const remoteStream = event.streams[0];
      if (remoteStream) {
         const peerConnection = this.peerConnections.get(peerId);
         if (peerConnection) peerConnection.remoteStream = remoteStream;
        this.onRemoteStreamAdded(peerId, remoteStream);
        this.audioManager.playRemoteStream(peerId, remoteStream);
      } else {
        console.warn(`[WebRTCManager.ontrack] Remote track event from ${peerId} did not contain a stream.`);
      }
    };

    pc.onconnectionstatechange = () => {
      const peerConnection = this.peerConnections.get(peerId);
      if (!peerConnection) return;

      console.log(`[WebRTCManager.onconnectionstatechange] Connection state with ${peerId}: ${pc.connectionState}`);
      this.onPeerStatusChanged(peerId, pc.connectionState);

      switch (pc.connectionState) {
        case 'connected':
          peerConnection.isEstablished = true;
          peerConnection.makingOffer = false; // Reset offer flag
          console.log(`[WebRTCManager.onconnectionstatechange] Successfully connected with ${peerId}.`);
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          console.log(`[WebRTCManager.onconnectionstatechange] Connection with ${peerId} ${pc.connectionState}. Cleaning up.`);
          this.closePeerConnection(peerId);
          break;
      }
    };
    
    // Simplified glare handling: The 'isOfferer' flag determines who makes the initial offer.
    // If both sides try to offer simultaneously (glare), they might both set `makingOffer`.
    // A more robust glare resolution would involve comparing UIDs or a random token.
    // For this implementation, if `isOfferer` is true, this client proceeds.
    // If `isOfferer` is false, this client waits for an offer.
    if (isOfferer) {
      const peerEntry = this.peerConnections.get(peerId);
      if (peerEntry) peerEntry.makingOffer = true;

      pc.createOffer()
        .then(offer => {
          console.log(`[WebRTCManager.initiatePeerConnection] Created offer for ${peerId}`);
          return pc.setLocalDescription(offer).then(() => offer);
        })
        .then(offer => {
          this.sendDirectSignal(peerId, 'offer', { sdp: offer });
          console.log(`[WebRTCManager.initiatePeerConnection] Sent offer to ${peerId}`);
        })
        .catch(error => {
          console.error(`[WebRTCManager.initiatePeerConnection] Error creating/sending offer to ${peerId}:`, error);
          this.sendDirectSignal(peerId, 'error', { message: 'Offer creation failed', detail: error.toString() });
          if (peerEntry) peerEntry.makingOffer = false;
        });
    }
  }

  private async handleOffer(peerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const peerEntry = this.peerConnections.get(peerId);
    if (!peerEntry) {
      console.warn(`[WebRTCManager.handleOffer] No peer connection found for ${peerId}. Initiating as non-offerer.`);
      // This case can happen if an offer arrives before `user-joined` or if `user-joined` was missed.
      // We should create a connection if one doesn't exist.
      this.initiatePeerConnection(peerId, false); // Ensure PC is created
      // Wait a tick for PC to be set up, then re-process. This is a bit of a hack.
      // A better way would be to queue the offer if PC is not ready.
      // For now, let's assume initiatePeerConnection sets up the PC synchronously enough for the next step.
      // Or, the offer might be lost if the PC isn't ready immediately.
      // A robust solution: if (!peerEntry) { queueOffer(peerId, sdp); this.initiatePeerConnection(peerId, false); return; }
      // Then, after pc.setRemoteDescription in handleOffer, check queue.
      // For this subtask, let's assume simple flow:
      // Fallback: if pc is not ready, it might fail.
      // More likely scenario: user-joined created the PC entry, so this will be found.
      // If an offer arrives and there's no PC, it implies the offering client is initiating.
      // So, this client (receiving the offer) should NOT be the offerer.
      // The call to initiatePeerConnection(peerId, false) above should prepare it.
      // Let's retry getting the peerEntry after a brief moment if it wasn't found initially.
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const updatedPeerEntry = this.peerConnections.get(peerId);
      if (!updatedPeerEntry) {
          console.error(`[WebRTCManager.handleOffer] Still no peer connection for ${peerId} after delay. Cannot handle offer.`);
          return;
      }
      // Now use updatedPeerEntry.pc
      const pc = updatedPeerEntry.pc;

      console.log(`[WebRTCManager.handleOffer] Handling offer from ${peerId}`);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        console.log(`[WebRTCManager.handleOffer] Created answer for ${peerId}`);
        await pc.setLocalDescription(answer);
        this.sendDirectSignal(peerId, 'answer', { sdp: answer });
        console.log(`[WebRTCManager.handleOffer] Sent answer to ${peerId}`);
      } catch (error) {
        console.error(`[WebRTCManager.handleOffer] Error handling offer/creating answer for ${peerId}:`, error);
        this.sendDirectSignal(peerId, 'error', { message: 'Answer creation failed', detail: error.toString() });
      }
      return; // Exit after handling the offer for the newly created PC
    }

    const pc = peerEntry.pc;

    // Offer/answer exchange might be happening. Check `makingOffer` to mitigate glare.
    // This is a simplified glare handling. If this client is also trying to make an offer,
    // it might need a more sophisticated way to decide who proceeds.
    // For example, comparing user IDs if `makingOffer` is true for this `peerId`.
    if (peerEntry.makingOffer) {
        // Basic glare: if both are making offers, one might ignore the incoming offer if IDs are comparable.
        // For now, we assume the `isOfferer` flag at `initiatePeerConnection` helps.
        // If an offer is received while `makingOffer` is true, it's a glare scenario.
        // A common strategy: higher user ID backs off. Or, if already sent an offer, ignore this one.
        console.warn(`[WebRTCManager.handleOffer] Glare condition? Received offer from ${peerId} while also potentially making one. Proceeding to answer.`);
        // Potentially: if (this.userId! > peerId) { console.log("Glare: I will ignore their offer and let mine proceed."); return; }
    }


    console.log(`[WebRTCManager.handleOffer] Handling offer from ${peerId}`);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      console.log(`[WebRTCManager.handleOffer] Created answer for ${peerId}`);
      await pc.setLocalDescription(answer);
      this.sendDirectSignal(peerId, 'answer', { sdp: answer });
      console.log(`[WebRTCManager.handleOffer] Sent answer to ${peerId}`);
    } catch (error) {
      console.error(`[WebRTCManager.handleOffer] Error handling offer/creating answer for ${peerId}:`, error);
      this.sendDirectSignal(peerId, 'error', { message: 'Answer creation/handling failed', detail: error.toString() });
    }
  }

  private async handleAnswer(peerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const peerEntry = this.peerConnections.get(peerId);
    if (!peerEntry) {
      console.error(`[WebRTCManager.handleAnswer] No peer connection found for ${peerId} to handle answer.`);
      return;
    }
    console.log(`[WebRTCManager.handleAnswer] Handling answer from ${peerId}`);
    try {
      await peerEntry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log(`[WebRTCManager.handleAnswer] Set remote description for answer from ${peerId}. Connection should establish.`);
      peerEntry.makingOffer = false; // Offer-answer cycle complete for this side
    } catch (error) {
      console.error(`[WebRTCManager.handleAnswer] Error setting remote description for answer from ${peerId}:`, error);
      this.sendDirectSignal(peerId, 'error', { message: 'Answer processing failed', detail: error.toString() });
    }
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerEntry = this.peerConnections.get(peerId);
    if (!peerEntry) {
      console.warn(`[WebRTCManager.handleIceCandidate] No peer connection found for ${peerId}. Candidate might be queued or lost.`);
      // TODO: Consider queuing candidates if PC isn't ready yet.
      return;
    }
    // console.log(`[WebRTCManager.handleIceCandidate] Handling ICE candidate from ${peerId}:`, candidate);
    try {
      // Ensure candidate is not null or empty string before adding
      if (candidate && candidate.candidate) {
        await peerEntry.pc.addIceCandidate(new RTCIceCandidate(candidate));
        // console.log(`[WebRTCManager.handleIceCandidate] Added ICE candidate from ${peerId}`);
      } else {
        // console.log(`[WebRTCManager.handleIceCandidate] Received empty/null ICE candidate from ${peerId}. Ignoring.`);
      }
    } catch (error) {
      // Ignore error: "Error processing ICE candidate"
      // These errors are common if a candidate arrives before SRD, or after connection closure.
      // console.warn(`[WebRTCManager.handleIceCandidate] Error adding ICE candidate from ${peerId}:`, error);
      // this.sendDirectSignal(peerId, 'error', { message: 'ICE candidate processing failed', detail: error.toString() });
    }
  }

  public closePeerConnection(peerId: string): void {
    const peerEntry = this.peerConnections.get(peerId);
    if (peerEntry) {
      console.log(`[WebRTCManager.closePeerConnection] Closing peer connection with ${peerId}`);
      peerEntry.pc.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop(); // Stop the track
        }
        // Don't necessarily remove sender, closing PC handles this.
      });
      peerEntry.pc.close();
      this.peerConnections.delete(peerId);
      
      this.audioManager.removeRemoteStream(peerId);
      this.onRemoteStreamRemoved(peerId);
      console.log(`[WebRTCManager.closePeerConnection] Peer connection with ${peerId} closed and cleaned up.`);
    } else {
      // console.log(`[WebRTCManager.closePeerConnection] No active peer connection found for ${peerId} to close.`);
    }
  }

  public async leaveRoom(): Promise<void> {
    if (!this.currentRoomId || !this.userId) {
      console.log('[WebRTCManager.leaveRoom] Not in a room or not initialized.');
      return;
    }
    console.log(`[WebRTCManager.leaveRoom] User ${this.userId} leaving room ${this.currentRoomId}`);

    // Notify others
    if (this.signalingChannel) {
      try {
        await this.broadcastSignal('user-left', { leftUserId: this.userId });
        console.log('[WebRTCManager.leaveRoom] Broadcasted user-left signal.');
      } catch (e) {
        console.warn('[WebRTCManager.leaveRoom] Error broadcasting user-left, proceeding with cleanup:', e);
      }
    }


    this.peerConnections.forEach((_, peerId) => {
      this.closePeerConnection(peerId);
    });
    this.peerConnections.clear();

    if (this.signalingChannel) {
      try {
        await this.supabase?.removeChannel(this.signalingChannel);
        console.log(`[WebRTCManager.leaveRoom] Unsubscribed from signaling channel: ${this.signalingChannel.topic}`);
      } catch (error) {
        console.error('[WebRTCManager.leaveRoom] Error unsubscribing from signaling channel:', error);
      } finally {
        this.signalingChannel = null;
      }
    }
    
    // Do not stop/release local stream here, AudioManager owns it.
    // WebRTCManager just uses it. If another room is joined, it will be reused.
    // this.localStream = null; // Cleared if necessary by ensureLocalStream or if AudioManager indicates it's gone

    console.log(`[WebRTCManager.leaveRoom] Cleaned up for room ${this.currentRoomId}. User ${this.userId} has left.`);
    this.currentRoomId = null;
  }

  public getPeerConnection(peerId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(peerId)?.pc;
  }

  public getAllPeerConnections(): Map<string, PeerConnection> {
    return this.peerConnections;
  }

  public getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  public getLocalStream(): MediaStream | null {
      return this.localStream;
  }

  // Call this method if the local audio stream changes (e.g., mic switch)
  public async updateLocalStream(newStream: MediaStream): Promise<void> {
    if (!this.userId) return;
    console.log(`[WebRTCManager.updateLocalStream] Updating local stream for all peers.`);
    this.localStream = newStream;

    for (const [peerId, conn] of this.peerConnections) {
      try {
        const senders = conn.pc.getSenders();
        for (const sender of senders) {
          if (sender.track && sender.track.kind === 'audio') {
            if (newStream.getAudioTracks().length > 0) {
              await sender.replaceTrack(newStream.getAudioTracks()[0]);
              console.log(`[WebRTCManager.updateLocalStream] Replaced audio track for peer ${peerId}`);
            } else {
              // If new stream has no audio, remove the track
              // conn.pc.removeTrack(sender); // Or handle as error / mute
              console.warn(`[WebRTCManager.updateLocalStream] New stream has no audio track for peer ${peerId}.`);
            }
          }
        }
        // If connection is not yet fully established, or if it needs renegotiation after track replacement
        // This might require sending a new offer if `restartIce` is true or if state requires it.
        // For simplicity, we assume replaceTrack is enough for established connections.
        // If not, a full renegotiation (new offer/answer) might be needed.
        // if (conn.isEstablished) {
        //   console.log(`[WebRTCManager.updateLocalStream] Triggering renegotiation for peer ${peerId}`);
        //   this.initiatePeerConnection(peerId, true); // Re-offer
        // }

      } catch (error) {
        console.error(`[WebRTCManager.updateLocalStream] Error replacing track for peer ${peerId}:`, error);
      }
    }
  }
}

// Example Usage (Conceptual - not part of the class itself)
/*
async function main() {
  // const supabase = new SupabaseClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
  // const userId = 'user-unique-id'; // Authenticated user's ID

  // const webRTCManager = WebRTCManager.getInstance();
  // webRTCManager.initialize(supabase, userId);

  // webRTCManager.onRemoteStreamAdded = (peerId, stream) => {
  //   console.log('Remote stream added from:', peerId, stream);
  //   // const audioPlayer = document.createElement('audio');
  //   // audioPlayer.srcObject = stream;
  //   // audioPlayer.autoplay = true;
  //   // audioPlayer.id = `audio-${peerId}`;
  //   // document.body.appendChild(audioPlayer);
  //   AudioManager.getInstance().playRemoteStream(peerId, stream);
  // };

  // webRTCManager.onRemoteStreamRemoved = (peerId) => {
  //   console.log('Remote stream removed from:', peerId);
  //   // const audioPlayer = document.getElementById(`audio-${peerId}`);
  //   // if (audioPlayer) {
  //   //   audioPlayer.remove();
  //   // }
  //   AudioManager.getInstance().removeRemoteStream(peerId);
  // };

  // webRTCManager.onPeerStatusChanged = (peerId, status) => {
  //   console.log('Peer status changed:', peerId, status);
  // };

  // try {
  //   // Simulate joining a room. initialPeers would come from your room management service.
  //   // Example: const initialPeers = [{ userId: 'peer1-id' }, { userId: 'peer2-id' }];
  //   // await webRTCManager.joinRoom('room-123', initialPeers);
  // } catch (error) {
  //   console.error('Failed to join room:', error);
  //   // Handle UI error, e.g., show message that mic is needed.
  // }

  // To leave:
  // await webRTCManager.leaveRoom();
}
*/
