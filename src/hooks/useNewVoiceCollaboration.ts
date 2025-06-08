
import { useState, useEffect, useCallback } from 'react';
import { NewVoiceChatManager } from '@/services/NewVoiceChatManager';
import { Participant as LivekitParticipant, ConnectionState, LocalParticipant, ConnectionQuality } from 'livekit-client';
import { VoiceRoom, VoiceParticipant } from '@/types';

// Helper function to convert LiveKit Participant to VoiceParticipant
const livekitParticipantToVoiceParticipant = (
  lp: LivekitParticipant,
  currentRoomId: string | null,
  localUserIdentity: string | null, // Renamed for clarity from localIdentity
  localDbUserId?: string,
  localAppRole?: string
): VoiceParticipant => {
  const isLocal = lp.identity === localUserIdentity;
  const voiceParticipant: VoiceParticipant = {
    id: lp.sid,
    identity: lp.identity,
    name: lp.name || lp.identity,
    isMuted: lp.isMicrophoneMuted,
    isSpeaking: lp.isSpeaking,
    isLocal: isLocal,
    connection_quality: lp.connectionQuality ? ConnectionQuality[lp.connectionQuality] : 'unknown',
    // audioTrackPublications: new Map(lp.audioTrackPublications), // Convert Map to new Map to ensure type compatibility if needed by VoiceParticipant
    audioTrackPublications: lp.audioTrackPublications as any, // Cast to any if direct assignment is problematic, or ensure VoiceParticipant type matches
    room_id: currentRoomId || undefined,
    user_id: isLocal ? localDbUserId : undefined,
    role: isLocal ? localAppRole : undefined,
  };
  if (lp instanceof LocalParticipant) {
    voiceParticipant.isMicrophoneEnabled = lp.isMicrophoneEnabled;
    voiceParticipant.isMuted = !lp.isMicrophoneEnabled;
  }
  return voiceParticipant;
};

interface UseNewVoiceCollaborationReturn {
  availableRooms: VoiceRoom[];
  currentRoomId: string | null;
  participants: VoiceParticipant[];
  localParticipant: VoiceParticipant | null;
  connectionState: ConnectionState | null;
  isConnecting: boolean;
  isConnected: boolean;
  isLoadingRooms: boolean;
  error: Error | null;
  joinRoom: (roomId: string, userId: string, userRole: string, userName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleMuteSelf: () => Promise<boolean | undefined>;
  fetchAvailableRooms: (matchId: string) => Promise<void>;
  moderateMuteParticipant: (targetIdentity: string, mute: boolean) => Promise<boolean>;
}

export const useNewVoiceCollaboration = (): UseNewVoiceCollaborationReturn => {
  const [manager] = useState(() => new NewVoiceChatManager());
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<VoiceParticipant | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Store local user's specific IDs and role
  const [localUserIdentity, setLocalUserIdentity] = useState<string | null>(null);
  const [localUserDbId, setLocalUserDbId] = useState<string | null>(null);
  const [localUserAppRole, setLocalUserAppRole] = useState<string | null>(null);

  useEffect(() => {
    manager.onParticipantsChanged = (newLivekitParticipants: LivekitParticipant[]) => {
      const localLkParticipant = manager.getLocalParticipant();
      const convertedParticipants = newLivekitParticipants.map(lp =>
        livekitParticipantToVoiceParticipant(lp, currentRoomId, localLkParticipant?.identity || null, localUserDbId || undefined, localUserAppRole || undefined)
      );
      setParticipants(convertedParticipants);

      if (localLkParticipant) {
        setLocalParticipant(
          livekitParticipantToVoiceParticipant(localLkParticipant, currentRoomId, localLkParticipant.identity, localUserDbId || undefined, localUserAppRole || undefined)
        );
      } else {
        setLocalParticipant(null);
      }
    };

    manager.onConnectionStateChanged = (state: ConnectionState) => {
      setConnectionState(state);
      setIsConnecting(state === ConnectionState.Connecting);
      
      if (state === ConnectionState.Disconnected) {
        setCurrentRoomId(null);
        setParticipants([]);
        setLocalParticipant(null);
        setLocalUserIdentity(null); // Reset local user info on disconnect
        setLocalUserDbId(null);
        setLocalUserAppRole(null);
      }
    };

    manager.onError = (err: Error) => {
      setError(err);
      setIsConnecting(false);
    };

    return () => {
      manager.dispose();
    };
  }, [manager]);

  const fetchAvailableRooms = useCallback(async (matchId: string) => {
    setIsLoadingRooms(true);
    setError(null);
    try {
      const rooms = await manager.listAvailableRooms(matchId);
      setAvailableRooms(rooms);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [manager]);

  const joinRoom = useCallback(async (roomId: string, userId: string, userRole: string, userName: string) => {
    setIsConnecting(true);
    setError(null);
    // Store userId and userRole for enriching local VoiceParticipant
    setLocalUserIdentity(userId); // Assuming userId from input is the LiveKit identity
    setLocalUserDbId(userId); // Assuming userId from input is also the DB ID
    setLocalUserAppRole(userRole);

    try {
      const success = await manager.joinRoom(roomId, userId, userRole, userName);
      if (success) {
        setCurrentRoomId(roomId);
        // Initial participant update after joining might be handled by onParticipantsChanged
        // Or explicitly fetch and set local participant here
        const localLkParticipant = manager.getLocalParticipant();
        if (localLkParticipant) {
          setLocalParticipant(
            livekitParticipantToVoiceParticipant(localLkParticipant, roomId, userId, userId, userRole)
          );
        }
      } else {
        // If join failed, reset local user info
        setLocalUserIdentity(null);
        setLocalUserDbId(null);
        setLocalUserAppRole(null);
      }
    } catch (err) {
      setError(err as Error);
      setLocalUserIdentity(null);
      setLocalUserDbId(null);
      setLocalUserAppRole(null);
    } finally {
      setIsConnecting(false);
    }
  }, [manager]); // Removed localUserIdentity, localUserDbId, localUserAppRole from deps to avoid re-runs

  const leaveRoom = useCallback(async () => {
    await manager.leaveRoom();
    // State resets are handled in onConnectionStateChanged for Disconnected state
  }, [manager]);

  const toggleMuteSelf = useCallback(async () => {
    return await manager.toggleMuteSelf();
  }, [manager]);

  const moderateMuteParticipant = useCallback(async (targetIdentity: string, mute: boolean) => {
    return await manager.moderateMuteParticipant(targetIdentity, mute);
  }, [manager]);

  const isConnected = connectionState === ConnectionState.Connected;

  return {
    availableRooms,
    currentRoomId,
    participants,
    localParticipant,
    connectionState,
    isConnecting,
    isConnected,
    isLoadingRooms,
    error,
    joinRoom,
    leaveRoom,
    toggleMuteSelf,
    fetchAvailableRooms,
    moderateMuteParticipant,
  };
};
