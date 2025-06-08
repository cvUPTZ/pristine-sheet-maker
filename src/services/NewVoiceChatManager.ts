
import { Room, RoomEvent, RemoteParticipant, Participant, ConnectionState, LocalParticipant } from 'livekit-client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import { VoiceRoom } from '@/types'; // Import the new VoiceRoom type

// Environment variables (ensure these are set in your .env file)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class NewVoiceChatManager {
  private supabase: SupabaseClient<Database>;
  private liveKitRoom: Room | null = null;
  private currentRoomId: string | null = null;
  private localParticipantName: string | null = null;
  private localParticipantIdentity: string | null = null;

  // Callbacks for UI updates
  public onParticipantsChanged: ((participants: Participant[]) => void) | null = null;
  public onConnectionStateChanged: ((state: ConnectionState) => void) | null = null;
  public onError: ((error: Error) => void) | null = null;

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase URL or Anon Key is not defined. Please check your environment variables.');
    }
    this.supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  private async getAuthToken(): Promise<string | null> {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error || !session) {
      this.handleError(error || new Error('No active session'), 'Error fetching session');
      return null;
    }
    return session.access_token;
  }

  private handleError(error: any, defaultMessage: string): void {
    let specificMessage = defaultMessage;

    if (error && error.details && typeof error.details === 'string') {
      specificMessage = error.details;
    } else if (error && error.message && typeof error.message === 'string') {
      specificMessage = error.message;
    } else if (typeof error === 'string') {
      specificMessage = error;
    }

    console.error(`NewVoiceChatManager Error: ${specificMessage}`, error);
    if (this.onError) {
      this.onError(new Error(specificMessage));
    }
  }

  public async listAvailableRooms(matchId: string): Promise<VoiceRoom[]> {
    const authToken = await this.getAuthToken();
    if (!authToken) {
        return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('voice_rooms')
        .select('*')
        .eq('match_id', matchId)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) {
        this.handleError(error, `Error fetching rooms for match ${matchId}:`);
        return [];
      }
      return data || [];
    } catch (err) {
      this.handleError(err as Error, `Unexpected error fetching rooms for match ${matchId}:`);
      return [];
    }
  }

  public async joinRoom(roomId: string, userId: string, userRole: string, participantName?: string): Promise<boolean> {
    if (this.liveKitRoom && this.currentRoomId === roomId) {
      console.warn('Already connected to this room.');
      return true;
    }

    await this.leaveRoom();

    this.currentRoomId = roomId;
    this.localParticipantIdentity = userId;
    this.localParticipantName = participantName || userId;

    const authToken = await this.getAuthToken();
    if (!authToken) {
        this.handleError(new Error('Authentication token not available.'), 'Authentication failed');
        this.currentRoomId = null;
        return false;
    }

    try {
      const { data: joinData, error: joinFuncError } = await this.supabase.functions.invoke('join-voice-room', {
        body: { roomId, userId, userRole },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (joinFuncError || (joinData && (joinData as any).error) || !(joinData as any)?.authorized) {
        const message = (joinData as any)?.error || joinFuncError?.message || 'Failed to authorize room entry. You may not have permission or the room is inactive.';
        this.handleError(joinFuncError || new Error(message), message);
        this.currentRoomId = null;
        return false;
      }
      console.log('Successfully authorized and logged in voice_room_participants:', joinData);

      const { data: tokenData, error: tokenFuncError } = await this.supabase.functions.invoke('generate-livekit-token', {
        body: {
          roomId,
          participantIdentity: this.localParticipantIdentity!,
          participantName: this.localParticipantName!,
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (tokenFuncError || (tokenData && (tokenData as any).error) || !(tokenData as any)?.token) {
        const message = (tokenData as any)?.error || tokenFuncError?.message || 'Failed to obtain a voice session token. Please try again.';
        this.handleError(tokenFuncError || new Error(message), message);
        this.currentRoomId = null;
        return false;
      }
      const liveKitToken = (tokenData as any).token;

      this.liveKitRoom = new Room();
      this.liveKitRoom.on(RoomEvent.ConnectionStateChanged, this.handleConnectionStateChange);
      this.liveKitRoom.on(RoomEvent.ParticipantConnected, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.ParticipantDisconnected, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.LocalTrackPublished, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.LocalTrackUnpublished, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.TrackSubscribed, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.TrackUnsubscribed, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.TrackMuted, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.TrackUnmuted, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.ActiveSpeakersChanged, this.handleParticipantChange);

      const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;
      if (!LIVEKIT_URL) {
        this.handleError(new Error('LiveKit URL is not configured.'), 'LiveKit client configuration error.');
        this.currentRoomId = null;
        return false;
      }

      try {
        await this.liveKitRoom.connect(LIVEKIT_URL, liveKitToken, { autoSubscribe: true });
      } catch (lkError: any) {
        console.error('LiveKit Connection Error:', lkError);
        let detailedMessage = 'Failed to connect to the voice server.';
        if (lkError && lkError.message) {
          if (lkError.message.includes('full')) {
            detailedMessage = 'The voice room is currently full. Please try again later.';
          } else if (lkError.message.includes('permission')) {
              detailedMessage = 'Permission denied to connect to the voice server.';
          } else {
              detailedMessage = `Voice server connection failed: ${lkError.message}`;
          }
        }
        this.handleError(lkError, detailedMessage);
        this.currentRoomId = null;
        return false;
      }

      await this.liveKitRoom.localParticipant.setMicrophoneEnabled(true);

      console.log(`Successfully connected to LiveKit room: ${roomId}`);
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(this.liveKitRoom.state);
      }
      this.updateParticipants();
      return true;

    } catch (err: any) {
      this.handleError(err, 'An unexpected error occurred while joining the room.');
      await this.leaveRoom();
      return false;
    }
  }

  private handleConnectionStateChange = (state: ConnectionState) => {
    console.log('LiveKit Connection State:', state);
    if (this.onConnectionStateChanged) {
      this.onConnectionStateChanged(state);
    }
    if (state === ConnectionState.Disconnected) {
      console.log('Disconnected from LiveKit. Cleaning up.');
      this.liveKitRoom?.removeAllListeners();
      this.liveKitRoom = null;
      this.currentRoomId = null;
      this.updateParticipants();
    }
  }

  private handleParticipantChange = () => {
    this.updateParticipants();
  }

  private updateParticipants() {
    if (this.onParticipantsChanged) {
      if (this.liveKitRoom) {
        const participants = [
          this.liveKitRoom.localParticipant,
          ...Array.from(this.liveKitRoom.remoteParticipants.values()),
        ];
        this.onParticipantsChanged(participants);
      } else {
        this.onParticipantsChanged([]);
      }
    }
  }

  public async leaveRoom(): Promise<void> {
    if (this.liveKitRoom) {
      console.log('Leaving LiveKit room:', this.currentRoomId);
      await this.liveKitRoom.disconnect();
      this.liveKitRoom.removeAllListeners();
      this.liveKitRoom = null;
      if (this.onConnectionStateChanged && this.currentRoomId !== null) {
         this.onConnectionStateChanged(ConnectionState.Disconnected);
      }
      this.currentRoomId = null;
      this.updateParticipants();
    }
  }

  public async toggleMuteSelf(): Promise<boolean | undefined> {
    if (this.liveKitRoom && this.liveKitRoom.localParticipant) {
      const localParticipant = this.liveKitRoom.localParticipant as LocalParticipant;
      const isMuted = localParticipant.isMicrophoneEnabled === false;
      await localParticipant.setMicrophoneEnabled(isMuted);
      return isMuted;
    }
    console.warn('Cannot toggle mute: No local participant or microphone track.');
    return undefined;
  }

  public getLocalParticipant(): Participant | null {
    return this.liveKitRoom?.localParticipant || null;
  }

  public getRemoteParticipants(): RemoteParticipant[] {
    return this.liveKitRoom ? Array.from(this.liveKitRoom.remoteParticipants.values()) : [];
  }

  public getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  public async moderateMuteParticipant(targetIdentity: string, mute: boolean): Promise<boolean> {
    if (!this.currentRoomId) {
      this.handleError(new Error('Not connected to a room.'), 'Moderation action failed');
      return false;
    }
    const authToken = await this.getAuthToken();
    if (!authToken) {
        return false;
    }

    try {
      const { data, error: funcError } = await this.supabase.functions.invoke('moderate-livekit-room', {
        body: {
          roomId: this.currentRoomId,
          targetIdentity,
          mute,
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (funcError || (data && (data as any).error)) {
        const message = (data as any)?.error || funcError?.message || 'Failed to moderate participant.';
        this.handleError(funcError || new Error(message), message);
        return false;
      }
      console.log(`Moderation action successful for ${targetIdentity}: ${(data as any).message}`);
      return true;
    } catch (err: any) {
      this.handleError(err, `Error moderating participant ${targetIdentity}`);
      return false;
    }
  }

  public dispose(): void {
    console.log('Disposing NewVoiceChatManager.');
    this.leaveRoom();
    this.onParticipantsChanged = null;
    this.onConnectionStateChanged = null;
    this.onError = null;
  }
}
