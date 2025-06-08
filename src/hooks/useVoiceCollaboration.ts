import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCollaborationOptions {
  userId: string;
  userRole: string;
}

/**
 * This hook is now a "connection manager". It is responsible for fetching
 * available rooms and getting the token required to connect to LiveKit.
 * It does NOT use any hooks from '@livekit/components-react' and can be
 * used anywhere in your application without a <LiveKitRoom> context.
 */
export function useVoiceCollaboration({ userId, userRole }: VoiceCollaborationOptions) {
  // State to hold the credentials for the <LiveKitRoom> component
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  // UI and application logic state
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
        setToken(data.token); // Setting the token will trigger the UI to render <LiveKitRoom>
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
    // Clearing the token will cause the UI to unmount <LiveKitRoom>, disconnecting cleanly.
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