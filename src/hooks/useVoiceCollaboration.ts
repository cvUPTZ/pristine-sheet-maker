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
  console.log('🎤 useVoiceCollaboration: INITIALIZING', { matchId, userId });
  
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedTrackers, setConnectedTrackers] = useState<TrackerVoiceStatus[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add debug info helper
  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const debugMessage = `[${timestamp}] ${message}`;
    console.log('🔍 VOICE DEBUG:', debugMessage);
    setDebugInfo(prev => [...prev.slice(-14), debugMessage]); // Keep last 15 messages
  }, []);

  // FIXED: Simplified audio analysis setup
  const setupAudioAnalysis = useCallback((stream: MediaStream) => {
    addDebugInfo('🎵 Setting up audio analysis');
    try {
      // Clean up existing audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
        addDebugInfo('▶️ Resumed audio context');
      }
      
      // Create audio nodes
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      gainNodeRef.current = audioContextRef.current.createGain();
      
      // Configure analyser
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3;
      
      // Connect audio pipeline: source -> analyser -> gain -> destination
      sourceNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
      
      // Set initial gain (muted by default)
      gainNodeRef.current.gain.value = 0;
      
      addDebugInfo('✅ Audio pipeline: source -> analyser -> gain -> destination');
      
      // Start audio monitoring
      const startAudioMonitoring = () => {
        if (audioMonitorIntervalRef.current) {
          clearInterval(audioMonitorIntervalRef.current);
        }
        
        audioMonitorIntervalRef.current = setInterval(() => {
          if (!analyserRef.current || !localStreamRef.current?.active) {
            setAudioLevel(0);
            return;
          }
          
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          const normalizedLevel = average / 255;
          
          setAudioLevel(normalizedLevel);
          
          if (normalizedLevel > 0.05) {
            addDebugInfo(`🔊 Audio detected: ${(normalizedLevel * 100).toFixed(1)}%`);
          }
        }, 100);
        
        addDebugInfo('✅ Audio monitoring started');
      };
      
      startAudioMonitoring();
      
      return () => {
        if (audioMonitorIntervalRef.current) {
          clearInterval(audioMonitorIntervalRef.current);
          audioMonitorIntervalRef.current = null;
        }
      };
      
    } catch (error) {
      addDebugInfo(`❌ Audio analysis setup failed: ${error}`);
      console.error('Audio analysis setup error:', error);
      return null;
    }
  }, [addDebugInfo]);

  // Initialize rooms with debugging
  const initializeVoiceRooms = useCallback(() => {
    addDebugInfo('🏠 Initializing voice rooms');
    // ... keep existing code (room initialization)
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
    addDebugInfo(`✅ ${rooms.length} voice rooms initialized`);
  }, [matchId, addDebugInfo]);

  // FIXED: Simplified join voice room
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    addDebugInfo(`🚪 Starting join process for room: ${room.name}`);
    
    if (isVoiceEnabled || room.currentParticipants >= room.maxParticipants) {
      addDebugInfo(`❌ Room unavailable - enabled: ${isVoiceEnabled}, full: ${room.currentParticipants}/${room.maxParticipants}`);
      return;
    }

    setIsConnecting(true);
    
    try {
      addDebugInfo('🎤 Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error('No audio track found');
      }
      
      addDebugInfo(`✅ Got audio track: enabled=${audioTrack.enabled}, state=${audioTrack.readyState}`);
      
      localStreamRef.current = stream;
      setCurrentRoom(room);
      
      // Setup audio analysis
      const audioCleanup = setupAudioAnalysis(stream);
      
      // Setup Supabase channel
      channelRef.current = supabase.channel(`voice_${room.id}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });
      
      channelRef.current.subscribe(async (status: string) => {
        addDebugInfo(`📡 Channel status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setIsVoiceEnabled(true);
          addDebugInfo('✅ Voice room joined successfully');
          toast.success(`Joined ${room.name} - You are muted by default`);
        } else if (status === 'CHANNEL_ERROR') {
          addDebugInfo('❌ Channel subscription error');
          toast.error('Failed to connect to voice channel');
        }
      });

      // Store cleanup function
      if (audioCleanup) {
        (channelRef.current as any).audioCleanup = audioCleanup;
      }

    } catch (error: any) {
      addDebugInfo(`❌ JOIN FAILED: ${error.message}`);
      console.error('Voice room join error:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone and try again.');
      } else {
        toast.error('Failed to access microphone: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isVoiceEnabled, setupAudioAnalysis, addDebugInfo, userId]);

  // Enhanced leave voice room
  const leaveVoiceRoom = useCallback(() => {
    addDebugInfo('🚪 Leaving voice room');
    
    if (!isVoiceEnabled || !currentRoom) {
      return;
    }

    // Stop audio monitoring
    if (audioMonitorIntervalRef.current) {
      clearInterval(audioMonitorIntervalRef.current);
      audioMonitorIntervalRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        addDebugInfo(`🛑 Stopped track: ${track.kind}`);
      });
      localStreamRef.current = null;
    }

    // Cleanup audio analysis
    if ((channelRef.current as any)?.audioCleanup) {
      (channelRef.current as any).audioCleanup();
    }

    // Stop audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const roomName = currentRoom.name;
    setIsVoiceEnabled(false);
    setConnectedTrackers([]);
    setAudioLevel(0);
    setIsMuted(true);
    setCurrentRoom(null);
    setIsRoomAdmin(false);
    
    addDebugInfo(`✅ Left voice room: ${roomName}`);
    toast.info(`Left ${roomName}`);
  }, [isVoiceEnabled, currentRoom, addDebugInfo]);

  // FIXED: Proper mute toggle using gain control
  const toggleMute = useCallback(() => {
    addDebugInfo(`🔇 TOGGLE MUTE: Current state=${isMuted ? 'MUTED' : 'UNMUTED'}`);
    
    if (!gainNodeRef.current) {
      addDebugInfo('❌ No gain node available for mute control');
      toast.error('Audio system not ready');
      return;
    }
    
    const newMutedState = !isMuted;
    
    // Use gain to control audio output (0 = muted, 1 = unmuted)
    gainNodeRef.current.gain.value = newMutedState ? 0 : 1;
    
    setIsMuted(newMutedState);
    
    addDebugInfo(`✅ MUTE STATE: ${newMutedState ? 'MUTED' : 'UNMUTED'}, gain=${gainNodeRef.current.gain.value}`);
    toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
  }, [isMuted, addDebugInfo]);

  // Legacy compatibility functions
  const startVoiceCollaboration = useCallback(async () => {
    const mainRoom = availableRooms.find(room => room.id.includes('_main'));
    if (mainRoom) {
      await joinVoiceRoom(mainRoom);
    }
  }, [availableRooms, joinVoiceRoom]);

  const stopVoiceCollaboration = useCallback(() => {
    leaveVoiceRoom();
  }, [leaveVoiceRoom]);

  // Initialize rooms on mount
  useEffect(() => {
    addDebugInfo('🚀 Component mounted, initializing');
    initializeVoiceRooms();
  }, [initializeVoiceRooms, addDebugInfo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      addDebugInfo('🧹 Component unmounting, cleaning up');
      if (isVoiceEnabled) {
        leaveVoiceRoom();
      }
    };
  }, [isVoiceEnabled, leaveVoiceRoom, addDebugInfo]);

  // Enhanced state monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if (isVoiceEnabled || isConnecting) {
        const streamInfo = localStreamRef.current ? 
          `tracks=${localStreamRef.current.getTracks().length}, active=${localStreamRef.current.active}` : 
          'no stream';
        const contextInfo = audioContextRef.current ? 
          `state=${audioContextRef.current.state}` : 
          'no context';
        const gainInfo = gainNodeRef.current ? 
          `gain=${gainNodeRef.current.gain.value}` : 
          'no gain';
        
        addDebugInfo(`📊 STATE: enabled=${isVoiceEnabled}, muted=${isMuted}, connecting=${isConnecting}, room=${currentRoom?.name}, audio=${audioLevel.toFixed(3)}, stream=${streamInfo}, context=${contextInfo}, ${gainInfo}`);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isVoiceEnabled, isMuted, isConnecting, currentRoom, audioLevel, addDebugInfo]);

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
    leaveVoiceRoom,
    
    // Debug information
    debugInfo
  };
};
