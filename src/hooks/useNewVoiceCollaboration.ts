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
  audioLevels: Map<string, number>;
  joinRoom: (roomId: string, userId: string, userRole: string, userName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleMuteSelf: () => Promise<boolean | undefined>;
  fetchAvailableRooms: (matchId: string) => Promise<void>;
  moderateMuteParticipant: (targetIdentity: string, mute: boolean) => Promise<boolean>;
  getAudioLevel: (participantId: string) => number;
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
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    manager.onParticipantsChanged = (newParticipants: Participant[]) => {
      console.log('[useNewVoiceCollaboration] Participants updated:', newParticipants.length);
      // Always provide new object refs for participants
      // Shallow copy each participant object
      const cloned = newParticipants.map(p =>
        Object.assign(
          Object.create(Object.getPrototypeOf(p)),
          p
        )
      );
      setParticipants(cloned);
      setLocalParticipant(manager.getLocalParticipant()
        ? Object.assign(
            Object.create(Object.getPrototypeOf(manager.getLocalParticipant()!)),
            manager.getLocalParticipant()!
          )
        : null
      );
    };

    manager.onConnectionStateChanged = (state: ConnectionState) => {
      console.log('[useNewVoiceCollaboration] Connection state changed:', state);
      setConnectionState(state);
      setIsConnecting(state === ConnectionState.Connecting);
      
      if (state === ConnectionState.Disconnected) {
        setCurrentRoomId(null);
        setParticipants([]);
        setLocalParticipant(null);
        setAudioLevels(new Map());
      }
    };

    manager.onError = (err: Error) => {
      console.error('[useNewVoiceCollaboration] Error:', err);
      setError(err);
      setIsConnecting(false);
    };

    manager.onAudioLevelChanged = (participantId: string, level: number) => {
      setAudioLevels(prev => {
        const newMap = new Map(prev);
        newMap.set(participantId, level);
        return newMap;
      });
    };

    return () => {
      manager.dispose();
    };
  }, [manager]);

  const fetchAvailableRooms = useCallback(async (matchId: string) => {
    setIsLoadingRooms(true);
    setError(null);
    try {
      console.log('[useNewVoiceCollaboration] Fetching rooms for match:', matchId);
      const rooms = await manager.listAvailableRooms(matchId);
      console.log('[useNewVoiceCollaboration] Found rooms:', rooms.length);
      setAvailableRooms(rooms);
    } catch (err) {
      console.error('[useNewVoiceCollaboration] Error fetching rooms:', err);
      setError(err as Error);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [manager]);

  const joinRoom = useCallback(async (roomId: string, userId: string, userRole: string, userName: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      console.log('[useNewVoiceCollaboration] Joining room:', roomId);
      const success = await manager.joinRoom(roomId, userId, userRole, userName);
      if (success) {
        setCurrentRoomId(roomId);
        console.log('[useNewVoiceCollaboration] Successfully joined room');
      } else {
        throw new Error('Failed to join room');
      }
    } catch (err) {
      console.error('[useNewVoiceCollaboration] Error joining room:', err);
      setError(err as Error);
    } finally {
      setIsConnecting(false);
    }
  }, [manager]);

  const leaveRoom = useCallback(async () => {
    console.log('[useNewVoiceCollaboration] Leaving room');
    await manager.leaveRoom();
    setCurrentRoomId(null);
    setParticipants([]);
    setLocalParticipant(null);
    setAudioLevels(new Map());
  }, [manager]);

  const toggleMuteSelf = useCallback(async () => {
    console.log('[useNewVoiceCollaboration] Toggling mute');
    return await manager.toggleMuteSelf();
  }, [manager]);

  const moderateMuteParticipant = useCallback(async (targetIdentity: string, mute: boolean) => {
    console.log('[useNewVoiceCollaboration] Moderating participant:', targetIdentity, 'mute:', mute);
    return await manager.moderateMuteParticipant(targetIdentity, mute);
  }, [manager]);

  const getAudioLevel = useCallback((participantId: string): number => {
    return manager.getAudioLevel(participantId);
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
    audioLevels,
    joinRoom,
    leaveRoom,
    toggleMuteSelf,
    fetchAvailableRooms,
    moderateMuteParticipant,
    getAudioLevel,
  };
};
