
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceCollaborationOptions {
  matchId: string;
  userId: string;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
}

interface TrackerVoiceStatus {
  userId: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  username?: string;
  role?: 'main' | 'specialized' | 'admin';
  audioLevel?: number;
}

interface VoiceRoom {
  id: string;
  name: string;
  maxParticipants: number;
  currentParticipants: number;
  isPrivate: boolean;
}

export const useVoiceCollaboration = ({
  matchId,
  userId,
  onUserJoined,
  onUserLeft
}: VoiceCollaborationOptions) => {
  console.log('useVoiceCollaboration: Initializing', { matchId, userId });
  
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedTrackers, setConnectedTrackers] = useState<TrackerVoiceStatus[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // State-of-the-art audio constraints optimized for large groups
  const getAudioConstraints = () => ({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,
      latency: 0.01,
      googEchoCancellation: true,
      googNoiseSuppression: true,
      googAutoGainControl: true,
      googHighpassFilter: true,
      googTypingNoiseDetection: true,
      googAudioMirroring: false,
      googBeamforming: true,
      googArrayGeometry: true
    }
  });

  // Initialize rooms for scalable voice architecture
  const initializeVoiceRooms = useCallback(() => {
    console.log('useVoiceCollaboration: Initializing voice rooms');
    const rooms: VoiceRoom[] = [
      {
        id: `${matchId}_main`,
        name: 'Main Communication',
        maxParticipants: 20,
        currentParticipants: 0,
        isPrivate: false
      },
      {
        id: `${matchId}_coordinators`,
        name: 'Match Coordinators',
        maxParticipants: 8,
        currentParticipants: 0,
        isPrivate: true
      },
      {
        id: `${matchId}_team_a`,
        name: 'Team A Trackers',
        maxParticipants: 25,
        currentParticipants: 0,
        isPrivate: false
      },
      {
        id: `${matchId}_team_b`,
        name: 'Team B Trackers',
        maxParticipants: 25,
        currentParticipants: 0,
        isPrivate: false
      },
      {
        id: `${matchId}_events`,
        name: 'Event Specialists',
        maxParticipants: 15,
        currentParticipants: 0,
        isPrivate: false
      },
      {
        id: `${matchId}_technical`,
        name: 'Technical Support',
        maxParticipants: 10,
        currentParticipants: 0,
        isPrivate: false
      }
    ];
    setAvailableRooms(rooms);
    console.log('useVoiceCollaboration: Voice rooms initialized', rooms);
  }, [matchId]);

  // Join specific voice room
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    console.log('useVoiceCollaboration: Attempting to join room', room);
    
    if (isVoiceEnabled || room.currentParticipants >= room.maxParticipants) {
      console.log('useVoiceCollaboration: Cannot join room - already enabled or room full', { isVoiceEnabled, currentParticipants: room.currentParticipants, maxParticipants: room.maxParticipants });
      return;
    }

    setIsConnecting(true);
    try {
      console.log('useVoiceCollaboration: Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
      console.log('useVoiceCollaboration: Microphone access granted', stream);
      
      localStreamRef.current = stream;
      setCurrentRoom(room);

      // Set up room-specific channel
      console.log('useVoiceCollaboration: Setting up Supabase channel for room', room.id);
      channelRef.current = supabase.channel(`voice_${room.id}`);
      
      channelRef.current.subscribe(async (status: string) => {
        console.log('useVoiceCollaboration: Channel subscription status', status);
        if (status === 'SUBSCRIBED') {
          console.log('useVoiceCollaboration: Successfully subscribed to voice channel');
          setIsVoiceEnabled(true);
          toast.success(`Joined ${room.name} - You are muted by default`);
        }
      });

    } catch (error: any) {
      console.error('useVoiceCollaboration: Failed to join voice room:', error);
      toast.error('Failed to access microphone: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  }, [isVoiceEnabled]);

  // Leave current voice room
  const leaveVoiceRoom = useCallback(() => {
    console.log('useVoiceCollaboration: Leaving voice room');
    
    if (!isVoiceEnabled || !currentRoom) {
      console.log('useVoiceCollaboration: No room to leave');
      return;
    }

    // Stop local stream
    if (localStreamRef.current) {
      console.log('useVoiceCollaboration: Stopping local stream');
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      console.log('useVoiceCollaboration: Unsubscribing from channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsVoiceEnabled(false);
    setConnectedTrackers([]);
    setAudioLevel(0);
    setIsMuted(true);
    setCurrentRoom(null);
    setIsRoomAdmin(false);
    console.log('useVoiceCollaboration: Left voice room successfully');
    toast.info(`Left ${currentRoom.name}`);
  }, [isVoiceEnabled, currentRoom]);

  // Enhanced mute toggle
  const toggleMute = useCallback(() => {
    console.log('useVoiceCollaboration: Toggling mute', { currentlyMuted: isMuted });
    
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        console.log('useVoiceCollaboration: Mute toggled', { newMutedState: !isMuted });
        toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted');
      } else {
        console.error('useVoiceCollaboration: No audio track found');
      }
    } else {
      console.error('useVoiceCollaboration: No local stream available');
    }
  }, [isMuted]);

  // Legacy compatibility functions
  const startVoiceCollaboration = useCallback(async () => {
    console.log('useVoiceCollaboration: Starting voice collaboration (legacy)');
    const mainRoom = availableRooms.find(room => room.id.includes('_main'));
    if (mainRoom) {
      await joinVoiceRoom(mainRoom);
    }
  }, [availableRooms, joinVoiceRoom]);

  const stopVoiceCollaboration = useCallback(() => {
    console.log('useVoiceCollaboration: Stopping voice collaboration (legacy)');
    leaveVoiceRoom();
  }, [leaveVoiceRoom]);

  // Initialize rooms on mount
  useEffect(() => {
    console.log('useVoiceCollaboration: Component mounted, initializing rooms');
    initializeVoiceRooms();
  }, [initializeVoiceRooms]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('useVoiceCollaboration: Component unmounting, cleaning up');
      if (isVoiceEnabled) {
        leaveVoiceRoom();
      }
    };
  }, [isVoiceEnabled, leaveVoiceRoom]);

  console.log('useVoiceCollaboration: Current state', {
    isVoiceEnabled,
    isMuted,
    isConnecting,
    currentRoom: currentRoom?.name,
    availableRoomsCount: availableRooms.length
  });

  return {
    // Legacy compatibility
    isVoiceEnabled,
    isMuted,
    isConnecting,
    connectedTrackers,
    audioLevel,
    startVoiceCollaboration,
    stopVoiceCollaboration,
    toggleMute,
    
    // New room-based features
    availableRooms,
    currentRoom,
    isRoomAdmin,
    joinVoiceRoom,
    leaveVoiceRoom
  };
};
