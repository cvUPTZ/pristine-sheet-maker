import { Room, RoomEvent, RemoteParticipant, Participant, ConnectionState } from 'livekit-client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types'; // Assuming this path is correct

// Environment variables (ensure these are set in your .env file)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface VoiceRoomDetails {
  id: string;
  name: string;
  max_participants?: number;
  // Add other relevant fields from your voice_rooms table
}

// interface ParticipantDetails { // This interface is not actively used in the current service implementation
//   id: string;
//   user_id: string;
//   user_role: string;
//   is_muted?: boolean;
//   is_speaking?: boolean;
//   // Add other relevant fields from your voice_room_participants table
// }

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
      this.handleError(new Error(`Error fetching session or no active session: ${error?.message}`));
      return null;
    }
    return session.access_token;
  }

  private handleError(error: Error, message?: string): void {
    const errorMessage = message ? `${message} ${error.message}` : `NewVoiceChatManager Error: ${error.message}`;
    console.error(errorMessage, error);
    if (this.onError) {
      this.onError(new Error(errorMessage)); // Pass a new error object with the combined message
    }
  }

  public async listAvailableRooms(matchId: string): Promise<VoiceRoomDetails[]> {
    const authToken = await this.getAuthToken();
    if (!authToken) {
        this.handleError(new Error('Authentication token not available for listAvailableRooms.'));
        return [];
    }

    try {
      // Note: RLS policies on 'voice_rooms' should handle whether the user can see these rooms.
      // The authToken is implicitly used by the Supabase client instance if configured globally,
      // but for functions, explicit header passing is safer. For table access, RLS is key.
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
        this.handleError(new Error('Authentication token not available for joinRoom.'));
        this.currentRoomId = null; // Reset since we can't proceed
        return false;
    }

    try {
      const { data: joinData, error: joinError } = await this.supabase.functions.invoke('join-voice-room', {
        body: { roomId, userId, userRole },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Ensure joinData.error is checked if joinData itself is not null
      if (joinError || (joinData && (joinData as any).error) || !(joinData as any)?.authorized) {
        const message = joinError?.message || (joinData as any)?.error || 'Failed to authorize room entry.';
        this.handleError(new Error(message), 'Join room authorization step failed:');
        this.currentRoomId = null;
        return false;
      }
      console.log('Successfully authorized and logged in voice_room_participants:', joinData);

      const { data: tokenData, error: tokenError } = await this.supabase.functions.invoke('generate-livekit-token', {
        body: {
          roomId,
          participantIdentity: this.localParticipantIdentity,
          participantName: this.localParticipantName,
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (tokenError || (tokenData && (tokenData as any).error) || !(tokenData as any)?.token) {
        const message = tokenError?.message || (tokenData as any)?.error || 'Failed to get LiveKit token.';
        this.handleError(new Error(message), 'LiveKit token generation failed:');
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
      this.liveKitRoom.on(RoomEvent.TrackSubscribed, this.handleParticipantChange); // For remote tracks
      this.liveKitRoom.on(RoomEvent.TrackUnsubscribed, this.handleParticipantChange); // For remote tracks
      this.liveKitRoom.on(RoomEvent.TrackMuted, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.TrackUnmuted, this.handleParticipantChange);
      this.liveKitRoom.on(RoomEvent.ActiveSpeakersChanged, this.handleParticipantChange);


      const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;
      if (!LIVEKIT_URL) {
        this.handleError(new Error('LiveKit URL is not configured in environment variables (VITE_LIVEKIT_URL).'));
        this.currentRoomId = null;
        return false;
      }

      await this.liveKitRoom.connect(LIVEKIT_URL, liveKitToken, { autoSubscribe: true });
      await this.liveKitRoom.localParticipant.setMicrophoneEnabled(true);

      console.log(`Successfully connected to LiveKit room: ${roomId}`);
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(this.liveKitRoom.state);
      }
      this.updateParticipants();
      return true;

    } catch (err) {
      this.handleError(err as Error, `Error joining room ${roomId}:`);
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
      // Consider whether to attempt reconnection or just clean up
      console.log('Disconnected from LiveKit. Cleaning up.');
      this.liveKitRoom?.removeAllListeners(); // Clean up listeners on the old room object
      this.liveKitRoom = null;
      this.currentRoomId = null; // Potentially reset currentRoomId if disconnect means "left the room"
      this.updateParticipants();
    }
  }

  private handleParticipantChange = () => { // Removed unused parameters
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
        this.onParticipantsChanged([]); // Send empty array if room is null
      }
    }
  }

  public async leaveRoom(): Promise<void> {
    if (this.liveKitRoom) {
      console.log('Leaving LiveKit room:', this.currentRoomId);
      await this.liveKitRoom.disconnect();
      this.liveKitRoom.removeAllListeners();
      this.liveKitRoom = null;
      // currentRoomId is reset in handleConnectionStateChange or here if preferred
      // this.currentRoomId = null;
      console.log('Disconnected from LiveKit room.');
      // Manually trigger state update if not handled by ConnectionState.Disconnected
      if (this.onConnectionStateChanged && this.currentRoomId !== null) { // Avoid double-trigger if already disconnected
         this.onConnectionStateChanged(ConnectionState.Disconnected);
      }
      this.currentRoomId = null; // Ensure it's nulled after potential callback
      this.updateParticipants(); // Ensure UI clears participants
    }
  }

  public async toggleMuteSelf(): Promise<boolean | undefined> {
    if (this.liveKitRoom && this.liveKitRoom.localParticipant && this.liveKitRoom.localParticipant.microphoneTrack) {
      const isMuted = this.liveKitRoom.localParticipant.isMicrophoneMuted;
      await this.liveKitRoom.localParticipant.setMicrophoneEnabled(!isMuted);
      // No need to call updateParticipants() here if TrackMuted/Unmuted events are handled
      return !isMuted;
    }
    console.warn('Cannot toggle mute: No local participant or microphone track.');
    return undefined;
  }

  public getLocalParticipant(): Participant | null {
    return this.liveKitRoom?.localParticipant || null;
  }

  public getRemoteParticipants(): RemoteParticipant[] { // Return array for easier use
    return this.liveKitRoom ? Array.from(this.liveKitRoom.remoteParticipants.values()) : [];
  }

  public getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  public async moderateMuteParticipant(targetIdentity: string, mute: boolean): Promise<boolean> {
    if (!this.currentRoomId) {
      this.handleError(new Error('Not connected to a room to moderate.'));
      return false;
    }
    const authToken = await this.getAuthToken();
    if (!authToken) {
        this.handleError(new Error('Authentication token not available for moderateMuteParticipant.'));
        return false;
    }

    try {
      const { data, error } = await this.supabase.functions.invoke('moderate-livekit-room', {
        body: {
          roomId: this.currentRoomId,
          targetIdentity,
          mute,
        },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (error || (data && (data as any).error)) {
        const message = error?.message || (data as any)?.error || 'Failed to moderate participant.';
        this.handleError(new Error(message), 'Moderation action failed:');
        return false;
      }
      console.log(`Moderation action successful for ${targetIdentity}: ${(data as any).message}`);
      return true;
    } catch (err) {
      this.handleError(err as Error, `Error moderating participant ${targetIdentity}:`);
      return false;
    }
  }

  public dispose(): void {
    console.log('Disposing NewVoiceChatManager.');
    this.leaveRoom(); // Ensure room is left and listeners cleaned up
    this.onParticipantsChanged = null;
    this.onConnectionStateChanged = null;
    this.onError = null;
  }
}
