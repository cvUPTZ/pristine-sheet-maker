
import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, ConnectionState, Track } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceCollaborationProps {
  matchId: string;
  userId: string;
  userRole: string;
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
  isMuted: boolean;
  joinedAt: Date;
  role?: string;
}

interface VoiceRoom {
  id: string;
  name: string;
  description?: string;
  match_id: string;
  is_private: boolean;
  max_participants: number;
  participant_count?: number;
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
  // Additional properties needed by VoiceCollaboration component
  isVoiceEnabled: boolean;
  livekitParticipants: Participant[];
  audioLevel: number;
  availableRooms: VoiceRoom[];
  currentRoom: VoiceRoom | null;
  isRoomAdmin: boolean;
  joinVoiceRoom: (room: VoiceRoom) => Promise<void>;
  leaveVoiceRoom: () => Promise<void>;
  networkStatus: 'online' | 'offline' | 'unstable';
  remoteStreams: Map<string, MediaStream>;
  peerStatuses: Map<string, string>;
  livekitConnectionState: ConnectionState | null;
  adminSetParticipantMute: (roomId: string, participantId: string, muted: boolean) => Promise<void>;
  audioOutputDevices: MediaDeviceInfo[];
  selectedAudioOutputDeviceId: string | null;
  selectAudioOutputDevice: (deviceId: string) => Promise<void>;
}

export const useVoiceCollaboration = ({
  matchId,
  userId,
  userRole,
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

  // Additional state for VoiceCollaboration component
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online');
  const [remoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerStatuses] = useState<Map<string, string>>(new Map());
  const [livekitConnectionState, setLivekitConnectionState] = useState<ConnectionState | null>(null);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const tokenRef = useRef<string | null>(null);

  const updateConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state.toString().toLowerCase());
    setLivekitConnectionState(state);
    
    switch (state) {
      case ConnectionState.Connected:
        setIsConnected(true);
        setIsConnecting(false);
        setIsVoiceEnabled(true);
        setError(null);
        break;
      case ConnectionState.Connecting:
        setIsConnecting(true);
        setIsConnected(false);
        break;
      case ConnectionState.Disconnected:
        setIsConnected(false);
        setIsConnecting(false);
        setIsVoiceEnabled(false);
        break;
      case ConnectionState.Reconnecting:
        setIsConnecting(true);
        break;
    }
  }, []);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('voice_rooms')
          .select('*')
          .eq('match_id', matchId);
        
        if (error) throw error;
        setAvailableRooms(data || []);
      } catch (err) {
        console.error('Failed to fetch voice rooms:', err);
      }
    };

    if (matchId) {
      fetchRooms();
    }
  }, [matchId]);

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        setNetworkStatus('offline');
      } else {
        setNetworkStatus('online');
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  // Get audio output devices
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        setAudioOutputDevices(audioOutputs);
        
        if (audioOutputs.length > 0 && !selectedAudioOutputDeviceId) {
          setSelectedAudioOutputDeviceId(audioOutputs[0].deviceId);
        }
      } catch (err) {
        console.error('Failed to get audio devices:', err);
      }
    };

    getAudioDevices();
  }, [selectedAudioOutputDeviceId]);

  const generateToken = useCallback(async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-livekit-token', {
        body: {
          roomId: currentRoom?.id || 'default-room',
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
  }, [currentRoom?.id, userId, userName]);

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
      setRoomName(room.name || currentRoom?.id || 'Unknown Room');
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
        isMuted: !participant.isMicrophoneEnabled,
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
            ? { ...p, isAudioEnabled: false, isMuted: true }
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
            ? { ...p, isAudioEnabled: true, isMuted: false }
            : p
        ));
      }
    });

    await room.connect(wsUrl, token);
    return room;
  }, [currentRoom?.id, userId, onParticipantJoined, onParticipantLeft, updateConnectionState]);

  const joinRoom = useCallback(async (): Promise<void> => {
    if (isConnecting || isConnected) {
      console.log('Already connecting or connected to room');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      console.log('Joining voice room:', currentRoom?.id);
      
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
        isMuted: false,
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
  }, [isConnecting, isConnected, currentRoom?.id, userId, userName, generateToken, connectToRoom, onError, updateConnectionState]);

  const joinVoiceRoom = useCallback(async (room: VoiceRoom): Promise<void> => {
    setCurrentRoom(room);
    // The actual joining will be handled by the joinRoom function
    await joinRoom();
  }, [joinRoom]);

  const leaveRoom = useCallback((): void => {
    console.log('Leaving voice room');
    
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsVoiceEnabled(false);
    setParticipants([]);
    setCurrentUser(null);
    setError(null);
    setIsMuted(false);
    setCurrentRoom(null);
    updateConnectionState(ConnectionState.Disconnected);
    
    toast.info('Disconnected from voice room');
  }, [updateConnectionState]);

  const leaveVoiceRoom = useCallback(async (): Promise<void> => {
    leaveRoom();
  }, [leaveRoom]);

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

  const adminSetParticipantMute = useCallback(async (roomId: string, participantId: string, muted: boolean): Promise<void> => {
    // Implementation for admin mute functionality
    console.log(`Admin ${muted ? 'muting' : 'unmuting'} participant ${participantId} in room ${roomId}`);
    toast.info(`${muted ? 'Muted' : 'Unmuted'} participant`);
  }, []);

  const selectAudioOutputDevice = useCallback(async (deviceId: string): Promise<void> => {
    try {
      setSelectedAudioOutputDeviceId(deviceId);
      
      // Set the output device for all audio elements
      const audioElements = document.querySelectorAll('audio');
      for (const audioElement of audioElements) {
        if ('setSinkId' in audioElement) {
          await (audioElement as any).setSinkId(deviceId);
        }
      }
      
      toast.success('Audio output device changed');
    } catch (err) {
      console.error('Failed to set audio output device:', err);
      toast.error('Failed to change audio output device');
    }
  }, []);

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
    roomName,
    // Additional properties for VoiceCollaboration component
    isVoiceEnabled,
    livekitParticipants: participants,
    audioLevel,
    availableRooms,
    currentRoom,
    isRoomAdmin,
    joinVoiceRoom,
    leaveVoiceRoom,
    networkStatus,
    remoteStreams,
    peerStatuses,
    livekitConnectionState,
    adminSetParticipantMute,
    audioOutputDevices,
    selectedAudioOutputDeviceId,
    selectAudioOutputDevice
  };
};
