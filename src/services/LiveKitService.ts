
import { Room, connect, RoomOptions, Track, RemoteParticipant, LocalParticipant, ConnectionState, Participant } from 'livekit-client';

export interface LiveKitConfig {
  serverUrl: string;
  apiKey: string;
  secretKey: string;
}

export class LiveKitService {
  private room: Room | null = null;
  private localParticipant: LocalParticipant | null = null;
  
  public onParticipantConnected?: (participant: RemoteParticipant) => void;
  public onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  public onConnectionStateChanged?: (state: ConnectionState) => void;
  public onLocalTrackPublished?: (track: Track) => void;
  public onTrackSubscribed?: (track: Track, participant: RemoteParticipant) => void;
  public onError?: (error: Error) => void;

  async connect(token: string, serverUrl: string, roomName: string): Promise<Room> {
    try {
      console.log('[LiveKitService] Connecting to room:', roomName);
      
      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      this.room = await connect(serverUrl, token, roomOptions);
      this.localParticipant = this.room.localParticipant;

      // Set up event listeners
      this.room.on('participantConnected', (participant: RemoteParticipant) => {
        console.log('[LiveKitService] Participant connected:', participant.identity);
        this.onParticipantConnected?.(participant);
      });

      this.room.on('participantDisconnected', (participant: RemoteParticipant) => {
        console.log('[LiveKitService] Participant disconnected:', participant.identity);
        this.onParticipantDisconnected?.(participant);
      });

      this.room.on('connectionStateChanged', (state: ConnectionState) => {
        console.log('[LiveKitService] Connection state changed:', state);
        this.onConnectionStateChanged?.(state);
      });

      this.room.on('localTrackPublished', (track: Track) => {
        console.log('[LiveKitService] Local track published:', track.kind);
        this.onLocalTrackPublished?.(track);
      });

      this.room.on('trackSubscribed', (track: Track, participant: RemoteParticipant) => {
        console.log('[LiveKitService] Track subscribed:', track.kind, 'from', participant.identity);
        this.onTrackSubscribed?.(track, participant);
      });

      this.room.on('disconnected', (reason?: string) => {
        console.log('[LiveKitService] Disconnected:', reason);
      });

      console.log('[LiveKitService] Successfully connected to room');
      return this.room;
    } catch (error) {
      console.error('[LiveKitService] Connection failed:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  async enableMicrophone(): Promise<void> {
    if (!this.room || !this.localParticipant) {
      throw new Error('Not connected to room');
    }

    try {
      await this.localParticipant.setMicrophoneEnabled(true);
      console.log('[LiveKitService] Microphone enabled');
    } catch (error) {
      console.error('[LiveKitService] Failed to enable microphone:', error);
      throw error;
    }
  }

  async disableMicrophone(): Promise<void> {
    if (!this.room || !this.localParticipant) {
      throw new Error('Not connected to room');
    }

    try {
      await this.localParticipant.setMicrophoneEnabled(false);
      console.log('[LiveKitService] Microphone disabled');
    } catch (error) {
      console.error('[LiveKitService] Failed to disable microphone:', error);
      throw error;
    }
  }

  async toggleMicrophone(): Promise<boolean> {
    if (!this.localParticipant) {
      throw new Error('Local participant not available');
    }

    const isEnabled = this.localParticipant.isMicrophoneEnabled;
    if (isEnabled) {
      await this.disableMicrophone();
    } else {
      await this.enableMicrophone();
    }
    
    return !isEnabled;
  }

  getParticipants(): Participant[] {
    if (!this.room) return [];
    
    const participants: Participant[] = [this.room.localParticipant];
    this.room.remoteParticipants.forEach(participant => {
      participants.push(participant);
    });
    
    return participants;
  }

  getLocalParticipant(): LocalParticipant | null {
    return this.localParticipant;
  }

  getConnectionState(): ConnectionState | null {
    return this.room?.state ?? null;
  }

  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      console.log('[LiveKitService] Disconnecting from room');
      await this.room.disconnect();
      this.room = null;
      this.localParticipant = null;
    }
  }

  async moderateMuteParticipant(identity: string, mute: boolean): Promise<boolean> {
    // This would typically require server-side implementation
    // For now, we'll return false as it's not implemented
    console.warn('[LiveKitService] Moderation mute not implemented on client side');
    return false;
  }
}
