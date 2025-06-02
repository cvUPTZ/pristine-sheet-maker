
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

  // Add debug info helper
  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const debugMessage = `[${timestamp}] ${message}`;
    console.log('🔍 VOICE DEBUG:', debugMessage);
    setDebugInfo(prev => [...prev.slice(-9), debugMessage]); // Keep last 10 messages
  }, []);

  // Comprehensive browser capability check
  const checkBrowserCapabilities = useCallback(() => {
    addDebugInfo('🔍 Checking browser capabilities...');
    
    // Check getUserMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addDebugInfo('❌ getUserMedia not supported');
      return false;
    }
    addDebugInfo('✅ getUserMedia supported');

    // Check WebRTC support
    if (!window.RTCPeerConnection) {
      addDebugInfo('❌ WebRTC not supported');
      return false;
    }
    addDebugInfo('✅ WebRTC supported');

    // Check AudioContext support
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      addDebugInfo('❌ AudioContext not supported');
      return false;
    }
    addDebugInfo('✅ AudioContext supported');

    // Check if HTTPS or localhost
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    addDebugInfo(`🔒 Secure context: ${isSecure ? 'YES' : 'NO'}`);
    
    return true;
  }, [addDebugInfo]);

  // Enhanced audio constraints with debugging
  const getAudioConstraints = useCallback(() => {
    addDebugInfo('🎛️ Setting up audio constraints');
    return {
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
    };
  }, [addDebugInfo]);

  // Setup audio analysis
  const setupAudioAnalysis = useCallback((stream: MediaStream) => {
    addDebugInfo('🎵 Setting up audio analysis');
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      gainNodeRef.current = audioContextRef.current.createGain();
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      analyserRef.current.connect(gainNodeRef.current);
      
      addDebugInfo('✅ Audio analysis setup complete');
      
      // Start monitoring audio levels
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = average / 255;
        setAudioLevel(normalizedLevel);
        
        if (normalizedLevel > 0.1) {
          addDebugInfo(`🔊 Audio detected: ${(normalizedLevel * 100).toFixed(1)}%`);
        }
      };
      
      const intervalId = setInterval(monitorAudioLevel, 100);
      return () => clearInterval(intervalId);
      
    } catch (error) {
      addDebugInfo(`❌ Audio analysis setup failed: ${error}`);
      console.error('Audio analysis setup error:', error);
    }
  }, [addDebugInfo]);

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

  // Enhanced join voice room with comprehensive debugging
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    addDebugInfo(`🚪 Attempting to join room: ${room.name}`);
    
    if (!checkBrowserCapabilities()) {
      addDebugInfo('❌ Browser capabilities check failed');
      toast.error('Your browser does not support voice chat');
      return;
    }
    
    if (isVoiceEnabled || room.currentParticipants >= room.maxParticipants) {
      addDebugInfo(`❌ Cannot join room - already enabled: ${isVoiceEnabled}, room full: ${room.currentParticipants}/${room.maxParticipants}`);
      return;
    }

    setIsConnecting(true);
    addDebugInfo('🔄 Setting connecting state');
    
    try {
      addDebugInfo('🎤 Requesting microphone access...');
      const constraints = getAudioConstraints();
      addDebugInfo(`📋 Audio constraints: ${JSON.stringify(constraints.audio, null, 2)}`);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      addDebugInfo(`✅ Microphone access granted - tracks: ${stream.getTracks().length}`);
      
      // Log detailed stream info
      stream.getTracks().forEach((track, index) => {
        addDebugInfo(`📡 Track ${index}: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}, state: ${track.readyState}`);
        addDebugInfo(`🎛️ Track settings: ${JSON.stringify(track.getSettings(), null, 2)}`);
      });
      
      localStreamRef.current = stream;
      setCurrentRoom(room);
      addDebugInfo(`🏠 Current room set: ${room.name}`);

      // Setup audio analysis
      const cleanupAudioAnalysis = setupAudioAnalysis(stream);
      
      // Setup Supabase channel
      addDebugInfo(`📡 Setting up Supabase channel: voice_${room.id}`);
      channelRef.current = supabase.channel(`voice_${room.id}`);
      
      channelRef.current.subscribe(async (status: string) => {
        addDebugInfo(`📡 Channel subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          addDebugInfo('✅ Successfully subscribed to voice channel');
          setIsVoiceEnabled(true);
          toast.success(`Joined ${room.name} - You are muted by default`);
          
          // Test audio immediately
          addDebugInfo('🧪 Testing audio capabilities...');
          if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
              addDebugInfo(`🎵 Audio track active: ${audioTrack.enabled}, muted: ${audioTrack.muted}`);
              // Temporarily unmute to test
              audioTrack.enabled = true;
              setTimeout(() => {
                addDebugInfo('🔇 Re-muting audio track for default muted state');
                audioTrack.enabled = false;
              }, 1000);
            } else {
              addDebugInfo('❌ No audio track found in stream');
            }
          }
        } else if (status === 'CHANNEL_ERROR') {
          addDebugInfo('❌ Channel subscription error');
          toast.error('Failed to connect to voice channel');
        } else if (status === 'CLOSED') {
          addDebugInfo('🔒 Channel closed');
        }
      });

      // Store cleanup function
      if (cleanupAudioAnalysis) {
        const originalCleanup = cleanupAudioAnalysis;
        (channelRef.current as any).audioCleanup = originalCleanup;
      }

    } catch (error: any) {
      addDebugInfo(`❌ Failed to join voice room: ${error.message}`);
      console.error('Voice room join error:', error);
      
      // Detailed error analysis
      if (error.name === 'NotAllowedError') {
        addDebugInfo('🚫 Microphone access denied by user');
        toast.error('Microphone access denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        addDebugInfo('🎤 No microphone found');
        toast.error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotSupportedError') {
        addDebugInfo('🚫 Browser does not support audio capture');
        toast.error('Your browser does not support audio capture.');
      } else {
        toast.error('Failed to access microphone: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
      addDebugInfo('🔄 Cleared connecting state');
    }
  }, [isVoiceEnabled, checkBrowserCapabilities, getAudioConstraints, setupAudioAnalysis, addDebugInfo]);

  // Enhanced leave voice room
  const leaveVoiceRoom = useCallback(() => {
    addDebugInfo('🚪 Leaving voice room');
    
    if (!isVoiceEnabled || !currentRoom) {
      addDebugInfo('❌ No room to leave');
      return;
    }

    // Stop local stream
    if (localStreamRef.current) {
      addDebugInfo('🛑 Stopping local stream');
      localStreamRef.current.getTracks().forEach(track => {
        addDebugInfo(`🛑 Stopping track: ${track.kind}`);
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Cleanup audio analysis
    if ((channelRef.current as any)?.audioCleanup) {
      addDebugInfo('🧹 Cleaning up audio analysis');
      (channelRef.current as any).audioCleanup();
    }

    // Stop audio context
    if (audioContextRef.current) {
      addDebugInfo('🔊 Closing audio context');
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      addDebugInfo('📡 Unsubscribing from channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsVoiceEnabled(false);
    setConnectedTrackers([]);
    setAudioLevel(0);
    setIsMuted(true);
    const roomName = currentRoom.name;
    setCurrentRoom(null);
    setIsRoomAdmin(false);
    addDebugInfo(`✅ Left voice room: ${roomName}`);
    toast.info(`Left ${roomName}`);
  }, [isVoiceEnabled, currentRoom, addDebugInfo]);

  // Enhanced mute toggle with debugging
  const toggleMute = useCallback(() => {
    addDebugInfo(`🔇 Toggling mute - currently: ${isMuted ? 'MUTED' : 'UNMUTED'}`);
    
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        addDebugInfo(`🎵 Audio track enabled: ${audioTrack.enabled}, new muted state: ${!isMuted}`);
        toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted');
      } else {
        addDebugInfo('❌ No audio track found for mute toggle');
        toast.error('No audio track available');
      }
    } else {
      addDebugInfo('❌ No local stream available for mute toggle');
      toast.error('No audio stream available');
    }
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

  // Log current state periodically for debugging
  useEffect(() => {
    const interval = setInterval(() => {
      if (isVoiceEnabled || isConnecting) {
        addDebugInfo(`📊 State: enabled=${isVoiceEnabled}, muted=${isMuted}, connecting=${isConnecting}, room=${currentRoom?.name}, audioLevel=${audioLevel.toFixed(3)}`);
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
