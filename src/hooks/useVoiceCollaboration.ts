
import { useCallback, useEffect, useState, useRef } from 'react';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { LiveKitService } from '@/services/LiveKitService';
import { AudioLevelMonitor } from '@/services/AudioLevelMonitor';
import { supabase } from '@/integrations/supabase/client';
import { Participant, ConnectionState, LocalParticipant, RemoteParticipant, RemoteTrack, RemoteTrackPublication } from 'livekit-client';

interface VoiceParticipant {
  id: string;
  name?: string;
  role?: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
}

interface AudioManager {
  getAudioOutputDevices: () => Promise<MediaDeviceInfo[]>;
  setAudioOutputDevice: (deviceId: string) => Promise<boolean>;
}

interface VoiceCollaborationOptions {
  matchId: string;
  userId: string;
  userRole: string;
}

export function useVoiceCollaboration({
  matchId,
  userId,
  userRole,
}: VoiceCollaborationOptions) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online');
  const [remoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerStatuses] = useState<Map<string, RTCPeerConnectionState>>(new Map());
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed' | 'authorizing' | 'disconnecting'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map());
  
  const liveKitService = useRef<LiveKitService>(new LiveKitService());
  const audioMonitor = useRef<AudioLevelMonitor | null>(null);
  const voiceService = useRef<VoiceRoomService>(VoiceRoomService.getInstance());
  const participantAudioMonitors = useRef<Map<string, AudioLevelMonitor>>(new Map());

  // If matchId is not provided, return a disabled state immediately.
  if (!matchId) {
    return {
      isVoiceEnabled: false,
      isMuted: false,
      isConnecting: false,
      participants: [],
      audioLevel: 0,
      toggleMute: () => console.warn('Collaboration disabled: No matchId provided.'),
      availableRooms: [],
      currentRoom: null,
      isRoomAdmin: false,
      joinVoiceRoom: () => Promise.resolve(false),
      leaveVoiceRoom: () => Promise.resolve(),
      networkStatus: 'offline' as const,
      remoteStreams,
      peerStatuses,
      connectionState: 'disconnected' as const,
      adminSetParticipantMute: () => false,
      audioOutputDevices: [],
      selectedAudioOutputDeviceId: null,
      selectAudioOutputDevice: () => Promise.resolve(),
      error: null,
      fetchAvailableRooms: () => Promise.resolve([]),
    };
  }

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        const connectionQuality = Math.random() > 0.9 ? 'unstable' : 'online';
        setNetworkStatus(connectionQuality);
      } else {
        setNetworkStatus('offline');
      }
    }, 10000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  // Setup LiveKit event handlers
  useEffect(() => {
    const service = liveKitService.current;

    service.onParticipantConnected = (participant: RemoteParticipant) => {
      console.log('[useVoiceCollaboration] Participant connected:', participant.identity);
      updateParticipantsList();
      setupParticipantAudioMonitoring(participant);
    };

    service.onParticipantDisconnected = (participant: RemoteParticipant) => {
      console.log('[useVoiceCollaboration] Participant disconnected:', participant.identity);
      cleanupParticipantAudioMonitoring(participant.identity);
      updateParticipantsList();
    };

    service.onConnectionStateChanged = (state: ConnectionState) => {
      console.log('[useVoiceCollaboration] Connection state changed:', state);
      
      switch (state) {
        case ConnectionState.Connecting:
          setConnectionState('connecting');
          break;
        case ConnectionState.Connected:
          setConnectionState('connected');
          setIsVoiceEnabled(true);
          break;
        case ConnectionState.Disconnected:
          setConnectionState('disconnected');
          setIsVoiceEnabled(false);
          setCurrentRoom(null);
          break;
        case ConnectionState.Reconnecting:
          setConnectionState('connecting');
          break;
        default:
          setConnectionState('failed');
      }
    };

    service.onTrackSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (track.kind === 'audio') {
        setupParticipantAudioMonitoring(participant);
      }
    };

    service.onError = (err: Error) => {
      console.error('[useVoiceCollaboration] Error:', err);
      setError(err.message);
      setConnectionState('failed');
    };

    return () => {
      service.disconnect();
      cleanupAllAudioMonitoring();
    };
  }, []);

  const setupParticipantAudioMonitoring = (participant: RemoteParticipant) => {
    const audioTracks = Array.from(participant.audioTrackPublications.values());
    
    audioTracks.forEach(publication => {
      if (publication.track && publication.track instanceof MediaStreamTrack) {
        const stream = new MediaStream([publication.track]);
        const monitor = new AudioLevelMonitor((level) => {
          setAudioLevels(prev => {
            const newMap = new Map(prev);
            newMap.set(participant.identity, level);
            return newMap;
          });
        });

        monitor.startMonitoring(stream).catch(console.error);
        participantAudioMonitors.current.set(participant.identity, monitor);
      }
    });
  };

  const cleanupParticipantAudioMonitoring = (participantId: string) => {
    const monitor = participantAudioMonitors.current.get(participantId);
    if (monitor) {
      monitor.stopMonitoring();
      participantAudioMonitors.current.delete(participantId);
    }
    
    setAudioLevels(prev => {
      const newMap = new Map(prev);
      newMap.delete(participantId);
      return newMap;
    });
  };

  const cleanupAllAudioMonitoring = () => {
    participantAudioMonitors.current.forEach(monitor => monitor.stopMonitoring());
    participantAudioMonitors.current.clear();
    
    if (audioMonitor.current) {
      audioMonitor.current.stopMonitoring();
      audioMonitor.current = null;
    }
    
    setAudioLevels(new Map());
  };

  const updateParticipantsList = () => {
    const allParticipants = liveKitService.current.getParticipants();
    const localParticipant = liveKitService.current.getLocalParticipant();
    
    const voiceParticipants: VoiceParticipant[] = allParticipants.map(p => {
      const isLocal = p === localParticipant;
      const audioLevel = audioLevels.get(p.identity) || 0;
      
      let isMuted = false;
      if (isLocal && localParticipant) {
        isMuted = !(localParticipant as LocalParticipant).isMicrophoneEnabled;
      } else {
        // Check remote participant's audio tracks
        const audioTracks = Array.from(p.audioTrackPublications.values());
        isMuted = audioTracks.length === 0 || audioTracks.some(pub => pub.isMuted);
      }

      return {
        id: p.identity,
        name: p.name || p.identity,
        role: userRole, // In a real implementation, this would come from participant metadata
        isMuted,
        isSpeaking: audioLevel > 0.1 && !isMuted,
        isLocal,
      };
    });

    setParticipants(voiceParticipants);
  };

  // Update participants list when audio levels change
  useEffect(() => {
    updateParticipantsList();
  }, [audioLevels, userRole]);

  // Setup local audio monitoring
  const setupLocalAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioMonitor.current = new AudioLevelMonitor((level) => {
        setAudioLevel(level);
        setAudioLevels(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, level);
          return newMap;
        });
      });
      
      await audioMonitor.current.startMonitoring(stream);
    } catch (err) {
      console.error('Failed to setup local audio monitoring:', err);
    }
  };

  // Fetch available rooms
  const fetchAvailableRooms = useCallback(async (matchId: string) => {
    try {
      const rooms = await voiceService.current.getRoomsForMatch(matchId);
      setAvailableRooms(rooms);
      return rooms;
    } catch (err: any) {
      console.error('Error fetching voice rooms:', err);
      setError(`Failed to fetch voice rooms: ${err.message}`);
      return [];
    }
  }, []);

  // Initialize on component mount
  useEffect(() => {
    if (matchId) {
      fetchAvailableRooms(matchId);
    }
    
    const initAudioDevices = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const outputDevices = devices.filter(device => device.kind === 'audiooutput');
          setAudioOutputDevices(outputDevices);
          
          if (outputDevices.length > 0 && !selectedAudioOutputDeviceId) {
            setSelectedAudioOutputDeviceId(outputDevices[0].deviceId);
          }
        }
      } catch (err) {
        console.error('Error enumerating audio devices:', err);
      }
    };
    
    initAudioDevices();
  }, [fetchAvailableRooms, matchId, selectedAudioOutputDeviceId]);

  // Join a voice room
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isConnecting) return false;
    
    try {
      setIsConnecting(true);
      setConnectionState('connecting');
      setError(null);
      
      // Get LiveKit token from Supabase function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-livekit-token', {
        body: {
          roomId: room.id,
          userId: userId,
          userName: `User ${userId.substring(0, 4)}`,
          userRole: userRole,
        },
      });

      if (tokenError || !tokenData?.token) {
        throw new Error('Failed to get LiveKit token');
      }

      // Connect to LiveKit room
      await liveKitService.current.connect(
        tokenData.token,
        tokenData.serverUrl,
        room.id
      );

      setCurrentRoom(room);
      setIsRoomAdmin(userRole === 'admin' || userRole === 'coordinator');
      
      // Setup local audio monitoring
      await setupLocalAudioMonitoring();
      
      // Enable microphone
      await liveKitService.current.enableMicrophone();
      setIsMuted(false);
      
      try {
        const updateData: Partial<VoiceRoom> = { 
          participant_count: (room.participant_count || 0) + 1 
        };
        await supabase
          .from('voice_rooms')
          .update(updateData)
          .eq('id', room.id);
      } catch (err) {
        console.error('Failed to update participant count:', err);
      }
      
      return true;
    } catch (err: any) {
      console.error('Error joining voice room:', err);
      setConnectionState('failed');
      setError(err instanceof Error ? err.message : 'Failed to join voice room');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, userId, userRole]);

  // Leave the current voice room
  const leaveVoiceRoom = useCallback(async () => {
    if (!currentRoom) return;
    
    try {
      setConnectionState('disconnecting');
      
      await liveKitService.current.disconnect();
      cleanupAllAudioMonitoring();
      
      try {
        const updateData: Partial<VoiceRoom> = { 
          participant_count: Math.max(0, (currentRoom.participant_count || 1) - 1)
        };
        await supabase
          .from('voice_rooms')
          .update(updateData)
          .eq('id', currentRoom.id);
      } catch (err) {
        console.error('Failed to update participant count:', err);
      }
      
      setIsVoiceEnabled(false);
      setIsMuted(false);
      setAudioLevel(0);
      setParticipants([]);
      setCurrentRoom(null);
      setConnectionState('disconnected');
      
    } catch (err: any) {
      console.error('Error leaving voice room:', err);
      setError(`Failed to leave voice room: ${err.message}`);
    }
  }, [currentRoom]);

  // Toggle mute status
  const toggleMute = useCallback(async () => {
    if (!isVoiceEnabled) return;
    
    try {
      const newMutedState = await liveKitService.current.toggleMicrophone();
      setIsMuted(!newMutedState);
      updateParticipantsList();
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  }, [isVoiceEnabled]);

  // Admin function to mute/unmute participants
  const adminSetParticipantMute = useCallback(async (participantId: string, shouldMute: boolean) => {
    if (!isRoomAdmin || !isVoiceEnabled) return false;
    
    try {
      const success = await liveKitService.current.moderateMuteParticipant(participantId, shouldMute);
      if (success) {
        updateParticipantsList();
      }
      return success;
    } catch (err) {
      console.error('Failed to moderate participant:', err);
      return false;
    }
  }, [isRoomAdmin, isVoiceEnabled]);

  const selectAudioOutputDevice = useCallback(async (deviceId: string) => {
    try {
      // In a real implementation, you would set the audio output device
      // This is limited by browser APIs
      setSelectedAudioOutputDeviceId(deviceId);
      console.log('Selected audio output device:', deviceId);
    } catch (error) {
      console.error('Failed to select audio output device:', error);
    }
  }, []);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Voice collaboration error:', error);
    }
  }, [error]);

  return {
    isVoiceEnabled,
    isMuted,
    isConnecting,
    participants,
    audioLevel,
    toggleMute,
    availableRooms,
    currentRoom,
    isRoomAdmin,
    joinVoiceRoom,
    leaveVoiceRoom,
    networkStatus,
    remoteStreams,
    peerStatuses,
    connectionState,
    adminSetParticipantMute,
    audioOutputDevices,
    selectedAudioOutputDeviceId,
    selectAudioOutputDevice,
    error,
    fetchAvailableRooms,
  };
}
