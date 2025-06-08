
import { supabase } from '@/integrations/supabase/client';
import { LiveKitService } from './LiveKitService';
import { AudioLevelMonitor } from './AudioLevelMonitor';
import { ConnectionState, Participant, LocalParticipant, RemoteParticipant } from 'livekit-client';

interface VoiceRoomDetails {
  id: string;
  name: string;
  max_participants?: number;
}

export class NewVoiceChatManager {
  private liveKitService: LiveKitService;
  private audioLevelMonitor: AudioLevelMonitor;
  private currentRoomId: string | null = null;
  private participants: Participant[] = [];
  private audioLevels: Map<string, number> = new Map();

  public onParticipantsChanged?: (participants: Participant[]) => void;
  public onConnectionStateChanged?: (state: ConnectionState) => void;
  public onError?: (error: Error) => void;
  public onAudioLevelChanged?: (participantId: string, level: number) => void;

  constructor() {
    this.liveKitService = new LiveKitService();
    this.audioLevelMonitor = new AudioLevelMonitor();
    this.setupLiveKitCallbacks();
  }

  private setupLiveKitCallbacks(): void {
    this.liveKitService.onParticipantConnected = (participant: RemoteParticipant) => {
      this.updateParticipants();
      this.setupParticipantAudioMonitoring(participant);
    };

    this.liveKitService.onParticipantDisconnected = () => {
      this.updateParticipants();
    };

    this.liveKitService.onConnectionStateChanged = (state: ConnectionState) => {
      this.onConnectionStateChanged?.(state);
      
      if (state === ConnectionState.Connected) {
        this.updateParticipants();
        this.setupLocalAudioMonitoring();
      }
    };

    this.liveKitService.onTrackSubscribed = (track, publication, participant) => {
      if (track.kind === 'audio') {
        this.setupParticipantAudioMonitoring(participant);
      }
    };

    this.liveKitService.onError = (error: Error) => {
      this.onError?.(error);
    };
  }

  private updateParticipants(): void {
    this.participants = this.liveKitService.getParticipants();
    this.onParticipantsChanged?.(this.participants);
  }

  private setupLocalAudioMonitoring(): void {
    const localParticipant = this.liveKitService.getLocalParticipant();
    if (localParticipant) {
      // Monitor local audio track
      const audioTrack = localParticipant.audioTrackPublications.values().next().value?.track;
      if (audioTrack && audioTrack.mediaStreamTrack) {
        const stream = new MediaStream([audioTrack.mediaStreamTrack]);
        this.audioLevelMonitor.startMonitoring(stream).catch(console.error);
        this.audioLevelMonitor.setCallback((level) => {
          this.audioLevels.set(localParticipant.identity, level);
          this.onAudioLevelChanged?.(localParticipant.identity, level);
        });
      }
    }
  }

  private setupParticipantAudioMonitoring(participant: RemoteParticipant): void {
    // Set up audio level monitoring for remote participant
    participant.audioTrackPublications.forEach((publication) => {
      if (publication.track && publication.track.mediaStreamTrack) {
        const stream = new MediaStream([publication.track.mediaStreamTrack]);
        // Create separate monitor for each participant
        const monitor = new AudioLevelMonitor((level) => {
          this.audioLevels.set(participant.identity, level);
          this.onAudioLevelChanged?.(participant.identity, level);
        });
        monitor.startMonitoring(stream).catch(console.error);
      }
    });
  }

  async listAvailableRooms(matchId: string): Promise<VoiceRoomDetails[]> {
    try {
      const { data, error } = await supabase
        .from('voice_rooms')
        .select('id, name, max_participants')
        .eq('match_id', matchId)
        .eq('is_active', true);

      if (error) throw error;

      return data?.map(room => ({
        id: room.id,
        name: room.name,
        max_participants: room.max_participants
      })) || [];
    } catch (error) {
      console.error('[NewVoiceChatManager] Error fetching rooms:', error);
      throw new Error(`Failed to fetch voice rooms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async joinRoom(roomId: string, userId: string, userRole: string, userName: string): Promise<boolean> {
    try {
      console.log('[NewVoiceChatManager] Joining room:', roomId);

      // Get LiveKit token from Supabase edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-livekit-token', {
        body: {
          roomId,
          userId,
          userName,
          userRole
        }
      });

      if (tokenError || !tokenData?.token) {
        throw new Error(`Failed to get LiveKit token: ${tokenError?.message || 'No token received'}`);
      }

      // Connect to LiveKit
      const serverUrl = tokenData.serverUrl || 'wss://your-livekit-server.com';
      await this.liveKitService.connect(tokenData.token, serverUrl, roomId);

      // Enable microphone by default
      await this.liveKitService.enableMicrophone();

      this.currentRoomId = roomId;
      console.log('[NewVoiceChatManager] Successfully joined room:', roomId);
      
      return true;
    } catch (error) {
      console.error('[NewVoiceChatManager] Failed to join room:', error);
      this.onError?.(error as Error);
      return false;
    }
  }

  async leaveRoom(): Promise<void> {
    try {
      if (this.currentRoomId) {
        console.log('[NewVoiceChatManager] Leaving room:', this.currentRoomId);
        
        this.audioLevelMonitor.stopMonitoring();
        await this.liveKitService.disconnect();
        
        this.currentRoomId = null;
        this.participants = [];
        this.audioLevels.clear();
        
        this.onParticipantsChanged?.([]);
        console.log('[NewVoiceChatManager] Successfully left room');
      }
    } catch (error) {
      console.error('[NewVoiceChatManager] Error leaving room:', error);
      this.onError?.(error as Error);
    }
  }

  async toggleMuteSelf(): Promise<boolean | undefined> {
    try {
      const newMuteState = await this.liveKitService.toggleMicrophone();
      console.log('[NewVoiceChatManager] Toggled mute, now muted:', !newMuteState);
      return !newMuteState; // Return muted state (opposite of enabled)
    } catch (error) {
      console.error('[NewVoiceChatManager] Error toggling mute:', error);
      this.onError?.(error as Error);
      return undefined;
    }
  }

  async moderateMuteParticipant(targetIdentity: string, mute: boolean): Promise<boolean> {
    try {
      return await this.liveKitService.moderateMuteParticipant(targetIdentity, mute);
    } catch (error) {
      console.error('[NewVoiceChatManager] Error moderating participant:', error);
      this.onError?.(error as Error);
      return false;
    }
  }

  getParticipants(): Participant[] {
    return this.participants;
  }

  getLocalParticipant(): Participant | null {
    return this.liveKitService.getLocalParticipant();
  }

  getConnectionState(): ConnectionState | null {
    return this.liveKitService.getConnectionState();
  }

  isConnected(): boolean {
    return this.liveKitService.isConnected();
  }

  getAudioLevel(participantId: string): number {
    return this.audioLevels.get(participantId) || 0;
  }

  dispose(): void {
    this.audioLevelMonitor.stopMonitoring();
    this.liveKitService.disconnect().catch(console.error);
    this.audioLevels.clear();
  }
}
