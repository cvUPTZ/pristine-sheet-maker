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
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add debug info helper
  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const debugMessage = `[${timestamp}] ${message}`;
    console.log('🔍 VOICE DEBUG:', debugMessage);
    setDebugInfo(prev => [...prev.slice(-14), debugMessage]); // Keep last 15 messages
  }, []);

  // Setup audio analysis with FIXED monitoring logic
  const setupAudioAnalysis = useCallback((stream: MediaStream) => {
    addDebugInfo('🎵 Setting up audio analysis');
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      
      if (audioContextRef.current) {
        addDebugInfo('🔄 Closing existing audio context');
        audioContextRef.current.close();
      }
      
      audioContextRef.current = new AudioContext();
      addDebugInfo(`🎵 Audio context created, state: ${audioContextRef.current.state}`);
      
      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        addDebugInfo('▶️ Resuming suspended audio context');
        audioContextRef.current.resume();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      gainNodeRef.current = audioContextRef.current.createGain();
      
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3; // Reduced for more responsive readings
      
      source.connect(analyserRef.current);
      analyserRef.current.connect(gainNodeRef.current);
      
      addDebugInfo('✅ Audio analysis pipeline connected');
      
      // FIXED: Monitor audio directly from MediaStream source, not track state
      const monitorAudioLevel = () => {
        if (!analyserRef.current || !localStreamRef.current) {
          setAudioLevel(0);
          return;
        }
        
        // Check if stream is still active
        if (!localStreamRef.current.active) {
          addDebugInfo('⚠️ Stream is not active');
          setAudioLevel(0);
          return;
        }
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = average / 255;
        
        // Only update if there's a meaningful change
        if (Math.abs(normalizedLevel - audioLevel) > 0.01) {
          setAudioLevel(normalizedLevel);
          
          if (normalizedLevel > 0.05) {
            addDebugInfo(`🔊 Audio detected: ${(normalizedLevel * 100).toFixed(1)}% (track enabled: ${localStreamRef.current?.getAudioTracks()[0]?.enabled})`);
          }
        }
      };
      
      if (audioMonitorIntervalRef.current) {
        clearInterval(audioMonitorIntervalRef.current);
      }
      
      audioMonitorIntervalRef.current = setInterval(monitorAudioLevel, 100); // More frequent updates
      addDebugInfo('✅ Audio monitoring started');
      
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
  }, [addDebugInfo, audioLevel]);

  // Initialize rooms with debugging
  const initializeVoiceRooms = useCallback(() => {
    addDebugInfo('🏠 Initializing voice rooms');
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

  // SIMPLIFIED join voice room with better error handling
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    addDebugInfo(`🚪 Starting join process for room: ${room.name}`);
    
    if (isVoiceEnabled || room.currentParticipants >= room.maxParticipants) {
      addDebugInfo(`❌ Room unavailable - enabled: ${isVoiceEnabled}, full: ${room.currentParticipants}/${room.maxParticipants}`);
      return;
    }

    setIsConnecting(true);
    addDebugInfo('🔄 Setting connecting state');
    
    try {
      addDebugInfo('🔄 Requesting microphone access with basic constraints...');
      
      // Use simpler, more compatible constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      addDebugInfo(`✅ Got stream with ${stream.getTracks().length} tracks`);
      
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks in stream');
      }
      
      const audioTrack = audioTracks[0];
      const settings = audioTrack.getSettings();
      addDebugInfo(`📡 Track: enabled=${audioTrack.enabled}, muted=${audioTrack.muted}, state=${audioTrack.readyState}`);
      addDebugInfo(`🎛️ Settings: sampleRate=${settings.sampleRate}, channelCount=${settings.channelCount}`);
      
      localStreamRef.current = stream;
      setCurrentRoom(room);
      
      // Setup audio analysis
      addDebugInfo('🔄 Setting up audio analysis');
      const cleanupAudioAnalysis = setupAudioAnalysis(stream);
      
      // Setup Supabase channel
      addDebugInfo(`🔄 Setting up Supabase channel: voice_${room.id}`);
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
          addDebugInfo('✅ Successfully subscribed to voice channel');
          setIsVoiceEnabled(true);
          
          // Start muted by default, but KEEP THE TRACK ENABLED for monitoring
          if (audioTrack) {
            audioTrack.enabled = true; // FIXED: Keep track enabled for audio monitoring
            addDebugInfo('🎵 Audio track enabled for monitoring (starting muted)');
          }
          
          toast.success(`Joined ${room.name} - You are muted by default`);
          addDebugInfo('✅ JOIN COMPLETE: All steps successful');
        } else if (status === 'CHANNEL_ERROR') {
          addDebugInfo('❌ Channel subscription error');
          toast.error('Failed to connect to voice channel');
        }
      });

      // Store cleanup function
      if (cleanupAudioAnalysis) {
        (channelRef.current as any).audioCleanup = cleanupAudioAnalysis;
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
      addDebugInfo('🔄 Cleared connecting state');
    }
  }, [isVoiceEnabled, setupAudioAnalysis, addDebugInfo, userId]);

  // Enhanced leave voice room
  const leaveVoiceRoom = useCallback(() => {
    addDebugInfo('🚪 Starting leave voice room process');
    
    if (!isVoiceEnabled || !currentRoom) {
      addDebugInfo('❌ No room to leave');
      return;
    }

    // Stop audio monitoring
    if (audioMonitorIntervalRef.current) {
      addDebugInfo('🛑 Stopping audio monitoring');
      clearInterval(audioMonitorIntervalRef.current);
      audioMonitorIntervalRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      addDebugInfo('🛑 Stopping local stream');
      localStreamRef.current.getTracks().forEach(track => {
        addDebugInfo(`🛑 Stopping track: ${track.kind}, enabled: ${track.enabled}`);
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Cleanup audio analysis
    if ((channelRef.current as any)?.audioCleanup) {
      addDebugInfo('🧹 Running audio analysis cleanup');
      (channelRef.current as any).audioCleanup();
    }

    // Stop audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      addDebugInfo(`🔊 Closing audio context (state: ${audioContextRef.current.state})`);
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      addDebugInfo('📡 Unsubscribing from channel');
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
    
    addDebugInfo(`✅ CLEANUP COMPLETE: Left voice room: ${roomName}`);
    toast.info(`Left ${roomName}`);
  }, [isVoiceEnabled, currentRoom, addDebugInfo]);

  // FIXED mute toggle - now controls gain instead of track.enabled
  const toggleMute = useCallback(() => {
    addDebugInfo(`🔇 TOGGLE MUTE: Current state=${isMuted ? 'MUTED' : 'UNMUTED'}`);
    
    if (!localStreamRef.current) {
      addDebugInfo('❌ TOGGLE MUTE FAILED: No local stream available');
      toast.error('No audio stream available');
      return;
    }
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) {
      addDebugInfo('❌ TOGGLE MUTE FAILED: No audio track found');
      toast.error('No audio track available');
      return;
    }
    
    const newMutedState = !isMuted;
    
    // FIXED: Use gain node to control audio output, keep track enabled for monitoring
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newMutedState ? 0 : 1;
      addDebugInfo(`✅ GAIN CONTROL: Set gain to ${newMutedState ? 0 : 1}`);
    }
    
    // Keep track enabled for audio level monitoring
    audioTrack.enabled = true;
    
    setIsMuted(newMutedState);
    
    addDebugInfo(`✅ TOGGLE MUTE SUCCESS: track.enabled=${audioTrack.enabled}, muted=${newMutedState}, gain=${gainNodeRef.current?.gain.value}`);
    toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
  }, [isMuted, addDebugInfo]);

  // Legacy compatibility functions
  const startVoiceCollaboration = useCallback(async () => {
    addDebugInfo('🔄 Starting voice collaboration (legacy)');
    const mainRoom = availableRooms.find(room => room.id.includes('_main'));
    if (mainRoom) {
      await joinVoiceRoom(mainRoom);
    } else {
      addDebugInfo('❌ No main room found for legacy start');
    }
  }, [availableRooms, joinVoiceRoom, addDebugInfo]);

  const stopVoiceCollaboration = useCallback(() => {
    addDebugInfo('🛑 Stopping voice collaboration (legacy)');
    leaveVoiceRoom();
  }, [leaveVoiceRoom, addDebugInfo]);

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
        
        addDebugInfo(`📊 STATE: enabled=${isVoiceEnabled}, muted=${isMuted}, connecting=${isConnecting}, room=${currentRoom?.name}, audio=${audioLevel.toFixed(3)}, stream=${streamInfo}, context=${contextInfo}`);
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
