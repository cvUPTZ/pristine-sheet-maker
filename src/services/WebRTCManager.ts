import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { AudioManager } from './AudioManager';

interface WebRTCManagerCallbacks {
  onConnectionStateChanged?: (userId: string, state: RTCPeerConnectionState) => void;
  onParticipantJoined?: (userId: string, userName?: string) => void;
  onParticipantLeft?: (userId: string) => void;
  onRemoteTrackAdded?: (userId: string, stream: MediaStream) => void;
  onRemoteTrackRemoved?: (userId: string) => void;
  onParticipantMuteChanged?: (userId: string, isMuted: boolean) => void;
  onError?: (errorType: string, error: any) => void;
  onLocalStreamReady?: (stream: MediaStream) => void;
}

interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export class WebRTCManager {
  private supabaseClient: SupabaseClient;
  private localUserId: string;
  private localUserName: string | undefined;
  private iceServers: IceServerConfig[];

  private currentRoomId: string | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private signalingChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;

  // Event Callbacks
  public onConnectionStateChanged: WebRTCManagerCallbacks['onConnectionStateChanged'];
  public onParticipantJoined: WebRTCManagerCallbacks['onParticipantJoined'];
  public onParticipantLeft: WebRTCManagerCallbacks['onParticipantLeft'];
  public onRemoteTrackAdded: WebRTCManagerCallbacks['onRemoteTrackAdded'];
  public onRemoteTrackRemoved: WebRTCManagerCallbacks['onRemoteTrackRemoved'];
  public onParticipantMuteChanged: WebRTCManagerCallbacks['onParticipantMuteChanged'];
  public onError: WebRTCManagerCallbacks['onError'];
  public onLocalStreamReady: WebRTCManagerCallbacks['onLocalStreamReady'];

  constructor(
    supabaseClient: SupabaseClient,
    userId: string,
    userName: string | undefined,
    iceServers: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }],
    callbacks?: WebRTCManagerCallbacks
  ) {
    this.supabaseClient = supabaseClient;
    this.localUserId = userId;
    this.localUserName = userName;
    this.iceServers = iceServers;
    console.log(`[WebRTCManager] Constructor: Initialized with userId: ${userId}, userName: ${userName}`);
    console.log('[WebRTCManager] Constructor: ICE Server Config:', JSON.stringify(iceServers));

    if (callbacks) {
      this.onConnectionStateChanged = callbacks.onConnectionStateChanged;
      this.onParticipantJoined = callbacks.onParticipantJoined;
      this.onParticipantLeft = callbacks.onParticipantLeft;
      this.onRemoteTrackAdded = callbacks.onRemoteTrackAdded;
      this.onRemoteTrackRemoved = callbacks.onRemoteTrackRemoved;
      this.onParticipantMuteChanged = callbacks.onParticipantMuteChanged;
      this.onError = callbacks.onError;
      this.onLocalStreamReady = callbacks.onLocalStreamReady;
    }

    AudioManager.getInstance();
  }

  public async joinRoom(roomId: string): Promise<void> {
    console.log(`[WebRTCManager] joinRoom: Attempting to join room: ${roomId} for localUserId: ${this.localUserId}`);
    if (this.currentRoomId) {
      if (this.currentRoomId === roomId) {
        console.warn(`[WebRTCManager] joinRoom: Already in room ${roomId}. Ignoring call.`);
        return;
      }
      console.log(`[WebRTCManager] joinRoom: Was in room ${this.currentRoomId}. Leaving before joining new room.`);
      await this.leaveRoom();
    }

    this.currentRoomId = roomId;
    console.log(`[WebRTCManager] joinRoom: Set currentRoomId to ${roomId}`);

    try {
      // 1. Authorize user for the room
      console.log(`[WebRTCManager] joinRoom: Invoking Supabase function 'join-voice-room' for roomId: ${roomId}`);
      let authResponse: any;
      let authError: any;
      
      try {
        const response = await this.supabaseClient.functions.invoke('join-voice-room', {
          body: { roomId },
        });
        authResponse = response.data;
        authError = response.error;
      } catch (error) {
        console.error('[WebRTCManager] joinRoom: Failed to invoke edge function \'join-voice-room\':', error);
        authError = error;
      }

      if (authError || !authResponse || !authResponse.authorized) {
        console.error(`[WebRTCManager] joinRoom: Authorization failed for room ${roomId}. Error:`, authError, 'Response:', authResponse);
        this.onError?.('authorization', authError || new Error(authResponse?.error || 'Unknown authorization error'));
        this.currentRoomId = null;
        console.log(`[WebRTCManager] joinRoom: Cleared currentRoomId due to authorization failure.`);
        return;
      }

      console.log(`[WebRTCManager] joinRoom: Successfully authorized for room ${roomId}. Supabase function response: Success.`);

      // 2. Initialize peer connections map
      this.peerConnections = new Map();
      console.log('[WebRTCManager] joinRoom: Initialized peerConnections map.');

      // 3. Set up local audio stream
      try {
        console.log('[WebRTCManager] joinRoom: Attempting to acquire local audio stream via AudioManager.getUserMedia().');
        this.localStream = await AudioManager.getInstance().getUserMedia();
        if (this.localStream) {
          this.onLocalStreamReady?.(this.localStream);
          console.log('[WebRTCManager] joinRoom: Local audio stream acquired successfully.');
        } else {
          console.error('[WebRTCManager] joinRoom: Failed to acquire local audio stream: getUserMedia returned null.');
          throw new Error('Failed to acquire local audio stream: getUserMedia returned null.');
        }
      } catch (error) {
        console.error('[WebRTCManager] joinRoom: Error acquiring local audio stream:', error);
        this.onError?.('media_error', error);
        this.currentRoomId = null;
        console.log(`[WebRTCManager] joinRoom: Cleared currentRoomId due to local stream acquisition failure.`);
        return;
      }
      
      // 4. Subscribe to signaling messages (Postgres changes on realtime_transient_messages)
      const signalingChannelName = `realtime_transient_messages_room_${roomId}`;
      this.signalingChannel = this.supabaseClient.channel(signalingChannelName, {
        config: {
          broadcast: { self: false },
          presence: { key: this.localUserId },
        },
      });

      console.log(`[WebRTCManager] joinRoom: Setting up signaling channel: ${signalingChannelName}`);
      this.signalingChannel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'realtime_transient_messages',
            filter: `room_id=eq.${roomId}`,
          },
          (payload: any) => {
            if (payload.new.sender_id === this.localUserId) return;
            if (payload.new.to_user_id === null || payload.new.to_user_id === this.localUserId) {
                 this.handleSignalingMessage(payload.new);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[WebRTCManager] joinRoom: Successfully subscribed to signaling channel ${signalingChannelName} for room ${roomId}.`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[WebRTCManager] joinRoom: Signaling channel (${signalingChannelName}) subscription error for room ${roomId}:`, err);
            this.onError?.('signaling_subscribe_error', err);
          } else {
            console.log(`[WebRTCManager] joinRoom: Signaling channel (${signalingChannelName}) status for room ${roomId}: ${status}`);
          }
        });

      // 5. Subscribe to presence channel
      const presenceChannelName = `presence:voice_room:${roomId}`;
      console.log(`[WebRTCManager] joinRoom: Setting up presence channel: ${presenceChannelName}`);
      this.presenceChannel = this.supabaseClient.channel(presenceChannelName, {
        config: {
          presence: { key: this.localUserId },
        },
      });

      this.presenceChannel.on('presence', { event: 'sync' }, () => {
        console.log(`[WebRTCManager] Presence Event: Sync received for room ${roomId}. Processing state.`);
        const presenceState = this.presenceChannel?.state;
        if (presenceState) {
          Object.keys(presenceState).forEach(userId => {
            if (userId !== this.localUserId) {
              const presences = (presenceState as any)[userId] as Array<{ user_name?: string }>;
              const userName = presences[0]?.user_name;
              console.log(`[WebRTCManager] Presence Sync: Found user ${userId} (${userName}) in room. Attempting to create/verify peer connection.`);
              this.createPeerConnection(userId, userName || `User ${userId}`, true);
            }
          });
        } else {
          console.log(`[WebRTCManager] Presence Sync: No presence state available for room ${roomId}.`);
        }
      });

      this.presenceChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== this.localUserId) {
          // @ts-ignore
          const userName = newPresences[0]?.user_name;
          console.log(`[WebRTCManager] Presence Event: User ${key} (${userName}) joined room ${roomId}. Creating peer connection.`);
          this.createPeerConnection(key, userName || `User ${key}`, true);
          this.onParticipantJoined?.(key, userName);
        }
      });

      this.presenceChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (key !== this.localUserId) {
          // @ts-ignore
          const userName = leftPresences[0]?.user_name;
          console.log(`[WebRTCManager] Presence Event: User ${key} left room ${roomId}. Closing peer connection.`);
          this.closePeerConnection(key);
          this.onParticipantLeft?.(key);
        }
      });

      this.presenceChannel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[WebRTCManager] joinRoom: Successfully subscribed to presence channel ${presenceChannelName} for room ${roomId}.`);
          console.log(`[WebRTCManager] joinRoom: Tracking presence for localUser: ${this.localUserId} (${this.localUserName}) in room ${roomId}.`);
          const trackStatus = await this.presenceChannel?.track({
            user_name: this.localUserName,
          });
          if (trackStatus === 'ok') {
            console.log(`[WebRTCManager] joinRoom: Presence tracked successfully for ${this.localUserId}.`);
          } else {
            console.error(`[WebRTCManager] joinRoom: Failed to track presence for ${this.localUserId}. Status: ${trackStatus}`);
            this.onError?.('presence_track_error', trackStatus);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[WebRTCManager] joinRoom: Presence channel (${presenceChannelName}) subscription error for room ${roomId}:`, err);
            this.onError?.('presence_subscribe_error', err);
        } else {
            console.log(`[WebRTCManager] joinRoom: Presence channel (${presenceChannelName}) status for room ${roomId}: ${status}`);
        }
      });
      console.log(`[WebRTCManager] joinRoom: Successfully completed setup for room ${roomId}.`);

    } catch (error) {
      console.error(`[WebRTCManager] joinRoom: Critical error during joinRoom for ${roomId}:`, error);
      this.onError?.('join_room_error', error);
      this.currentRoomId = null;
      console.log(`[WebRTCManager] joinRoom: Cleared currentRoomId due to critical error. Attempting cleanup.`);
      await this.leaveRoom();
    }
  }

  private handleSignalingMessage(message: any): void {
    const fromUserId = message.sender_id; 
    const data = message.payload;
    const messageType = message.message_type;

    if (!fromUserId || !data) {
      console.warn('Received incomplete signaling message:', message);
      return;
    }

    console.log(`[WebRTCManager] handleSignalingMessage: Received message type '${messageType}' from ${fromUserId}. Payload:`, data);

    switch (messageType) {
      case 'sdp-offer':
        if (data.sdp) {
          console.log(`[WebRTCManager] handleSignalingMessage: Handling sdp-offer from ${fromUserId}.`);
          this.handleSdpOffer(fromUserId, data.sdp);
        } else {
          console.warn('[WebRTCManager] handleSignalingMessage: Malformed sdp-offer message:', message);
        }
        break;
      case 'sdp-answer':
        if (data.sdp) {
          console.log(`[WebRTCManager] handleSignalingMessage: Handling sdp-answer from ${fromUserId}.`);
          this.handleSdpAnswer(fromUserId, data.sdp);
        } else {
          console.warn('[WebRTCManager] handleSignalingMessage: Malformed sdp-answer message:', message);
        }
        break;
      case 'ice-candidate':
        if (data.candidate) {
          console.log(`[WebRTCManager] handleSignalingMessage: Handling ice-candidate from ${fromUserId}.`);
          this.handleIceCandidate(fromUserId, data.candidate);
        } else {
          console.warn('[WebRTCManager] handleSignalingMessage: Malformed ice-candidate message:', message);
        }
        break;
      case 'participant-mute-status':
        if (data.userId && typeof data.isMuted === 'boolean') {
          console.log(`[WebRTCManager] handleSignalingMessage: Handling participant-mute-status for ${data.userId}, isMuted: ${data.isMuted}.`);
          this.onParticipantMuteChanged?.(data.userId, data.isMuted);
        } else {
          console.warn('[WebRTCManager] handleSignalingMessage: Malformed participant-mute-status message:', message);
        }
        break;
      default:
        console.warn(`[WebRTCManager] handleSignalingMessage: Unknown signaling message type: ${messageType}`, message);
    }
  }

  private createPeerConnection(remoteUserId: string, remoteUserName: string | undefined, isInitiator: boolean): RTCPeerConnection | undefined {
    console.log(`[WebRTCManager] createPeerConnection: Called for remoteUserId: ${remoteUserId}, remoteUserName: ${remoteUserName}, isInitiator: ${isInitiator}`);
    if (this.peerConnections.has(remoteUserId)) {
      console.warn(`[WebRTCManager] createPeerConnection: Peer connection already exists for ${remoteUserId}. Returning existing one.`);
      return this.peerConnections.get(remoteUserId);
    }
    if (!this.localStream) {
      console.error('[WebRTCManager] createPeerConnection: Local stream is not available. Cannot create peer connection.');
      this.onError?.('media_error', new Error('Local stream not available for peer connection.'));
      return undefined;
    }

    console.log(`[WebRTCManager] createPeerConnection: Creating new RTCPeerConnection for ${remoteUserId}.`);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    console.log(`[WebRTCManager] createPeerConnection: RTCPeerConnection created for ${remoteUserId} with ICE servers:`, this.iceServers);

    console.log(`[WebRTCManager] createPeerConnection: Adding local stream tracks to PC for ${remoteUserId}.`);
    this.localStream.getTracks().forEach(track => {
      try {
        pc.addTrack(track, this.localStream!);
        console.log(`[WebRTCManager] createPeerConnection: Added track ${track.id} to PC for ${remoteUserId}.`);
      } catch (e) {
        console.error(`[WebRTCManager] createPeerConnection: Error adding track ${track.id} for ${remoteUserId}:`, e);
      }
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTCManager] createPeerConnection: ICE candidate generated for ${remoteUserId}. Sending...`);
        if (this.currentRoomId) {
            this.sendSignalingMessage(remoteUserId, 'ice-candidate', { candidate: event.candidate.toJSON() });
        } else {
            console.warn(`[WebRTCManager] createPeerConnection: ICE candidate for ${remoteUserId} not sent, not in a room.`);
        }
      } else {
        console.log(`[WebRTCManager] createPeerConnection: All ICE candidates have been sent for ${remoteUserId}.`);
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTCManager] createPeerConnection: Remote track received from ${remoteUserId}. Track:`, event.track, 'Streams:', event.streams);
      this.onRemoteTrackAdded?.(remoteUserId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      const newState = pc.connectionState;
      console.log(`[WebRTCManager] createPeerConnection: RTCPeerConnection state for ${remoteUserId} changed to: ${newState}`);
      this.onConnectionStateChanged?.(remoteUserId, newState);
      switch (newState) {
        case 'failed':
          console.error(`[WebRTCManager] createPeerConnection: Peer connection for ${remoteUserId} failed.`);
          break;
        case 'disconnected':
          console.warn(`[WebRTCManager] createPeerConnection: Peer connection for ${remoteUserId} disconnected.`);
          break;
        case 'closed':
          console.log(`[WebRTCManager] createPeerConnection: Peer connection for ${remoteUserId} closed.`);
          break;
        case 'connected':
           console.log(`[WebRTCManager] createPeerConnection: Peer connection with ${remoteUserId} successfully established.`);
          break;
        default:
          console.log(`[WebRTCManager] createPeerConnection: Peer connection state for ${remoteUserId} is now ${newState}.`);
      }
    };
    
    pc.oniceconnectionstatechange = () => {
        const newIceState = pc.iceConnectionState;
        console.log(`[WebRTCManager] createPeerConnection: ICE connection state for ${remoteUserId} changed to: ${newIceState}`);
        if (newIceState === 'failed') {
            console.error(`[WebRTCManager] createPeerConnection: ICE connection for ${remoteUserId} failed.`);
            this.onError?.('webrtc_ice_error', { userId: remoteUserId, error: new Error('ICE connection failed') });
        }
    };

    this.peerConnections.set(remoteUserId, pc);
    console.log(`[WebRTCManager] createPeerConnection: Stored new peer connection for ${remoteUserId}. Total PCs: ${this.peerConnections.size}`);

    if (isInitiator) {
      console.log(`[WebRTCManager] createPeerConnection: ${this.localUserId} is initiator for ${remoteUserId}. Creating SDP offer.`);
      pc.createOffer()
        .then(offer => {
          console.log(`[WebRTCManager] createPeerConnection: SDP offer created for ${remoteUserId}. Setting local description.`);
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          if (pc.localDescription && this.currentRoomId) {
            console.log(`[WebRTCManager] createPeerConnection: Local description set for ${remoteUserId}. Sending sdp-offer.`);
            this.sendSignalingMessage(remoteUserId, 'sdp-offer', { sdp: pc.localDescription.toJSON() });
          } else {
             console.warn(`[WebRTCManager] createPeerConnection: Local description not available or not in a room after offer for ${remoteUserId}. Cannot send sdp-offer.`);
          }
        })
        .catch(error => {
          console.error(`[WebRTCManager] createPeerConnection: Error creating offer for ${remoteUserId}:`, error);
          this.onError?.('webrtc_offer_error', { userId: remoteUserId, error });
        });
    }

    console.log(`[WebRTCManager] createPeerConnection: Finished setup for ${remoteUserId}.`);
    return pc;
  }

  private closePeerConnection(remoteUserId: string): void {
    console.log(`[WebRTCManager] closePeerConnection: Attempting to close peer connection for remoteUserId: ${remoteUserId}`);
    const pc = this.peerConnections.get(remoteUserId);
    if (pc) {
      console.log(`[WebRTCManager] closePeerConnection: Found PC for ${remoteUserId}. Stopping tracks and closing.`);
      pc.getSenders().forEach(sender => {
        if (sender.track) {
          console.log(`[WebRTCManager] closePeerConnection: Stopping track ${sender.track.id} for ${remoteUserId}.`);
          sender.track.stop();
        }
      });
      pc.close();
      this.peerConnections.delete(remoteUserId);
      console.log(`[WebRTCManager] closePeerConnection: Deleted PC for ${remoteUserId} from map. Total PCs: ${this.peerConnections.size}`);
      this.onRemoteTrackRemoved?.(remoteUserId);
      console.log(`[WebRTCManager] closePeerConnection: Successfully closed and cleaned up PC for ${remoteUserId}.`);
    } else {
      console.warn(`[WebRTCManager] closePeerConnection: No peer connection found for ${remoteUserId} to close.`);
    }
  }
  
  public async sendSignalingMessage(
    toUserId: string | null,
    messageType: string,
    payloadData: any
  ): Promise<void> {
    if (!this.currentRoomId) {
      console.error('[WebRTCManager] sendSignalingMessage: Cannot send message, not in a room.');
      this.onError?.('send_message_error', new Error('Not in a room'));
      return;
    }

    const messageObject = {
      room_id: this.currentRoomId,
      sender_id: this.localUserId,
      to_user_id: toUserId,
      message_type: messageType,
      payload: payloadData,
    };

    const logPayload = (messageType === 'sdp-offer' || messageType === 'sdp-answer' || messageType === 'ice-candidate')
        ? `{ type: '${messageType}', target: '${toUserId}' } (payload data omitted for brevity)`
        : payloadData;
    console.log(`[WebRTCManager] sendSignalingMessage: Sending type '${messageType}' to ${toUserId || 'all in room ' + this.currentRoomId}. Payload (abbreviated for SDP/ICE):`, logPayload);

    const { error } = await this.supabaseClient
      .from('realtime_transient_messages')
      .insert([messageObject]);

    if (error) {
      console.error(`[WebRTCManager] sendSignalingMessage: Error sending message type '${messageType}' to ${toUserId}:`, error);
      this.onError?.('send_message_error', error);
    } else {
      console.log(`[WebRTCManager] sendSignalingMessage: Message type '${messageType}' to ${toUserId} sent successfully.`);
    }
  }

  private async handleSdpOffer(fromUserId: string, offerSdp: RTCSessionDescriptionInit): Promise<void> {
    console.log(`[WebRTCManager] handleSdpOffer: Received SDP offer from ${fromUserId}.`);
    let pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      console.log(`[WebRTCManager] handleSdpOffer: No existing peer connection for ${fromUserId} on offer, creating one (as non-initiator).`);
      pc = this.createPeerConnection(fromUserId, undefined, false);
    }

    if (!pc) {
        console.error(`[WebRTCManager] handleSdpOffer: Failed to get/create peer connection for ${fromUserId}. Cannot process offer.`);
        this.onError?.('webrtc_offer_error', { userId: fromUserId, error: new Error('PeerConnection not available for offer') });
        return;
    }

    try {
      console.log(`[WebRTCManager] handleSdpOffer: Setting remote description for ${fromUserId} with received offer.`);
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      console.log(`[WebRTCManager] handleSdpOffer: Remote description set for ${fromUserId}. Creating answer.`);
      const answer = await pc.createAnswer();
      console.log(`[WebRTCManager] handleSdpOffer: SDP answer created for ${fromUserId}. Setting local description.`);
      await pc.setLocalDescription(answer);
      if (pc.localDescription && this.currentRoomId) {
        console.log(`[WebRTCManager] handleSdpOffer: Local description set for ${fromUserId}. Sending sdp-answer.`);
        this.sendSignalingMessage(fromUserId, 'sdp-answer', { sdp: pc.localDescription.toJSON() });
      } else {
        console.warn(`[WebRTCManager] handleSdpOffer: Local description not available or not in a room after answer for ${fromUserId}. Cannot send sdp-answer.`);
      }
    } catch (error) {
      console.error(`[WebRTCManager] handleSdpOffer: Error processing SDP offer from ${fromUserId}:`, error);
      this.onError?.('webrtc_offer_error', { userId: fromUserId, error });
    }
  }

  private async handleSdpAnswer(fromUserId: string, answerSdp: RTCSessionDescriptionInit): Promise<void> {
    console.log(`[WebRTCManager] handleSdpAnswer: Received SDP answer from ${fromUserId}.`);
    const pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      console.error(`[WebRTCManager] handleSdpAnswer: No peer connection found for ${fromUserId}. Cannot process answer.`);
      this.onError?.('webrtc_answer_error', { userId: fromUserId, error: new Error('PeerConnection not found for answer') });
      return;
    }

    try {
      console.log(`[WebRTCManager] handleSdpAnswer: Setting remote description for ${fromUserId} with received answer.`);
      await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
      console.log(`[WebRTCManager] handleSdpAnswer: Remote description successfully set for ${fromUserId} after answer.`);
    } catch (error) {
      console.error(`[WebRTCManager] handleSdpAnswer: Error processing SDP answer from ${fromUserId}:`, error);
      this.onError?.('webrtc_answer_error', { userId: fromUserId, error });
    }
  }

  private async handleIceCandidate(fromUserId: string, candidateInfo: RTCIceCandidateInit): Promise<void> {
    console.log(`[WebRTCManager] handleIceCandidate: Received ICE candidate from ${fromUserId}.`);
    const pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      console.error(`[WebRTCManager] handleIceCandidate: No peer connection found for ${fromUserId}. Cannot add ICE candidate.`);
      this.onError?.('webrtc_ice_error', { userId: fromUserId, error: new Error('PeerConnection not found for ICE candidate') });
      return;
    }
    
    if (!candidateInfo) {
        console.warn(`[WebRTCManager] handleIceCandidate: Received null or undefined ICE candidate from ${fromUserId}. Ignoring.`);
        return;
    }

    try {
      console.log(`[WebRTCManager] handleIceCandidate: Adding ICE candidate for ${fromUserId}. Candidate:`, candidateInfo);
      await pc.addIceCandidate(new RTCIceCandidate(candidateInfo));
      console.log(`[WebRTCManager] handleIceCandidate: Successfully added ICE candidate for ${fromUserId}.`);
    } catch (error) {
      if (error instanceof DOMException && error.message.includes("remote description")) {
        console.warn(`[WebRTCManager] handleIceCandidate: Ignoring addIceCandidate error (likely benign race condition due to candidate arriving before remote description set) for ${fromUserId}: ${error.message}`);
      } else {
        console.error(`[WebRTCManager] handleIceCandidate: Error adding ICE candidate from ${fromUserId}:`, error);
        this.onError?.('webrtc_ice_error', { userId: fromUserId, error });
      }
    }
  }

  public async leaveRoom(): Promise<void> {
    console.log(`[WebRTCManager] leaveRoom: Attempting to leave room: ${this.currentRoomId}, localUserId: ${this.localUserId}`);
    if (this.signalingChannel) {
      console.log(`[WebRTCManager] leaveRoom: Unsubscribing from signaling channel: ${this.signalingChannel.topic}`);
      await this.signalingChannel.unsubscribe();
      console.log(`[WebRTCManager] leaveRoom: Unsubscribed from signaling channel. Setting to null.`);
      this.signalingChannel = null;
    } else {
      console.log('[WebRTCManager] leaveRoom: No signaling channel to unsubscribe from.');
    }
    if (this.presenceChannel) {
      console.log(`[WebRTCManager] leaveRoom: Untracking presence from channel: ${this.presenceChannel.topic}`);
      await this.presenceChannel.untrack();
      console.log(`[WebRTCManager] leaveRoom: Unsubscribing from presence channel: ${this.presenceChannel.topic}`);
      await this.presenceChannel.unsubscribe();
      console.log(`[WebRTCManager] leaveRoom: Unsubscribed from presence channel. Setting to null.`);
      this.presenceChannel = null;
    } else {
        console.log('[WebRTCManager] leaveRoom: No presence channel to untrack/unsubscribe from.');
    }
    
    console.log(`[WebRTCManager] leaveRoom: Closing all peer connections. Current count: ${this.peerConnections.size}`);
    this.peerConnections.forEach((pc, userId) => {
      console.log(`[WebRTCManager] leaveRoom: Closing peer connection for userId: ${userId}`);
      this.closePeerConnection(userId);
    });
    this.peerConnections.clear(); 
    console.log(`[WebRTCManager] leaveRoom: All peer connections closed and map cleared.`);

    if (this.localStream) {
      console.log('[WebRTCManager] leaveRoom: Releasing local media stream.');
      AudioManager.getInstance().releaseMediaStream();
      this.localStream = null;
      console.log('[WebRTCManager] leaveRoom: Local media stream released and set to null.');
    } else {
      console.log('[WebRTCManager] leaveRoom: No local media stream to release.');
    }
    
    const prevRoomId = this.currentRoomId;
    this.currentRoomId = null;
    console.log(`[WebRTCManager] leaveRoom: Room ${prevRoomId} left and resources cleaned up. currentRoomId is now null.`);
  }

  public async toggleMute(): Promise<boolean | undefined> {
    if (!this.localStream) {
      console.warn('No local stream to toggle mute state.');
      return undefined;
    }

    let newMuteState: boolean | undefined;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
      newMuteState = !track.enabled;
      console.log(`[WebRTCManager] toggleMute: Audio track ${track.id} (${track.label}) ${track.enabled ? 'unmuted' : 'muted'}. New mute state: ${newMuteState}`);
    });

    if (typeof newMuteState === 'boolean' && this.currentRoomId) {
      await this.sendSignalingMessage(null, 'participant-mute-status', {
        userId: this.localUserId,
        isMuted: newMuteState,
      });
      this.onParticipantMuteChanged?.(this.localUserId, newMuteState);
    }
    return newMuteState;
  }

  public getLocalMuteState(): boolean | undefined {
    if (!this.localStream || this.localStream.getAudioTracks().length === 0) {
      return undefined;
    }
    return !this.localStream.getAudioTracks()[0].enabled;
  }

  public async setAudioOutputDevice(deviceId: string): Promise<void> {
    try {
      await AudioManager.getInstance().setAudioOutputDevice(deviceId);
      console.log(`[WebRTCManager] setAudioOutputDevice: Audio output device successfully set to ${deviceId} via AudioManager.`);
    } catch (error) {
      console.error('[WebRTCManager] setAudioOutputDevice: Error setting audio output device:', error);
      this.onError?.('media_error', { context: 'setAudioOutputDevice', error });
    }
  }
}
