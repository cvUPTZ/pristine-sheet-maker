// Ensure 'livekit-client' is installed in your project:
// npm install livekit-client  OR  yarn add livekit-client OR bun install livekit-client

// src/services/LiveKitManager.ts
import {
  Room,
  RoomEvent,
  ParticipantEvent,
  RemoteParticipant,
  Track,
  TrackPublication,
  ConnectionState,
  LocalParticipant,
  RemoteTrack,
  RemoteTrackPublication,
} from 'livekit-client';
import { AudioManager } from '@/utils/audioManager';

export class LiveKitManager {
  private static instance: LiveKitManager;
  private room: Room | null = null;
  private localParticipant: LocalParticipant | null = null;
  private remoteParticipants: Map<string, RemoteParticipant> = new Map();

  private audioManager: AudioManager;
  private myUserId: string | null = null; // Store the current user's identity

  // Callbacks for UI updates
  public onRemoteStreamSubscribed: (peerId: string, stream: MediaStream) => void = () => {};
  public onRemoteStreamUnsubscribed: (peerId: string) => void = () => {};
  public onPeerStatusChanged: (peerId: string, status: string, participant?: RemoteParticipant) => void = () => {}; // connected, disconnected
  public onConnectionStateChanged: (state: ConnectionState, error?: Error) => void = () => {};
  public onTrackMuteChanged: (peerId: string, source: Track.Source, isMuted: boolean) => void = () => {};
  public onIsSpeakingChanged: (peerId: string, isSpeaking: boolean) => void = () => {};


  private constructor() {
    this.audioManager = AudioManager.getInstance();
  }

  public static getInstance(): LiveKitManager {
    if (!LiveKitManager.instance) {
      LiveKitManager.instance = new LiveKitManager();
    }
    return LiveKitManager.instance;
  }

  public initialize(userId: string) {
    this.myUserId = userId;
    console.log('[LiveKitManager] Initialized with userId:', userId);
  }

  public getRoom(): Room | null {
    return this.room;
  }

  public async joinRoom(livekitUrl: string, token: string, targetRoomId: string): Promise<void> {
    if (this.room && this.room.state !== ConnectionState.Disconnected) {
      console.warn('[LiveKitManager] Already connected or connecting to a room. Disconnect first.');
      await this.leaveRoom(); // Attempt to leave gracefully before rejoining
    }

    this.room = new Room({
      // adaptiveStream: true, // Enable adaptive streaming for better performance
      // dynacast: true, // Enable dynacast for better video quality (if video is used)
    });

    console.log(`[LiveKitManager] Attempting to join LiveKit room: ${targetRoomId} as ${this.myUserId}`);
    this.onConnectionStateChanged(this.room.state);

    this.room
      .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log('[LiveKitManager] Connection State Changed:', state);
        this.onConnectionStateChanged(state);
        if (state === ConnectionState.Connected) {
          this.localParticipant = this.room!.localParticipant;
          console.log('[LiveKitManager] Successfully connected to LiveKit room. Local participant:', this.localParticipant.identity);
          this.publishLocalAudio();
          // Handle existing participants
          this.room!.participants.forEach(participant => {
            this.handleParticipantConnected(participant);
          });
        } else if (state === ConnectionState.Disconnected) {
            console.log('[LiveKitManager] Disconnected from LiveKit room. Cleaning up.');
            this.cleanupRoom();
            this.onConnectionStateChanged(state, new Error("Disconnected from LiveKit room."));
        } else if (state === ConnectionState.Failed) {
            console.error('[LiveKitManager] Connection to LiveKit room failed.');
            this.cleanupRoom();
            this.onConnectionStateChanged(state, new Error("Connection to LiveKit room failed."));
        }
      })
      .on(RoomEvent.ParticipantConnected, this.handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected)
      .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
      // .on(RoomEvent.LocalTrackPublished, this.handleLocalTrackPublished) // For local feedback
      // .on(RoomEvent.LocalTrackUnpublished, this.handleLocalTrackUnpublished)
      .on(RoomEvent.MediaDevicesError, (error: Error) => {
        console.error('[LiveKitManager] Media devices error:', error);
        this.onConnectionStateChanged(ConnectionState.Failed, error); // Propagate as connection failure
      });
      // Add other event listeners as needed: ActiveSpeakerChanged, TrackMuted, TrackUnmuted etc.

    try {
      await this.room.connect(livekitUrl, token);
    } catch (error: any) {
      console.error('[LiveKitManager] Failed to connect to LiveKit room:', error);
      this.onConnectionStateChanged(ConnectionState.Failed, error);
      this.cleanupRoom(); // Ensure cleanup on connection failure
      throw error; // Re-throw for the caller to handle
    }
  }

  private publishLocalAudio = async () => {
    if (!this.room || this.room.state !== ConnectionState.Connected || !this.localParticipant) {
      console.warn('[LiveKitManager] Cannot publish audio, not connected or no local participant.');
      return;
    }

    if (!this.audioManager.isStreamActive() || !this.audioManager.getCurrentStream()) {
      console.warn('[LiveKitManager] AudioManager does not have an active stream to publish.');
      // Attempt to get it now - this implies user has already given permission or will be prompted by AudioManager
      try {
        if(!this.audioManager.getAudioContext() || this.audioManager.getAudioContext()?.state === 'closed'){
            // Pass an empty error handler or a more specific one if needed for this context
            await this.audioManager.initialize({onError: (e: Error) => console.error("[LiveKitManager] AudioManager init error during publish:", e) });
        }
        const stream = await this.audioManager.getUserMedia(); // This might re-ask for permission
        if (!stream) throw new Error("Failed to get stream from AudioManager");
      } catch(error){
        console.error('[LiveKitManager] Failed to get/initialize local audio stream for publishing:', error);
        this.onConnectionStateChanged(ConnectionState.Failed, new Error("Microphone access failed during publish."));
        return;
      }
    }

    const localStream = this.audioManager.getCurrentStream();
    if (localStream && localStream.getAudioTracks().length > 0) {
      const audioTrack = localStream.getAudioTracks()[0];
      try {
        // Check if already published
        let isPublished = false;
        this.localParticipant.audioTrackPublications.forEach(pub => {
            if (pub.track?.mediaStreamTrack === audioTrack) {
                isPublished = true;
            }
        });

        if (!isPublished) {
            console.log('[LiveKitManager] Publishing local audio track.');
            await this.localParticipant.publishTrack(audioTrack, {
              name: 'microphone', // Useful for debugging
              source: Track.Source.Microphone,
              // Additional options like dtx (Discontinuous Transmission) can be set here
              // dtx: true,
            });
        } else {
              console.log('[LiveKitManager] Local audio track already published.');
        }
      } catch (error) {
        console.error('[LiveKitManager] Error publishing local audio track:', error);
      }
    } else {
      console.warn('[LiveKitManager] No audio track found in local stream to publish.');
    }
  }

  public async setTrackEnabled(source: Track.Source, enabled: boolean) {
    if (!this.room || this.room.state !== ConnectionState.Connected || !this.localParticipant) {
        console.warn(`[LiveKitManager] Cannot set track enabled state for ${source}, not connected.`);
        return;
    }
    const publications = Array.from(this.localParticipant.tracks.values()).filter(pub => pub.source === source);
    if (publications.length === 0) {
        console.warn(`[LiveKitManager] No local track found for source ${source} to set enabled state.`);
        return;
    }
    publications.forEach(pub => {
        if (pub.track) {
              console.log(`[LiveKitManager] Setting track ${pub.trackSid} (${source}) enabled: ${enabled}`);
              pub.setEnabled(enabled);
        } else {
              console.warn(`[LiveKitManager] Track for source ${source} (SID: ${pub.trackSid}) not yet published, cannot set enabled state directly. Consider publish options.`);
        }
    });
  }


  private handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log('[LiveKitManager] Participant Connected:', participant.identity, participant);
    this.remoteParticipants.set(participant.identity, participant);
    this.onPeerStatusChanged(participant.identity, 'connected', participant);

    // Set initial mute state for existing tracks
    participant.audioTrackPublications.forEach(pub => {
      if (pub.track) { // Track might not be immediately available
        this.onTrackMuteChanged(participant.identity, pub.source, pub.isMuted);
      } else { // If track is not yet available, use publication's isMuted directly
        this.onTrackMuteChanged(participant.identity, pub.source, pub.isMuted);
      }
      // It's also possible pub.track.isMuted is more accurate if track exists
    });

    // Add listeners for future mute changes
    participant
      .on(ParticipantEvent.TrackMuted, (trackPub: TrackPublication) => {
        if (trackPub.kind === Track.Kind.Audio) { // Could also check trackPub.source
          this.onTrackMuteChanged(participant.identity, trackPub.source, true);
        }
      })
      .on(ParticipantEvent.TrackUnmuted, (trackPub: TrackPublication) => {
        if (trackPub.kind === Track.Kind.Audio) {
          this.onTrackMuteChanged(participant.identity, trackPub.source, false);
        }
      })
      .on(ParticipantEvent.IsSpeakingChanged, (isSpeaking: boolean) => {
        this.onIsSpeakingChanged(participant.identity, isSpeaking);
      });

    // Set initial speaking state
    this.onIsSpeakingChanged(participant.identity, participant.isSpeaking);

    // Tracks will be handled by TrackSubscribed event for actual stream
    // Existing tracks for this participant (if any, e.g. on quick reconnect)
    participant.trackPublications.forEach(publication => {
        if (publication.isSubscribed && publication.track) {
            this.handleTrackSubscribed(publication.track as RemoteTrack, publication as RemoteTrackPublication, participant);
        }
    });
  }

  private handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('[LiveKitManager] Participant Disconnected:', participant.identity);
    this.remoteParticipants.delete(participant.identity);
    this.onPeerStatusChanged(participant.identity, 'disconnected', participant);
    this.onIsSpeakingChanged(participant.identity, false); // Ensure UI reflects they are no longer speaking
    // Tracks associated with this participant will be unpublished automatically by LiveKit
    // and TrackUnsubscribed will fire. We still call onRemoteStreamUnsubscribed for safety.
    this.onRemoteStreamUnsubscribed(participant.identity); // Ensure UI cleans up audio element
  }

  private handleTrackSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.log(`[LiveKitManager] Track Subscribed: ${track.kind} from ${participant.identity}`, track);
    if (track.kind === Track.Kind.Audio && track.mediaStream) {
      this.onRemoteStreamSubscribed(participant.identity, track.mediaStream);
      // AudioManager can play this directly if needed, or UI handles it via onRemoteStreamSubscribed
      // this.audioManager.playRemoteStream(participant.identity, track.mediaStream);
    }
    // If handling video:
    // if (track.kind === Track.Kind.Video && track.element) {
    //   this.onRemoteVideoTrackSubscribed(participant.identity, track.element);
    // }
  }

  private handleTrackUnsubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.log(`[LiveKitManager] Track Unsubscribed: ${track.kind} from ${participant.identity}`);
    // The stream itself might still be in use if other tracks from same participant are on it.
    // For audio, usually one track per stream.
    this.onRemoteStreamUnsubscribed(participant.identity); // Ensure UI cleans up audio element
  }

  public async leaveRoom(): Promise<void> {
    if (this.room) {
      console.log('[LiveKitManager] Leaving LiveKit room.');
      // Explicitly unpublish tracks before disconnecting
      if (this.localParticipant) {
          this.localParticipant.tracks.forEach(async (publication) => {
              if (publication.track) {
                  console.log(`[LiveKitManager] Unpublishing local track: ${publication.track.sid}`);
                  this.localParticipant?.unpublishTrack(publication.track.sid);
              }
          });
      }
      await this.room.disconnect(); // This will trigger ConnectionStateChanged to Disconnected
                                   // and subsequently cleanupRoom via the event handler.
    } else {
      // If room doesn't exist but we want to ensure cleanup logic runs (e.g. from a failed join)
      this.cleanupRoom();
    }
  }

  private cleanupRoom(): void {
    if (this.room) {
        this.room.removeAllListeners();
        // No need to call disconnect again if already called or if state is already Disconnected
        this.room = null;
    }
    this.localParticipant = null;
    this.remoteParticipants.clear();
    // Do not stop AudioManager's stream here by default, let calling context decide
    // e.g., useVoiceCollaboration might stop it when user exits the feature entirely.
    console.log('[LiveKitManager] Room resources cleaned up.');
  }

  // Method to update the local audio stream if microphone changes
  public async updateLocalAudioStream() {
    if (!this.room || !this.localParticipant || this.room.state !== ConnectionState.Connected) {
        console.warn("[LiveKitManager] Cannot update local stream, not connected.");
        return;
    }
    if (!this.audioManager.isStreamActive() || !this.audioManager.getCurrentStream()) {
        console.warn("[LiveKitManager] AudioManager has no active stream for update.");
        // Optionally, try to get it now if that's desired behavior
        // await this.publishLocalAudio(); // This would try to get and publish
        return;
    }

    const newStream = this.audioManager.getCurrentStream();
    if (newStream && newStream.getAudioTracks().length > 0) {
        const newAudioTrack = newStream.getAudioTracks()[0];

        // Unpublish existing audio tracks if they are different from the new track
        const existingAudioPublications = Array.from(this.localParticipant.audioTrackPublications.values());
        let needsPublish = true;

        for (const pub of existingAudioPublications) {
            if (pub.track) {
                if (pub.track.mediaStreamTrack.id === newAudioTrack.id) {
                    console.log("[LiveKitManager] New audio track is the same as an already published one. No update needed.");
                    needsPublish = false; // Track already published
                    continue;
                }
                console.log("[LiveKitManager] Unpublishing old audio track:", pub.trackSid);
                this.localParticipant.unpublishTrack(pub.trackSid, true); // true to stop the track on unpublish
            }
        }

        if (needsPublish) {
            console.log("[LiveKitManager] Publishing new audio track after update.");
            await this.localParticipant.publishTrack(newAudioTrack, {
                name: 'microphone',
                source: Track.Source.Microphone,
            });
        }
    } else {
        console.warn("[LiveKitManager] No audio track in new stream to update. Unpublishing existing if any.");
        // If new stream has no audio, unpublish all existing audio tracks
        const existingAudioPublications = Array.from(this.localParticipant.audioTrackPublications.values());
        for (const pub of existingAudioPublications) {
            if (pub.track) {
                 this.localParticipant.unpublishTrack(pub.trackSid, true);
            }
        }
    }
  }

  public async setAudioOutputDevice(deviceId: string): Promise<void> {
    if (this.room && typeof this.room.setAudioOutput === 'function') {
        try {
            await this.room.setAudioOutput({ deviceId });
            console.log(`[LiveKitManager] Audio output device set to: ${deviceId}`);
        } catch (error) {
            console.error('[LiveKitManager] Error setting audio output device:', error);
            // Propagate or handle error as needed
            throw error;
        }
    } else {
        console.warn('[LiveKitManager] Room not available or setAudioOutput not supported.');
        // Optionally, throw an error or return a status if the operation cannot be performed
        // throw new Error("Room not available or setAudioOutput not supported.");
    }
  }
}
