
import { useCallback, useEffect, useState, useRef } from 'react';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { supabase } from '@/integrations/supabase/client';
import { VoiceParticipant } from '@/types'; // Import the new VoiceParticipant type

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
  
  const audioManager = useRef<AudioManager | null>(null);
  const voiceService = useRef<VoiceRoomService>(VoiceRoomService.getInstance());

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
    
    const audioLevelInterval = setInterval(() => {
      if (isVoiceEnabled && !isMuted) {
        const baseLevel = Math.random() * 0.3;
        const speaking = Math.random() > 0.7;
        const level = speaking ? baseLevel + Math.random() * 0.7 : baseLevel;
        setAudioLevel(level);
        
        setParticipants(prev => 
          prev.map(p => p.isLocal ? { ...p, isSpeaking: speaking && !isMuted } : p)
        );
      } else {
        setAudioLevel(0);
        setParticipants(prev => 
          prev.map(p => p.isLocal ? { ...p, isSpeaking: false } : p)
        );
      }
    }, 500);
    
    return () => {
      clearInterval(audioLevelInterval);
    };
  }, [fetchAvailableRooms, isVoiceEnabled, isMuted, matchId, selectedAudioOutputDeviceId]);

  // Join a voice room
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      setConnectionState('connecting');
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const hasPermission = room.permissions.includes('all') || 
                           room.permissions.includes(userRole);
      
      if (!hasPermission) {
        throw new Error(`You don't have permission to join ${room.name}`);
      }
      
      if (room.participant_count && room.participant_count >= room.max_participants) {
        throw new Error(`Room ${room.name} is at maximum capacity`);
      }
      
      setConnectionState('connected');
      setCurrentRoom(room);
      setIsVoiceEnabled(true);
      setIsMuted(false);
      
      setIsRoomAdmin(userRole === 'admin' || userRole === 'coordinator');
      
      const localParticipant: VoiceParticipant = {
        id: userId,
        identity: userId, // Added: Use userId as identity
        user_id: userId, // Added: Use userId as user_id
        name: `User ${userId.substring(0, 4)}`,
        role: userRole,
        isMuted: false,
        isSpeaking: false,
        isLocal: true,
        room_id: room.id // Added: current room context
      };
      
      const simulatedParticipants: VoiceParticipant[] = [
        localParticipant,
        {
          id: 'sim-1',
          identity: 'sim-1', // Added
          user_id: 'sim-1', // Added
          name: 'John Doe',
          role: 'tracker',
          isMuted: Math.random() > 0.5,
          isSpeaking: Math.random() > 0.7,
          isLocal: false,
          room_id: room.id // Added
        },
        {
          id: 'sim-2',
          identity: 'sim-2', // Added
          user_id: 'sim-2', // Added
          name: 'Jane Smith',
          role: 'coordinator',
          isMuted: Math.random() > 0.5,
          isSpeaking: Math.random() > 0.7,
          isLocal: false,
          room_id: room.id // Added
        }
      ];
      
      setParticipants(simulatedParticipants);
      
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
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
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
      setConnectionState('disconnected');
      
    } catch (err: any) {
      console.error('Error leaving voice room:', err);
      setError(`Failed to leave voice room: ${err.message}`);
    }
  }, [currentRoom]);

  // Toggle mute status
  const toggleMute = useCallback(() => {
    if (!isVoiceEnabled) return;
    
    setIsMuted(prev => !prev);
    
    setParticipants(prev => 
      prev.map(p => p.isLocal ? { ...p, isMuted: !isMuted } : p)
    );
  }, [isVoiceEnabled, isMuted]);

  // Admin function to mute/unmute participants
  const adminSetParticipantMute = useCallback((participantId: string, shouldMute: boolean) => {
    if (!isRoomAdmin || !isVoiceEnabled) return false;
    
    setParticipants(prev => 
      prev.map(p => p.id === participantId ? { ...p, isMuted: shouldMute } : p)
    );
    
    return true;
  }, [isRoomAdmin, isVoiceEnabled]);

  const selectAudioOutputDevice = useCallback(async (deviceId: string) => {
    if (!audioManager.current) return;
    
    try {
      const success = await audioManager.current.setAudioOutputDevice(deviceId);
      if (success) {
        setSelectedAudioOutputDeviceId(deviceId);
        console.log('Selected audio output device:', deviceId);
      }
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
