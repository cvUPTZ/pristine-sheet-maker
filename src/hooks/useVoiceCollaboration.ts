import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, ConnectionState, Track } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceCollaborationProps {
  roomId: string;
  userId: string;
  userName?: string;
  onParticipantJoined?: (participantId: string, participantName: string) => void;
  onParticipantLeft?: (participantId: string) => void;
  onError?: (error: string) => void;
}

interface Participant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isAudioEnabled: boolean;
  joinedAt: Date;
}

interface UseVoiceCollaborationReturn {
  isConnected: boolean;
  isConnecting: boolean;
  participants: Participant[];
  currentUser: Participant | null;
  error: string | null;
  joinRoom: () => Promise<void>;
  leaveRoom: () => void;
  toggleMute: () => Promise<void>;
  isMuted: boolean;
  connectionState: string;
  roomName: string;
}

export const useVoiceCollaboration = ({
  roomId,
  userId,
  userName = 'Unknown User',
  onParticipantJoined,
  onParticipantLeft,
  onError
}: VoiceCollaborationProps): UseVoiceCollaborationReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [roomName, setRoomName] = useState('');

  const roomRef = useRef<Room | null>(null);
  const tokenRef = useRef<string | null>(null);

  const updateConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state.toString().toLowerCase());
    
    switch (state) {
      case ConnectionState.Connected:
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        break;
      case ConnectionState.Connecting:
        setIsConnecting(true);
        setIsConnected(false);
        break;
      case ConnectionState.Disconnected:
        setIsConnected(false);
        setIsConnecting(false);
        break;
      case ConnectionState.Reconnecting:
        setIsConnecting(true);
        break;
    }
  }, []);

  const generateToken = useCallback(async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-livekit-token', {
        body: {
          roomId,
          participantIdentity: userId,
          participantName: userName
        }
      });

      if (error) {
        console.error('Error calling token generation function:', error);
        throw new Error(`Token generation failed: ${error.message}`);
      }

      if (!data || !data.token) {
        throw new Error('No token received from server');
      }

      tokenRef.current = data.token;
      return data.token;
    } catch (err) {
      console.error('Token generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate access token';
      throw new Error(errorMessage);
    }
  }, [roomId, userId, userName]);

  const connectToRoom = useCallback(async (token: string): Promise<Room> => {
    const wsUrl = import.meta.env.VITE_LIVEKIT_URL;
    if (!wsUrl) {
      throw new Error('LiveKit URL not configured. Please set VITE_LIVEKIT_URL environment variable.');
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: false,
      },
    });

    room.on(RoomEvent.Connected, () => {
      console.log('Room connected successfully');
      setRoomName(room.name || roomId);
      updateConnectionState(ConnectionState.Connected);
    });

    room.on(RoomEvent.Disconnected, (reason) => {
      console.log('Room disconnected:', reason);
      updateConnectionState(ConnectionState.Disconnected);
      setParticipants([]);
      setCurrentUser(null);
    });

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log('Connection state changed:', state);
      updateConnectionState(state);
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('Participant connected:', participant.identity, participant.name);
      
      const newParticipant: Participant = {
        id: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: false,
        isAudioEnabled: participant.isMicrophoneEnabled,
        joinedAt: new Date()
      };

      setParticipants(prev => [...prev, newParticipant]);
      onParticipantJoined?.(participant.identity, participant.name || participant.identity);
      toast.success(`${participant.name || participant.identity} joined the voice room`);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('Participant disconnected:', participant.identity);
      setParticipants(prev => prev.filter(p => p.id !== participant.identity));
      onParticipantLeft?.(participant.identity);
      toast.info(`${participant.name || participant.identity} left the voice room`);
    });

    room.on(RoomEvent.TrackMuted, (track, participant) => {
      if (track.kind === Track.Kind.Audio) {
        if (participant?.identity === userId) {
          setIsMuted(true);
        }
        setParticipants(prev => prev.map(p => 
          p.id === participant?.identity 
            ? { ...p, isAudioEnabled: false }
            : p
        ));
      }
    });

    room.on(RoomEvent.TrackUnmuted, (track, participant) => {
      if (track.kind === Track.Kind.Audio) {
        if (participant?.identity === userId) {
          setIsMuted(false);
        }
        setParticipants(prev => prev.map(p => 
          p.id === participant?.identity 
            ? { ...p, isAudioEnabled: true }
            : p
        ));
      }
    });

    await room.connect(wsUrl, token);
    return room;
  }, [roomId, userId, onParticipantJoined, onParticipantLeft, updateConnectionState]);

  const joinRoom = useCallback(async (): Promise<void> => {
    if (isConnecting || isConnected) {
      console.log('Already connecting or connected to room');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      console.log('Joining voice room:', roomId);
      
      const token = await generateToken();
      const room = await connectToRoom(token);
      
      roomRef.current = room;

      await room.localParticipant.enableCameraAndMicrophone();
      await room.localParticipant.setMicrophoneEnabled(true);

      const localUser: Participant = {
        id: userId,
        name: userName,
        isSpeaking: false,
        isAudioEnabled: true,
        joinedAt: new Date()
      };

      setCurrentUser(localUser);
      setIsMuted(false);

      console.log('Successfully joined voice room');
      toast.success('Connected to voice room');

    } catch (err) {
      console.error('Failed to join room:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join voice room';
      setError(errorMessage);
      onError?.(errorMessage);
      toast.error(`Failed to join voice room: ${errorMessage}`);
      
      setIsConnecting(false);
      setIsConnected(false);
      updateConnectionState(ConnectionState.Disconnected);
    }
  }, [isConnecting, isConnected, roomId, userId, userName, generateToken, connectToRoom, onError, updateConnectionState]);

  const leaveRoom = useCallback((): void => {
    console.log('Leaving voice room');
    
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setParticipants([]);
    setCurrentUser(null);
    setError(null);
    setIsMuted(false);
    updateConnectionState(ConnectionState.Disconnected);
    
    toast.info('Disconnected from voice room');
  }, [updateConnectionState]);

  const toggleMute = useCallback(async (): Promise<void> => {
    if (!roomRef.current?.localParticipant) {
      console.warn('No local participant available for mute toggle');
      return;
    }

    try {
      const newMutedState = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
      setIsMuted(newMutedState);
      
      console.log(`Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
      toast.info(`Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
    } catch (err) {
      console.error('Failed to toggle mute:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle mute';
      toast.error(`Failed to toggle mute: ${errorMessage}`);
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        console.log('Cleaning up room connection');
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    participants,
    currentUser,
    error,
    joinRoom,
    leaveRoom,
    toggleMute,
    isMuted,
    connectionState,
    roomName
  };
};
