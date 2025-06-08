
import { useState, useEffect, useCallback } from 'react';
import { NewVoiceChatManager } from '@/services/NewVoiceChatManager';
import { Participant, ConnectionState } from 'livekit-client';

interface VoiceRoomDetails {
  id: string;
  name: string;
  max_participants?: number;
}

interface UseNewVoiceCollaborationReturn {
  availableRooms: VoiceRoomDetails[];
  currentRoomId: string | null;
  participants: Participant[];
  localParticipant: Participant | null;
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
  const [availableRooms, setAvailableRooms] = useState<VoiceRoomDetails[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<Participant | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    manager.onParticipantsChanged = (newParticipants: Participant[]) => {
      setParticipants(newParticipants);
      setLocalParticipant(manager.getLocalParticipant());
    };

    manager.onConnectionStateChanged = (state: ConnectionState) => {
      setConnectionState(state);
      setIsConnecting(state === ConnectionState.Connecting);
      
      if (state === ConnectionState.Disconnected) {
        setCurrentRoomId(null);
        setParticipants([]);
        setLocalParticipant(null);
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
    try {
      const success = await manager.joinRoom(roomId, userId, userRole, userName);
      if (success) {
        setCurrentRoomId(roomId);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsConnecting(false);
    }
  }, [manager]);

  const leaveRoom = useCallback(async () => {
    await manager.leaveRoom();
    setCurrentRoomId(null);
    setParticipants([]);
    setLocalParticipant(null);
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
