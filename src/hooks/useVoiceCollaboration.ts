
import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, ConnectionState, Track } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '../lib/database.types';

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

// Define an alias for the Row type
type VoiceRoomRow = Database['public']['Tables']['voice_rooms']['Row'];

// Use a type alias with an intersection type
type VoiceRoom = VoiceRoomRow & {
  participant_count?: number;
};

interface SandboxTokenDetails {
  serverUrl: string;
  token: string;
  roomName: string;
  participantName: string;
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

  const generateSandboxToken = useCallback(async (
    roomNameToJoin?: string,
    participantIdentity?: string
  ): Promise<SandboxTokenDetails> => {
    const sandboxId = import.meta.env.VITE_LIVEKIT_SANDBOX_ID as string;
    if (!sandboxId) {
      throw new Error('VITE_LIVEKIT_SANDBOX_ID is not defined in environment variables.');
    }

    const apiUrl = 'https://cloud-api.livekit.io/api/sandbox/connection-details';

    const payload: { roomName?: string; participantName?: string } = {};
    if (roomNameToJoin) {
      payload.roomName = roomNameToJoin;
    }
    if (participantIdentity) {
      payload.participantName = participantIdentity;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sandbox-ID': sandboxId,
        },
        body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Sandbox API request failed with status ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      if (!data.serverUrl || !data.participantToken || !data.roomName || !data.participantName) {
        throw new Error('Sandbox API response is missing required fields (serverUrl, participantToken, roomName, participantName).');
      }

      return {
          serverUrl: data.serverUrl,
          token: data.participantToken,
          roomName: data.roomName,
          participantName: data.participantName,
      };

    } catch (err) {
      console.error('Error generating sandbox token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate sandbox token';
      throw new Error(errorMessage);
    }
  }, []);

  const connectToRoom = useCallback(async (token: string, wsUrl: string): Promise<Room> => {
    if (!wsUrl) {
      throw new Error('LiveKit server URL was not provided to connectToRoom.');
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
      setRoomName(room.name || 'Unknown Room'); // Use LiveKit's room.name
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

      setParticipants(prev => {
        if (prev.find(p => p.id === newParticipant.id)) return prev;
        const updatedParticipants = [...prev, newParticipant];
        // ADD THIS LOG:
        console.log(`[VoiceCollab] ParticipantConnected: ${newParticipant.name} (ID: ${newParticipant.id}). Remote participants now: ${updatedParticipants.length}. Local user ID: ${userId}`);
        return updatedParticipants;
      });
      onParticipantJoined?.(participant.identity, participant.name || participant.identity);
      toast.success(`${participant.name || participant.identity} joined the voice room`);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('Participant disconnected:', participant.identity);
      setParticipants(prev => {
        const updatedParticipants = prev.filter(p => p.id !== participant.identity);
        // ADD THIS LOG:
        console.log(`[VoiceCollab] ParticipantDisconnected: ${participant.name} (ID: ${participant.identity}). Remote participants now: ${updatedParticipants.length}. Local user ID: ${userId}`);
        return updatedParticipants;
      });
      onParticipantLeft?.(participant.identity);
      toast.info(`${participant.name || participant.identity} left the voice room`);
    });

    room.on(RoomEvent.TrackMuted, (track, participant) => {
      if (track.kind === Track.Kind.Audio) {
        setParticipants(prev => prev.map(p => 
          p.id === participant.identity
            ? { ...p, isAudioEnabled: false, isMuted: true }
            : p
        ));
        if (participant.identity === userId) {
            setIsMuted(true);
        }
      }
    });

    room.on(RoomEvent.TrackUnmuted, (track, participant) => {
      if (track.kind === Track.Kind.Audio) {
        setParticipants(prev => prev.map(p => 
          p.id === participant.identity
            ? { ...p, isAudioEnabled: true, isMuted: false }
            : p
        ));
        if (participant.identity === userId) {
            setIsMuted(false);
        }
      }
    });

    room.on(RoomEvent.LocalTrackPublished, (trackPublication) => {
        if (trackPublication.kind === Track.Kind.Audio && room.localParticipant) {
            const localParticipant = room.localParticipant as any; // Cast to any to check for _events
            // Check if 'audioprocessing' event listener is likely supported/attached by LiveKit internals
            if (localParticipant && typeof localParticipant.on === 'function' && localParticipant._events && localParticipant._events.audioprocessing) {
                 localParticipant.on('audioprocessing', (level: number) => {
                    setAudioLevel(level);
                });
            } else if (trackPublication.track) {
                // This is a more standard way if the track itself emits level events
                // For example: trackPublication.track.on(TrackEvent.AudioLevelChanged, setAudioLevel);
                // console.warn("Audio level monitoring via 'audioprocessing' may not be set up or supported. Consider TrackEvent.AudioLevelChanged.");
            }
        }
    });

    room.on(RoomEvent.MediaDevicesError, (err: Error) => {
        console.error('Media devices error:', err);
        let detailedMessage = `Media device error: ${err.message}.`;
        if (err.name === 'NotAllowedError') {
            detailedMessage += ' Please ensure microphone/camera permissions are granted for this site in your browser settings.';
        } else if (err.name === 'NotFoundError') {
            detailedMessage += ' No microphone/camera found. Please ensure a device is connected and enabled.';
        } else {
            detailedMessage += ' Check your microphone/camera connection and browser permissions.';
        }
        toast.error(detailedMessage);
        // If onError prop is used for this, consider passing detailedMessage to it too.
        // onError?.(detailedMessage);
    });

    await room.connect(wsUrl, token);
    return room;
  }, [userId, onParticipantJoined, onParticipantLeft, updateConnectionState]);
  // State setters like setRoomName, setParticipants, setCurrentUser, setIsMuted, setAudioLevel are stable and don't need to be deps.

  const joinRoom = useCallback(async (): Promise<void> => {
    if (isConnecting || isConnected) {
      console.log('Already connecting or connected to room');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      let token: string;
      let serverUrl: string;
      let actualRoomName = currentRoom?.name;
      let actualParticipantName = userName;

      const useSandbox = import.meta.env.VITE_LIVEKIT_USE_SANDBOX_TOKEN === 'true';

      if (useSandbox) {
        console.log('Using LiveKit Sandbox Token Generation');
        const sandboxDetails = await generateSandboxToken(currentRoom?.name, userName);
        token = sandboxDetails.token;
        serverUrl = sandboxDetails.serverUrl;
        actualRoomName = sandboxDetails.roomName;
        actualParticipantName = sandboxDetails.participantName;

        if (currentRoom && currentRoom.name !== sandboxDetails.roomName) {
            console.warn(`Sandbox returned a different room name: '${sandboxDetails.roomName}' vs requested '${currentRoom.name}'. Using sandbox name.`);
        }
        if (!currentRoom) {
             console.log(`Joining a new sandbox-generated room: ${sandboxDetails.roomName}`);
        }
        setRoomName(sandboxDetails.roomName);

      } else {
        console.log('Using Supabase Function for Token Generation');
        token = await generateToken();
        serverUrl = import.meta.env.VITE_LIVEKIT_URL as string;
        if (!serverUrl) {
          throw new Error('VITE_LIVEKIT_URL is not defined for non-sandbox connection.');
        }
        if (!serverUrl) {
          throw new Error('VITE_LIVEKIT_URL is not defined for non-sandbox connection.');
        }
        if (!currentRoom?.id) { // Check for id for Supabase token
          console.warn(
            "CRITICAL: Joining room without sandbox mode and NO 'currentRoom.id'. " +
            "Token will be for 'default-room'. This may lead to permission issues " +
            "for microphone/camera and participant visibility if 'default-room' has restricted permissions."
          );
          toast.warn("Joining with default room settings. Specific room features/permissions may be limited.");
          setRoomName("default-room"); // Keep this
        } else if (currentRoom.name) { // Existing logic if currentRoom.id IS present
           setRoomName(currentRoom.name);
        } else {
           // If currentRoom.id is present but currentRoom.name is not, still use default or a generated name.
           // This case should ideally not happen if currentRoom is well-formed.
           setRoomName(`room-${currentRoom.id}`);
        }
      }
      
      console.log(`Attempting to join room: '${actualRoomName || 'N/A'}' at server: '${serverUrl}'`);
      // connectToRoom will be updated in the next step to accept serverUrl
      const room = await connectToRoom(token, serverUrl);
      
      roomRef.current = room;

      await room.localParticipant.enableCameraAndMicrophone();
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);

      const localUser: Participant = {
        id: userId,
        name: actualParticipantName,
        isSpeaking: false,
        isAudioEnabled: true,
        isMuted: false,
        joinedAt: new Date()
      };
      setCurrentUser(localUser);
      // ADD THIS LOG:
      console.log(`[VoiceCollab] Local user joined: ${localUser.name} (ID: ${localUser.id}). Initial remote participants: ${participants.length}`);

      console.log('Successfully joined voice room');
      toast.success(`Connected to voice room: ${actualRoomName}`);

    } catch (err) {
      console.error('Failed to join room:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join voice room';
      setError(errorMessage);
      onError?.(errorMessage);
      toast.error(`Failed to join voice room: ${errorMessage.substring(0, 100)}`);
      
      setIsConnecting(false);
      setIsConnected(false);
      updateConnectionState(ConnectionState.Disconnected);
    }
  }, [
    isConnecting,
    isConnected,
    currentRoom,
    userId,
    userName,
    generateToken,
    generateSandboxToken,
    connectToRoom,
    onError,
    updateConnectionState,
    // State setters like setCurrentUser, setIsMuted, setRoomName, setError, setIsConnecting are stable
  ]);

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
