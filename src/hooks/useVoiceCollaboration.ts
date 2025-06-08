import { useState, useCallback, useRef } from 'react';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCollaborationOptions {
  userId: string;
  userRole: string;
}

/**
 * This hook manages the state required to connect to a voice room.
 * It is responsible for fetching available rooms and getting the token/URL
 * from a Supabase function. It does NOT use any LiveKit hooks itself.
 */
export function useVoiceCollaboration({ userId, userRole }: VoiceCollaborationOptions) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);

  const voiceService = useRef(VoiceRoomService.getInstance());

  const fetchAvailableRooms = useCallback(async (matchId: string) => {
    try {
      const rooms = await voiceService.current.getRoomsForMatch(matchId);
      setAvailableRooms(rooms);
    } catch (err: any) {
      console.error('Error fetching voice rooms:', err);
      setError(`Failed to fetch rooms: ${err.message}`);
    }
  }, []);

  const joinVoiceRoom = useCallback(
    async (room: VoiceRoom) => {
      if (isConnecting) return;
      setIsConnecting(true);
      setError(null);
      try {
        const { data, error: tokenError } = await supabase.functions.invoke('get-livekit-token', {
          body: { roomId: room.id, userId, userName: `User ${userId.substring(0, 4)}`, userRole },
        });
        if (tokenError || !data?.token) {
          throw new Error(tokenError?.message || 'Failed to get LiveKit token');
        }
        setCurrentRoom(room);
        setServerUrl(data.serverUrl);
        setToken(data.token);
      } catch (err: any) {
        console.error('Error joining voice room:', err);
        setError(err.message);
      } finally {
        setIsConnecting(false);
      }
    },
    [userId, userRole, isConnecting]
  );

  const leaveVoiceRoom = useCallback(() => {
    setToken(null);
    setServerUrl(null);
    setCurrentRoom(null);
  }, []);

  return {
    token,
    serverUrl,
    isConnecting,
    error,
    availableRooms,
    currentRoom,
    fetchAvailableRooms,
    joinVoiceRoom,
    leaveVoiceRoom,
  };
}