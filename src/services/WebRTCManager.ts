import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { AudioManager } from './AudioManager'; // Assuming AudioManager.ts exists in the same directory or path is adjusted

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
    iceServers: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }], // Default STUN server
    callbacks?: WebRTCManagerCallbacks
  ) {
    this.supabaseClient = supabaseClient;
    this.localUserId = userId;
    this.localUserName = userName;
    this.iceServers = iceServers;

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

    // Ensure AudioManager instance is available if needed for early operations, though typically used in joinRoom
    AudioManager.getInstance(); 
  }

  public async joinRoom(roomId: string): Promise<void> {
    if (this.currentRoomId) {
      if (this.currentRoomId === roomId) {
        console.warn(`Already in room ${roomId}`);
        return;
      }
      await this.leaveRoom();
    }

    this.currentRoomId = roomId;
    console.log(`Attempting to join room: ${roomId} as user ${this.localUserId}`);

    try {
      // 1. Authorize user for the room
      const { data: authResponse, error: authError } = await this.supabaseClient.functions.invoke('custom-webrtc-signaling', {
        body: { roomId },
      });

      if (authError || !authResponse || !authResponse.authorized) {
        console.error('Authorization failed for room:', roomId, authError || authResponse?.error);
        this.onError?.('authorization', authError || new Error(authResponse?.error || 'Unknown authorization error'));
        this.currentRoomId = null;
        return;
      }

      console.log(`Successfully authorized for room ${roomId}`);

      // 2. Initialize peer connections map
      this.peerConnections = new Map();

      // 3. Set up local audio stream
      try {
        this.localStream = await AudioManager.getInstance().getUserMedia();
        if (this.localStream) {
          this.onLocalStreamReady?.(this.localStream);
          console.log('Local audio stream acquired');
        } else {
          throw new Error('Failed to acquire local audio stream: getUserMedia returned null.');
        }
      } catch (error) {
        console.error('Error acquiring local audio stream:', error);
        this.onError?.('media_error', error);
        this.currentRoomId = null;
        return;
      }
      
      // 4. Subscribe to signaling messages (Postgres changes on realtime_transient_messages)
      // Assuming realtime_transient_messages has columns: room_id, sender_id, to_user_id, message_type, payload
      // `payload` is the JSONB column containing actual data like SDP, ICE, etc.
      // `sender_id` is the originator user_id.
      // `to_user_id` is for targeted messages, NULL for broadcast.
      const signalingChannelName = `realtime_transient_messages_room_${roomId}`; // Custom name for clarity
      this.signalingChannel = this.supabaseClient.channel(signalingChannelName, {
        config: {
          broadcast: { self: false }, // Don't receive our own messages through this
          presence: { key: this.localUserId }, // Optional, can help debug presence on this channel
        },
      });

      this.signalingChannel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'realtime_transient_messages',
            // Filter for messages in this room, targeted to current user OR broadcast (to_user_id is NULL)
            // AND not sent by the current user (sender_id !== this.localUserId)
            filter: `room_id=eq.${roomId}`,
          },
          (payload: any) => { // Type properly, Supabase types should provide RealtimePostgresChangesPayload
            // Additional client-side filtering because filter string might not support all conditions perfectly (e.g. OR with sender_id)
            if (payload.new.sender_id === this.localUserId) return; // Ignore messages sent by self
            if (payload.new.to_user_id === null || payload.new.to_user_id === this.localUserId) {
                 this.handleSignalingMessage(payload.new);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to signaling channel for room ${roomId}`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`Signaling channel subscription error for room ${roomId}:`, err);
            this.onError?.('signaling_subscribe_error', err);
          }
        });

      // 5. Subscribe to presence channel
      const presenceChannelName = `presence:voice_room:${roomId}`;
      this.presenceChannel = this.supabaseClient.channel(presenceChannelName, {
        config: {
          presence: { key: this.localUserId }, // Track this user's presence
        },
      });

      this.presenceChannel.on('presence', { event: 'sync' }, () => {
        console.log(`Presence sync for room ${roomId}`);
        const presenceState = this.presenceChannel?.state;
        if (presenceState) {
          for (const userId in presenceState) {
            if (userId !== this.localUserId) {
              // @ts-ignore TODO: state structure might need casting
              const presences = presenceState[userId] as Array<{ user_name?: string }>;
              const userName = presences[0]?.user_name;
              this.createPeerConnection(userId, userName || `User ${userId}`, true); // Assume new users are initiators for simplicity here
            }
          }
        }
      });

      this.presenceChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== this.localUserId) {
          console.log(`User ${key} joined room ${roomId}`);
          // @ts-ignore
          const userName = newPresences[0]?.user_name;
          this.createPeerConnection(key, userName || `User ${key}`, true);
          this.onParticipantJoined?.(key, userName);
        }
      });

      this.presenceChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (key !== this.localUserId) {
          console.log(`User ${key} left room ${roomId}`);
          this.closePeerConnection(key);
          // @ts-ignore
          const userName = leftPresences[0]?.user_name;
          this.onParticipantLeft?.(key);
        }
      });

      this.presenceChannel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to presence channel for room ${roomId}`);
          // Announce presence
          const trackStatus = await this.presenceChannel?.track({
            user_name: this.localUserName,
            // online_at: new Date().toISOString(), // Example custom presence data
          });
          if (trackStatus !== 'ok') {
            console.error('Failed to track presence:', trackStatus);
            this.onError?.('presence_track_error', trackStatus);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`Presence channel subscription error for room ${roomId}:`, err);
            this.onError?.('presence_subscribe_error', err);
        }
      });

    } catch (error) {
      console.error('Error joining room:', error);
      this.onError?.('join_room_error', error);
      this.currentRoomId = null; // Reset room ID if join fails critically
      await this.leaveRoom(); // Attempt cleanup
    }
  }

  // Placeholder for handleSignalingMessage, createPeerConnection, closePeerConnection, sendSignalingMessage, leaveRoom etc.
  // These will be implemented in subsequent steps.

  private handleSignalingMessage(message: /* RealtimePostgresChangesPayload<any>['new'] */ any): void {
    // message is the 'new' record from realtime_transient_messages
    const fromUserId = message.sender_id; 
    const data = message.payload; // This is the JSONB column, should contain our signaling data (type, sdp, candidate)
    const messageType = message.message_type; // The 'type' field like 'sdp-offer', 'participant-mute-status'

    if (!fromUserId || !data) {
      console.warn('Received incomplete signaling message:', message);
      return;
    }
    
    // The actual signaling payload (like SDP offer/answer or ICE candidate) is inside `data`
    // The `message_type` column itself might be redundant if `data.type` also exists,
    // but using it as the primary switch key as per subtask.
    // Let's assume `data` directly contains sdp/candidate or other relevant fields based on `message_type`.

    console.log(`Handling signaling message type '${messageType}' from ${fromUserId}:`, data);

    switch (messageType) { // Using message.message_type as the switch key
      case 'sdp-offer':
        // data is expected to be { sdp: RTCSessionDescriptionInit }
        if (data.sdp) {
          this.handleSdpOffer(fromUserId, data.sdp);
        } else {
          console.warn('Malformed sdp-offer message:', message);
        }
        break;
      case 'sdp-answer':
        // data is expected to be { sdp: RTCSessionDescriptionInit }
        if (data.sdp) {
          this.handleSdpAnswer(fromUserId, data.sdp);
        } else {
          console.warn('Malformed sdp-answer message:', message);
        }
        break;
      case 'ice-candidate':
        // data is expected to be { candidate: RTCIceCandidateInit }
        if (data.candidate) {
          this.handleIceCandidate(fromUserId, data.candidate);
        } else {
          console.warn('Malformed ice-candidate message:', message);
        }
        break;
      case 'participant-mute-status':
        // data is expected to be { userId: string, isMuted: boolean }
        // Note: `message.from_user_id` should be the same as `data.userId` for this message type.
        if (data.userId && typeof data.isMuted === 'boolean') {
          this.onParticipantMuteChanged?.(data.userId, data.isMuted);
        } else {
          console.warn('Malformed participant-mute-status message:', message);
        }
        break;
      default:
        console.warn(`Unknown signaling message type: ${messageType}`, message);
    }
  }

  private createPeerConnection(remoteUserId: string, remoteUserName: string | undefined, isInitiator: boolean): RTCPeerConnection | null {
    if (this.peerConnections.has(remoteUserId)) {
      console.warn(`Peer connection already exists for ${remoteUserId}`);
      return this.peerConnections.get(remoteUserId) || null;
    }
    if (!this.localStream) {
      console.error('Local stream is not available. Cannot create peer connection.');
      this.onError?.('media_error', new Error('Local stream not available for peer connection.'));
      return null;
    }

    console.log(`Creating new peer connection for ${remoteUserId}, initiator: ${isInitiator}, username: ${remoteUserName}`);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    // Add local stream tracks
    this.localStream.getTracks().forEach(track => {
      try {
        pc.addTrack(track, this.localStream!);
      } catch (e) {
        console.error(`Error adding track for ${remoteUserId}:`, e);
      }
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId) {
        this.sendSignalingMessage(remoteUserId, 'ice-candidate', { candidate: event.candidate.toJSON() });
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log(`Remote track received from ${remoteUserId}:`, event.track, event.streams);
      this.onRemoteTrackAdded?.(remoteUserId, event.streams[0]);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Peer connection state for ${remoteUserId}: ${pc.connectionState}`);
      this.onConnectionStateChanged?.(remoteUserId, pc.connectionState);
      switch (pc.connectionState) {
        case 'failed':
        case 'disconnected':
        case 'closed':
          // this.closePeerConnection(remoteUserId); // Let presence dictate complete closure, or handle reconnect logic
          break;
        case 'connected':
           console.log(`Peer connection with ${remoteUserId} established.`);
          break;
      }
    };
    
    pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state for ${remoteUserId}: ${pc.iceConnectionState}`);
    };

    this.peerConnections.set(remoteUserId, pc);

    if (isInitiator) {
      pc.createOffer()
        .then(offer => {
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          if (pc.localDescription && this.currentRoomId) {
            this.sendSignalingMessage(remoteUserId, 'sdp-offer', { sdp: pc.localDescription.toJSON() });
          }
        })
        .catch(error => {
          console.error(`Error creating offer for ${remoteUserId}:`, error);
          this.onError?.('webrtc_offer_error', { userId: remoteUserId, error });
        });
    }

    // Notify about participant joining, even before connection is fully established
    // This is triggered by presence, actual media flow will be later.
    // this.onParticipantJoined?.(remoteUserId, remoteUserName); // Already called in presence join event

    return pc;
  }

  private closePeerConnection(remoteUserId: string): void {
    const pc = this.peerConnections.get(remoteUserId);
    if (pc) {
      console.log(`Closing peer connection for ${remoteUserId}`);
      pc.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop(); // Stop tracks associated with this sender
        }
      });
      pc.close(); // This will trigger onconnectionstatechange to 'closed'
      this.peerConnections.delete(remoteUserId);
      this.onRemoteTrackRemoved?.(remoteUserId); // Notify UI to remove video/audio elements
      // this.onParticipantLeft?.(remoteUserId); // Already called in presence leave event
    } else {
      console.warn(`No peer connection found for ${remoteUserId} to close.`);
    }
  }
  
  public async sendSignalingMessage(
    toUserId: string | null, // null for broadcast (e.g. mute status)
    messageType: string, // e.g. 'sdp-offer', 'ice-candidate', 'participant-mute-status'
    payloadData: any    // The actual data like { sdp: ... } or { candidate: ... } or { userId: ..., isMuted: ... }
  ): Promise<void> {
    if (!this.currentRoomId) {
      console.error('Cannot send signaling message, not in a room.');
      this.onError?.('send_message_error', new Error('Not in a room'));
      return;
    }

    const messageObject = {
      room_id: this.currentRoomId,
      sender_id: this.localUserId, // from_user_id
      to_user_id: toUserId,        // null for broadcast
      message_type: messageType,   // Custom type field for the switch in handleSignalingMessage
      payload: payloadData,        // The JSONB payload (sdp, ice, mute status etc.)
    };

    console.log(`Sending signaling message of type '${messageType}' to ${toUserId || 'all in room ' + this.currentRoomId}:`, payloadData);

    const { error } = await this.supabaseClient
      .from('realtime_transient_messages')
      .insert([messageObject]);

    if (error) {
      console.error('Error sending signaling message:', error);
      this.onError?.('send_message_error', error);
    }
  }

  // Placeholder for SDP/ICE handling methods
  private async handleSdpOffer(fromUserId: string, offerSdp: RTCSessionDescriptionInit): Promise<void> {
    console.log(`Handling SDP offer from ${fromUserId}`, offerSdp);
    let pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      console.log(`No existing peer connection for ${fromUserId} on offer, creating one.`);
      // TODO: Need to get remoteUserName if creating PC here. For now, it might be undefined.
      // This scenario (offer before presence) should be handled gracefully.
      // Presence usually calls createPeerConnection first. If offer comes first, it means remote initiated.
      pc = this.createPeerConnection(fromUserId, undefined /* userName might be unknown here */, false); // Not initiator
    }

    if (!pc) {
        console.error(`Failed to get/create peer connection for ${fromUserId} to handle offer.`);
        this.onError?.('webrtc_offer_error', { userId: fromUserId, error: new Error('PeerConnection not available') });
        return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (pc.localDescription && this.currentRoomId) {
        this.sendSignalingMessage(fromUserId, 'sdp-answer', { sdp: pc.localDescription.toJSON() });
      }
    } catch (error) {
      console.error(`Error handling SDP offer from ${fromUserId}:`, error);
      this.onError?.('webrtc_offer_error', { userId: fromUserId, error });
    }
  }

  private async handleSdpAnswer(fromUserId: string, answerSdp: RTCSessionDescriptionInit): Promise<void> {
    console.log(`Handling SDP answer from ${fromUserId}`, answerSdp);
    const pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      console.error(`No peer connection found for ${fromUserId} to handle answer.`);
      this.onError?.('webrtc_answer_error', { userId: fromUserId, error: new Error('PeerConnection not found') });
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
       console.log(`Remote description set for ${fromUserId} after answer.`);
    } catch (error) {
      console.error(`Error handling SDP answer from ${fromUserId}:`, error);
      this.onError?.('webrtc_answer_error', { userId: fromUserId, error });
    }
  }

  private async handleIceCandidate(fromUserId: string, candidateInfo: RTCIceCandidateInit): Promise<void> {
    console.log(`Handling ICE candidate from ${fromUserId}`, candidateInfo);
    const pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      console.error(`No peer connection found for ${fromUserId} to add ICE candidate.`);
      this.onError?.('webrtc_ice_error', { userId: fromUserId, error: new Error('PeerConnection not found') });
      return;
    }
    
    if (!candidateInfo) {
        console.warn(`Received null or undefined ICE candidate from ${fromUserId}`);
        return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidateInfo));
    } catch (error) {
      // Ignore benign "Error: Cannot add ICE candidate before remote description"
      // This can happen due to race conditions where candidates arrive before SDP answer is fully processed.
      // WebRTC is designed to handle this by queueing candidates.
      if (error instanceof DOMException && error.message.includes("remote description")) {
        console.warn(`Ignoring addIceCandidate error (likely benign race condition) for ${fromUserId}: ${error.message}`);
      } else {
        console.error(`Error adding ICE candidate from ${fromUserId}:`, error);
        this.onError?.('webrtc_ice_error', { userId: fromUserId, error });
      }
    }
  }


  public async leaveRoom(): Promise<void> {
    console.log(`Leaving room ${this.currentRoomId}`);
    if (this.signalingChannel) {
      await this.signalingChannel.unsubscribe();
      this.signalingChannel = null;
    }
    if (this.presenceChannel) {
      await this.presenceChannel.untrack(); // Stop tracking presence for this user
      await this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }
    
    // Close all peer connections
    this.peerConnections.forEach((pc, userId) => {
      this.closePeerConnection(userId); // Use the existing method that also cleans up tracks and map entries
    });
    // Ensure the map is clear after all connections are closed
    this.peerConnections.clear(); 

    if (this.localStream) {
      AudioManager.getInstance().releaseMediaStream(this.localStream);
      this.localStream = null;
      console.log('Local media stream released.');
    }
    
    this.currentRoomId = null;
    console.log('Room left and resources cleaned up.');
  }

  public async toggleMute(): Promise<boolean | undefined> {
    if (!this.localStream) {
      console.warn('No local stream to toggle mute state.');
      return undefined;
    }

    let newMuteState: boolean | undefined;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
      newMuteState = !track.enabled; // isMuted is true if track.enabled is false
      console.log(`Audio track ${track.id} ${track.enabled ? 'unmuted' : 'muted'}.`);
    });

    if (typeof newMuteState === 'boolean' && this.currentRoomId) {
      // Send mute status to other participants
      // `toUserId: null` indicates a broadcast message for this room.
      // RLS policy on `realtime_transient_messages` needs to allow inserts where `to_user_id` IS NULL
      // for authorized senders (auth.uid() in room).
      await this.sendSignalingMessage(null, 'participant-mute-status', {
        userId: this.localUserId,
        isMuted: newMuteState,
      });
      this.onParticipantMuteChanged?.(this.localUserId, newMuteState);
    }
    return newMuteSate;
  }

  public getLocalMuteState(): boolean | undefined {
    if (!this.localStream || this.localStream.getAudioTracks().length === 0) {
      return undefined;
    }
    return !this.localStream.getAudioTracks()[0].enabled;
  }

  public async setAudioOutputDevice(deviceId: string): Promise<void> {
    try {
      // This assumes AudioManager has a method to set the output device for all playing audio elements.
      // WebRTC RTCPeerConnection itself doesn't directly control output device per connection.
      // This is typically handled by attaching remote streams to <audio> elements and then
      // calling setSinkId() on those elements.
      await AudioManager.getInstance().setAudioOutputDevice(deviceId);
      console.log(`Audio output device set to ${deviceId}`);
    } catch (error) {
      console.error('Error setting audio output device:', error);
      this.onError?.('media_error', { context: 'setAudioOutputDevice', error });
    }
  }
}
