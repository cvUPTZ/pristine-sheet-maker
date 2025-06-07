import { useState, useEffect, useCallback, useMemo } from 'react';
import { NewVoiceChatManager } from '@/services/NewVoiceChatManager'; // Adjust path as needed
import { Participant, ConnectionState, Room } from 'livekit-client'; // Import LiveKit types

// Define interface for room details if not already globally available
// This should match or be compatible with VoiceRoomDetails from NewVoiceChatManager
interface UIVoiceRoom {
  id: string;
  name: string;
  // Add any other fields you expect from listAvailableRooms that are relevant to the UI
}

export interface UseNewVoiceCollaborationReturn {
  manager: NewVoiceChatManager | null; // Expose manager for advanced use cases if needed
  availableRooms: UIVoiceRoom[];
  currentRoomId: string | null;
  participants: Participant[];
  localParticipant: Participant | null;
  connectionState: ConnectionState | null;
  isConnecting: boolean;
  isConnected: boolean;
  isLoadingRooms: boolean;
  error: Error | null;
  joinRoom: (roomId: string, userId: string, userRole: string, participantName?: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  toggleMuteSelf: () => Promise<boolean | undefined>;
  fetchAvailableRooms: (matchId: string) => Promise<void>;
  // Add other wrapped methods from the manager as needed e.g., for moderation
  moderateMuteParticipant: (targetIdentity: string, mute: boolean) => Promise<boolean>;
}

export const useNewVoiceCollaboration = (): UseNewVoiceCollaborationReturn => {
  const [manager, setManager] = useState<NewVoiceChatManager | null>(null);
  const [availableRooms, setAvailableRooms] = useState<UIVoiceRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<Participant | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(false);

  // Instantiate the manager once
  useEffect(() => {
    const voiceManager = new NewVoiceChatManager();
    setManager(voiceManager);

    // Setup callbacks
    voiceManager.onParticipantsChanged = (newParticipants) => {
      setParticipants(newParticipants);
      setLocalParticipant(voiceManager.getLocalParticipant()); // Keep local participant updated
    };
    voiceManager.onConnectionStateChanged = (newState) => {
      setConnectionState(newState);
      setCurrentRoomId(voiceManager.getCurrentRoomId()); // Update currentRoomId based on manager's state
      if (newState === ConnectionState.Connected) {
        setError(null); // Clear error on successful connection
      }
    };
    voiceManager.onError = (newError) => {
      console.error('Error from NewVoiceChatManager in hook:', newError);
      setError(newError);
    };

    // Cleanup on unmount
    return () => {
      voiceManager.dispose();
      setManager(null);
    };
  }, []);

  const fetchAvailableRooms = useCallback(async (matchId: string) => {
    if (!manager) return;
    setIsLoadingRooms(true);
    setError(null);
    try {
      const rooms = await manager.listAvailableRooms(matchId);
      // Map to UIVoiceRoom if needed, assuming VoiceRoomDetails is compatible
      setAvailableRooms(rooms.map(r => ({ id: r.id, name: r.name })));
    } catch (e) {
      setError(e as Error);
      setAvailableRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [manager]);

  const joinRoom = useCallback(async (roomId: string, userId: string, userRole: string, participantName?: string): Promise<boolean> => {
    if (!manager) {
      setError(new Error("Voice chat manager not initialized."));
      return false;
    }
    setError(null);
    const success = await manager.joinRoom(roomId, userId, userRole, participantName);
    if (success) {
      setCurrentRoomId(roomId);
      setLocalParticipant(manager.getLocalParticipant());
    } else {
       // Error should be set by the manager's onError callback
    }
    return success;
  }, [manager]);

  const leaveRoom = useCallback(async () => {
    if (!manager) return;
    setError(null);
    await manager.leaveRoom();
    setCurrentRoomId(null);
    setParticipants([]);
    setLocalParticipant(null);
    // Connection state should be updated by manager's callback
  }, [manager]);

  const toggleMuteSelf = useCallback(async (): Promise<boolean | undefined> => {
    if (!manager) return undefined;
    return await manager.toggleMuteSelf();
    // Participant state (isMuted) should update via LiveKit events triggering onParticipantsChanged
  }, [manager]);

  const moderateMuteParticipant = useCallback(async (targetIdentity: string, mute: boolean): Promise<boolean> => {
    if (!manager) {
        setError(new Error("Voice chat manager not initialized."));
        return false;
    }
    return await manager.moderateMuteParticipant(targetIdentity, mute);
  }, [manager]);

  const isConnecting = useMemo(() => connectionState === ConnectionState.Connecting, [connectionState]);
  const isConnected = useMemo(() => connectionState === ConnectionState.Connected, [connectionState]);

  return {
    manager, // Exposing manager might be useful for direct access in some complex components
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
