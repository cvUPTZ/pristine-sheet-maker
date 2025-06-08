import { useCallback, useEffect, useState, useRef } from 'react';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { supabase } from '@/integrations/supabase/client';

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
  // Other methods that might exist
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
  const [error, setError] = useState<Error | null>(null);
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
    
    // Check connection quality periodically
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        // This is a simple check - in a real app, you might want to do
        // more sophisticated network quality testing
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
      setError(new Error(`Failed to fetch voice rooms: ${err.message}`));
      return [];
    }
  }, []);

  // Initialize on component mount
  useEffect(() => {
    if (matchId) {
      fetchAvailableRooms(matchId);
    }
    
    // Initialize audio devices
    const initAudioDevices = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const outputDevices = devices.filter(device => device.kind === 'audiooutput');
          setAudioOutputDevices(outputDevices);
          
          // Set default device
          if (outputDevices.length > 0 && !selectedAudioOutputDeviceId) {
            setSelectedAudioOutputDeviceId(outputDevices[0].deviceId);
          }
        }
      } catch (err) {
        console.error('Error enumerating audio devices:', err);
      }
    };
    
    initAudioDevices();
    
    // Simulate audio level changes for demo purposes
    const audioLevelInterval = setInterval(() => {
      if (isVoiceEnabled && !isMuted) {
        // Generate random audio level with some "natural" variation
        const baseLevel = Math.random() * 0.3; // Base level between 0-0.3
        const speaking = Math.random() > 0.7; // 30% chance of "speaking"
        const level = speaking ? baseLevel + Math.random() * 0.7 : baseLevel;
        setAudioLevel(level);
        
        // Update local participant speaking state
        setParticipants(prev => 
          prev.map(p => p.isLocal ? { ...p, isSpeaking: speaking && !isMuted } : p)
        );
      } else {
        setAudioLevel(0);
        // Ensure local participant is not speaking when muted
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
      
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check if user has permission to join this room
      const hasPermission = room.permissions.includes('all') || 
                           room.permissions.includes(userRole);
      
      if (!hasPermission) {
        throw new Error(`You don't have permission to join ${room.name}`);
      }
      
      // Check if room is at capacity
      if (room.participant_count && room.participant_count >= room.max_participants) {
        throw new Error(`Room ${room.name} is at maximum capacity`);
      }
      
      // Simulate successful connection
      setConnectionState('connected');
      setCurrentRoom(room);
      setIsVoiceEnabled(true);
      setIsMuted(false);
      
      // Set room admin status
      setIsRoomAdmin(userRole === 'admin' || userRole === 'coordinator');
      
      // Create local participant
      const localParticipant: VoiceParticipant = {
        id: userId,
        name: `User ${userId.substring(0, 4)}`,
        role: userRole,
        isMuted: false,
        isSpeaking: false,
        isLocal: true
      };
      
      // Simulate other participants
      const simulatedParticipants: VoiceParticipant[] = [
        localParticipant,
        {
          id: 'sim-1',
          name: 'John Doe',
          role: 'tracker',
          isMuted: Math.random() > 0.5,
          isSpeaking: Math.random() > 0.7,
          isLocal: false
        },
        {
          id: 'sim-2',
          name: 'Jane Smith',
          role: 'coordinator',
          isMuted: Math.random() > 0.5,
          isSpeaking: Math.random() > 0.7,
          isLocal: false
        }
      ];
      
      setParticipants(simulatedParticipants);
      
      // Update room participant count in database
      try {
        await supabase
          .from('voice_rooms')
          .update({ 
            participant_count: (room.participant_count || 0) + 1 
          })
          .eq('id', room.id);
      } catch (err) {
        console.error('Failed to update participant count:', err);
      }
      
      return true;
    } catch (err: any) {
      console.error('Error joining voice room:', err);
      setConnectionState('failed');
      setError(err instanceof Error ? err : new Error(err.message || 'Failed to join voice room'));
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
      
      // Simulate disconnection process
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update room participant count in database
      try {
        await supabase
          .from('voice_rooms')
          .update({ 
            participant_count: Math.max(0, (currentRoom.participant_count || 1) - 1)
          })
          .eq('id', currentRoom.id);
      } catch (err) {
        console.error('Failed to update participant count:', err);
      }
      
      setIsVoiceEnabled(false);
      setIsMuted(false);
      setAudioLevel(0);
      setParticipants([]);
      setConnectionState('disconnected');
      
      // Don't clear currentRoom to allow for reconnection
    } catch (err: any) {
      console.error('Error leaving voice room:', err);
      setError(new Error(`Failed to leave voice room: ${err.message}`));
    }
  }, [currentRoom]);

  // Toggle mute status
  const toggleMute = useCallback(() => {
    if (!isVoiceEnabled) return;
    
    setIsMuted(prev => !prev);
    
    // Update local participant
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
    if (!audioManager) return;
    
    try {
      // AudioManager doesn't have setAudioOutputDevice, so we'll handle this differently
      // For now, just store the selected device ID
      setSelectedAudioOutputDeviceId(deviceId);
      console.log('Selected audio output device:', deviceId);
    } catch (error) {
      console.error('Failed to select audio output device:', error);
    }
  }, [audioManager]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Voice collaboration error:', error);
      setError(error.message || 'An unknown error occurred');
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
    error: error?.message || null,
    fetchAvailableRooms,
  };
}
