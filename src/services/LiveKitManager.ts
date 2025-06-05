
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
  Participant,
} from 'livekit-client';
import { AudioManager } from '@/utils/audioManager';

export class LiveKitManager {
  private static instance: LiveKitManager;
  private room: Room | null = null;
  private localParticipant: LocalParticipant | null = null;
  private remoteParticipants: Map<string, RemoteParticipant> = new Map();

  private audioManager: AudioManager;
  private myUserId: string | null = null;

  // Event callbacks
  public onRemoteStreamSubscribed: (peerId: string, stream: MediaStream, participant: RemoteParticipant) => void = () => {};
  public onRemoteStreamUnsubscribed: (peerId: string, participant: RemoteParticipant) => void = () => {};
  public onPeerStatusChanged: (peerId: string, status: string, participant?: RemoteParticipant | LocalParticipant) => void = () => {};
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
      await this.leaveRoom();
    }

    this.room = new Room({});

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
          this.room!.remoteParticipants.forEach(participant => {
            this.handleParticipantConnected(participant);
          });
        } else if (state === ConnectionState.Disconnected) {
            console.log('[LiveKitManager] Disconnected from LiveKit room. Cleaning up.');
            this.cleanupRoom();
            this.onConnectionStateChanged(state, new Error("Disconnected from LiveKit room."));
        }
      })
      .on(RoomEvent.ParticipantConnected, this.handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected)
      .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
      .on(RoomEvent.TrackMuted, (trackPub: TrackPublication, participant: Participant) => {
        if (trackPub.kind === Track.Kind.Audio) {
          this.onTrackMuteChanged(participant.identity, trackPub.source, true);
        }
      })
      .on(RoomEvent.TrackUnmuted, (trackPub: TrackPublication, participant: Participant) => {
        if (trackPub.kind === Track.Kind.Audio) {
          this.onTrackMuteChanged(participant.identity, trackPub.source, false);
        }
      })
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        // Reset all speaking states first
        this.room?.remoteParticipants.forEach(p => {
          this.onIsSpeakingChanged(p.identity, false);
        });
        // Set active speakers
        speakers.forEach(speaker => {
          this.onIsSpeakingChanged(speaker.identity, true);
        });
      })
      .on(RoomEvent.MediaDevicesError, (error: Error) => {
        console.error('[LiveKitManager] Media devices error:', error);
        this.onConnectionStateChanged(ConnectionState.Disconnected, error);
      });

    try {
      await this.room.connect(livekitUrl, token);
    } catch (error: any) {
      console.error('[LiveKitManager] Failed to connect to LiveKit room:', error);
      this.onConnectionStateChanged(ConnectionState.Disconnected, error);
      this.cleanupRoom();
      throw error;
    }
  }

  private publishLocalAudio = async () => {
    if (!this.room || this.room.state !== ConnectionState.Connected || !this.localParticipant) {
      console.warn('[LiveKitManager] Cannot publish audio, not connected or no local participant.');
      return;
    }

    if (!this.audioManager.isStreamActive() || !this.audioManager.getCurrentStream()) {
      console.warn('[LiveKitManager] AudioManager does not have an active stream to publish.');
      try {
        if(!this.audioManager.getAudioContext() || this.audioManager.getAudioContext()?.state === 'closed'){
            await this.audioManager.initialize({onError: (e: Error) => console.error("[LiveKitManager] AudioManager init error during publish:", e) });
        }
        const stream = await this.audioManager.getUserMedia();
        if (!stream) throw new Error("Failed to get stream from AudioManager");
      } catch(error){
        console.error('[LiveKitManager] Failed to get/initialize local audio stream for publishing:', error);
        this.onConnectionStateChanged(ConnectionState.Disconnected, new Error("Microphone access failed during publish."));
        return;
      }
    }

    const localStream = this.audioManager.getCurrentStream();
    if (localStream && localStream.getAudioTracks().length > 0) {
      const audioTrack = localStream.getAudioTracks()[0];
      try {
        let isPublished = false;
        this.localParticipant.audioTrackPublications.forEach(pub => {
            if (pub.track?.mediaStreamTrack === audioTrack) {
                isPublished = true;
            }
        });

        if (!isPublished) {
            console.log('[LiveKitManager] Publishing local audio track.');
            await this.localParticipant.publishTrack(audioTrack, {
              name: 'microphone',
              source: Track.Source.Microphone,
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
    const publications = Array.from(this.localParticipant.audioTrackPublications.values()).filter(pub => pub.source === source);
    if (publications.length === 0) {
        console.warn(`[LiveKitManager] No local track found for source ${source} to set enabled state.`);
        return;
    }
    publications.forEach(pub => {
        if (pub.track) {
              console.log(`[LiveKitManager] Setting track ${pub.trackSid} (${source}) enabled: ${enabled}`);
              if (enabled) {
                pub.unmute();
              } else {
                pub.mute();
              }
        } else {
              console.warn(`[LiveKitManager] Track for source ${source} (SID: ${pub.trackSid}) not yet published, cannot set enabled state directly.`);
        }
    });
  }

  private handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log('[LiveKitManager] Participant Connected:', participant.identity, participant);
    this.remoteParticipants.set(participant.identity, participant);
    this.onPeerStatusChanged(participant.identity, 'connected', participant);

    participant.audioTrackPublications.forEach(pub => {
      this.onTrackMuteChanged(participant.identity, pub.source, pub.isMuted);
    });

    participant
      .on(ParticipantEvent.TrackMuted, (trackPub: TrackPublication) => {
        if (trackPub.kind === Track.Kind.Audio) {
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

    this.onIsSpeakingChanged(participant.identity, participant.isSpeaking);

    participant.audioTrackPublications.forEach(publication => {
        if (publication.isSubscribed && publication.track) {
            this.handleTrackSubscribed(publication.track as RemoteTrack, publication as RemoteTrackPublication, participant);
        }
    });
  }

  private handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('[LiveKitManager] Participant Disconnected:', participant.identity);
    this.remoteParticipants.delete(participant.identity);
    this.onPeerStatusChanged(participant.identity, 'disconnected', participant);
    this.onIsSpeakingChanged(participant.identity, false);
    this.onRemoteStreamUnsubscribed(participant.identity, participant);
  }

  private handleTrackSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.log(`[LiveKitManager] Track Subscribed: ${track.kind} from ${participant.identity}`, track);
    if (track.kind === Track.Kind.Audio && track.mediaStream) {
      this.onRemoteStreamSubscribed(participant.identity, track.mediaStream, participant);
    }
  }

  private handleTrackUnsubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.log(`[LiveKitManager] Track Unsubscribed: ${track.kind} from ${participant.identity}`);
    this.onRemoteStreamUnsubscribed(participant.identity, participant);
  }

  public async leaveRoom(): Promise<void> {
    if (this.room) {
      console.log('[LiveKitManager] Leaving LiveKit room.');
      if (this.localParticipant) {
          this.localParticipant.audioTrackPublications.forEach(async (publication) => {
              if (publication.track) {
                  console.log(`[LiveKitManager] Unpublishing local track: ${publication.track.sid}`);
                  this.localParticipant?.unpublishTrack(publication.track);
              }
          });
      }
      await this.room.disconnect();
    } else {
      this.cleanupRoom();
    }
  }

  private cleanupRoom(): void {
    if (this.room) {
        this.room.removeAllListeners();
        this.room = null;
    }
    this.localParticipant = null;
    this.remoteParticipants.clear();
    console.log('[LiveKitManager] Room resources cleaned up.');
  }

  public async updateLocalAudioStream() {
    if (!this.room || !this.localParticipant || this.room.state !== ConnectionState.Connected) {
        console.warn("[LiveKitManager] Cannot update local stream, not connected.");
        return;
    }
    if (!this.audioManager.isStreamActive() || !this.audioManager.getCurrentStream()) {
        console.warn("[LiveKitManager] AudioManager has no active stream for update.");
        return;
    }

    const newStream = this.audioManager.getCurrentStream();
    if (newStream && newStream.getAudioTracks().length > 0) {
        const newAudioTrack = newStream.getAudioTracks()[0];

        const existingAudioPublications = Array.from(this.localParticipant.audioTrackPublications.values());
        let needsPublish = true;

        for (const pub of existingAudioPublications) {
            if (pub.track) {
                if (pub.track.mediaStreamTrack.id === newAudioTrack.id) {
                    console.log("[LiveKitManager] New audio track is the same as an already published one. No update needed.");
                    needsPublish = false;
                    continue;
                }
                console.log("[LiveKitManager] Unpublishing old audio track:", pub.trackSid);
                this.localParticipant.unpublishTrack(pub.track, true);
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
        const existingAudioPublications = Array.from(this.localParticipant.audioTrackPublications.values());
        for (const pub of existingAudioPublications) {
            if (pub.track) {
                 this.localParticipant.unpublishTrack(pub.track, true);
            }
        }
    }
  }

  public async setAudioOutputDevice(deviceId: string): Promise<void> {
    console.log(`[LiveKitManager] Setting audio output device to: ${deviceId}`);
    try {
      if (typeof HTMLAudioElement !== 'undefined' && 'setSinkId' in HTMLAudioElement.prototype) {
        const audioElements = document.querySelectorAll('audio');
        for (const audioElement of audioElements) {
          if ('setSinkId' in audioElement) {
            await (audioElement as any).setSinkId(deviceId);
          }
        }
        console.log(`[LiveKitManager] Audio output device set via setSinkId: ${deviceId}`);
      } else {
        console.warn('[LiveKitManager] setSinkId not supported in this browser');
      }
    } catch (error) {
      console.error('[LiveKitManager] Error setting audio output device:', error);
      throw error;
    }
  }
}
