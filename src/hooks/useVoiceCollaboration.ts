
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

  // Comprehensive browser capability check
  const checkBrowserCapabilities = useCallback(() => {
    addDebugInfo('🔍 Checking browser capabilities...');
    
    const capabilities = {
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      webRTC: !!window.RTCPeerConnection,
      audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
      isSecure: location.protocol === 'https:' || location.hostname === 'localhost',
      userAgent: navigator.userAgent
    };
    
    addDebugInfo(`📊 Browser info: ${JSON.stringify(capabilities)}`);
    
    if (!capabilities.getUserMedia) {
      addDebugInfo('❌ getUserMedia not supported');
      return false;
    }
    
    if (!capabilities.webRTC) {
      addDebugInfo('❌ WebRTC not supported');
      return false;
    }
    
    if (!capabilities.audioContext) {
      addDebugInfo('❌ AudioContext not supported');
      return false;
    }
    
    if (!capabilities.isSecure) {
      addDebugInfo('⚠️ Not in secure context - some features may not work');
    }
    
    addDebugInfo('✅ All required capabilities supported');
    return true;
  }, [addDebugInfo]);

  // Enhanced audio constraints with debugging
  const getAudioConstraints = useCallback(() => {
    addDebugInfo('🎛️ Setting up audio constraints');
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 48000 },
        channelCount: { ideal: 1 },
        latency: { ideal: 0.01 }
      },
      video: false
    };
    addDebugInfo(`🎛️ Constraints: ${JSON.stringify(constraints)}`);
    return constraints;
  }, [addDebugInfo]);

  // Enhanced media device enumeration
  const enumerateAudioDevices = useCallback(async () => {
    try {
      addDebugInfo('🎤 Enumerating audio devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      addDebugInfo(`🎤 Found ${audioInputs.length} audio inputs, ${audioOutputs.length} audio outputs`);
      
      audioInputs.forEach((device, index) => {
        addDebugInfo(`📡 Input ${index}: ${device.label || 'Unknown'} (${device.deviceId.slice(0, 8)}...)`);
      });
      
      if (audioInputs.length === 0) {
        addDebugInfo('❌ No audio input devices found');
        return false;
      }
      
      return true;
    } catch (error) {
      addDebugInfo(`❌ Device enumeration failed: ${error}`);
      return false;
    }
  }, [addDebugInfo]);

  // Setup audio analysis with error handling
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
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      source.connect(analyserRef.current);
      analyserRef.current.connect(gainNodeRef.current);
      
      addDebugInfo('✅ Audio analysis pipeline connected');
      
      // Start monitoring audio levels
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = average / 255;
        setAudioLevel(normalizedLevel);
        
        if (normalizedLevel > 0.05) {
          addDebugInfo(`🔊 Audio detected: ${(normalizedLevel * 100).toFixed(1)}%`);
        }
      };
      
      if (audioMonitorIntervalRef.current) {
        clearInterval(audioMonitorIntervalRef.current);
      }
      
      audioMonitorIntervalRef.current = setInterval(monitorAudioLevel, 200);
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

  // Enhanced join voice room with step-by-step debugging
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    addDebugInfo(`🚪 Starting join process for room: ${room.name}`);
    
    // Step 1: Check capabilities
    if (!checkBrowserCapabilities()) {
      addDebugInfo('❌ STEP 1 FAILED: Browser capabilities insufficient');
      toast.error('Your browser does not support voice chat');
      return;
    }
    addDebugInfo('✅ STEP 1: Browser capabilities OK');
    
    // Step 2: Check room availability
    if (isVoiceEnabled || room.currentParticipants >= room.maxParticipants) {
      addDebugInfo(`❌ STEP 2 FAILED: Room unavailable - enabled: ${isVoiceEnabled}, full: ${room.currentParticipants}/${room.maxParticipants}`);
      return;
    }
    addDebugInfo('✅ STEP 2: Room available');

    setIsConnecting(true);
    addDebugInfo('🔄 STEP 3: Setting connecting state');
    
    try {
      // Step 4: Enumerate devices
      addDebugInfo('🔄 STEP 4: Checking audio devices');
      const hasDevices = await enumerateAudioDevices();
      if (!hasDevices) {
        throw new Error('No audio input devices available');
      }
      addDebugInfo('✅ STEP 4: Audio devices available');
      
      // Step 5: Request media access
      addDebugInfo('🔄 STEP 5: Requesting microphone access...');
      const constraints = getAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      addDebugInfo(`✅ STEP 5: Microphone access granted - ${stream.getTracks().length} tracks`);
      
      // Step 6: Validate stream
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks in stream');
      }
      
      addDebugInfo(`✅ STEP 6: Stream validation OK - ${audioTracks.length} audio tracks`);
      
      // Log detailed track info
      audioTracks.forEach((track, index) => {
        const settings = track.getSettings();
        addDebugInfo(`📡 Track ${index}: enabled=${track.enabled}, muted=${track.muted}, state=${track.readyState}`);
        addDebugInfo(`🎛️ Settings: sampleRate=${settings.sampleRate}, channelCount=${settings.channelCount}`);
      });
      
      localStreamRef.current = stream;
      setCurrentRoom(room);
      addDebugInfo(`✅ STEP 7: Local stream and room set`);

      // Step 8: Setup audio analysis
      addDebugInfo('🔄 STEP 8: Setting up audio analysis');
      const cleanupAudioAnalysis = setupAudioAnalysis(stream);
      addDebugInfo(cleanupAudioAnalysis ? '✅ STEP 8: Audio analysis setup OK' : '⚠️ STEP 8: Audio analysis setup failed');
      
      // Step 9: Setup Supabase channel
      addDebugInfo(`🔄 STEP 9: Setting up Supabase channel: voice_${room.id}`);
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
          addDebugInfo('✅ STEP 9: Successfully subscribed to voice channel');
          setIsVoiceEnabled(true);
          
          // Test audio immediately
          addDebugInfo('🧪 STEP 10: Testing audio capabilities...');
          if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
              addDebugInfo(`🎵 Audio track test: enabled=${audioTrack.enabled}, muted=${audioTrack.muted}`);
              
              // Brief unmute test
              audioTrack.enabled = true;
              addDebugInfo('🔊 Temporarily enabled audio for test');
              
              setTimeout(() => {
                if (audioTrack) {
                  audioTrack.enabled = false;
                  addDebugInfo('🔇 Re-muted audio (default state)');
                }
              }, 1000);
              
              toast.success(`Joined ${room.name} - You are muted by default`);
              addDebugInfo('✅ JOIN COMPLETE: All steps successful');
            } else {
              addDebugInfo('❌ STEP 10 FAILED: No audio track found');
              toast.error('Audio track not available');
            }
          }
        } else if (status === 'CHANNEL_ERROR') {
          addDebugInfo('❌ STEP 9 FAILED: Channel subscription error');
          toast.error('Failed to connect to voice channel');
        } else if (status === 'CLOSED') {
          addDebugInfo('🔒 Channel closed');
        }
      });

      // Store cleanup function
      if (cleanupAudioAnalysis) {
        (channelRef.current as any).audioCleanup = cleanupAudioAnalysis;
      }

    } catch (error: any) {
      addDebugInfo(`❌ JOIN FAILED: ${error.message}`);
      console.error('Voice room join error:', error);
      
      // Enhanced error analysis
      if (error.name === 'NotAllowedError') {
        addDebugInfo('🚫 ERROR TYPE: Microphone access denied by user');
        toast.error('Microphone access denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        addDebugInfo('🎤 ERROR TYPE: No microphone found');
        toast.error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotSupportedError') {
        addDebugInfo('🚫 ERROR TYPE: Browser does not support audio capture');
        toast.error('Your browser does not support audio capture.');
      } else if (error.name === 'OverconstrainedError') {
        addDebugInfo('🎛️ ERROR TYPE: Audio constraints too restrictive');
        toast.error('Audio constraints could not be satisfied. Trying with basic settings...');
        
        // Retry with basic constraints
        try {
          addDebugInfo('🔄 RETRY: Attempting with basic audio constraints');
          const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = basicStream;
          setCurrentRoom(room);
          setIsVoiceEnabled(true);
          setupAudioAnalysis(basicStream);
          addDebugInfo('✅ RETRY SUCCESS: Basic audio working');
          toast.success(`Joined ${room.name} with basic audio settings`);
        } catch (retryError) {
          addDebugInfo(`❌ RETRY FAILED: ${retryError}`);
          toast.error('Failed to access microphone even with basic settings');
        }
      } else {
        addDebugInfo(`🚨 ERROR TYPE: Unknown - ${error.name}: ${error.message}`);
        toast.error('Failed to access microphone: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
      addDebugInfo('🔄 Cleared connecting state');
    }
  }, [isVoiceEnabled, checkBrowserCapabilities, getAudioConstraints, setupAudioAnalysis, enumerateAudioDevices, addDebugInfo, userId]);

  // Enhanced leave voice room
  const leaveVoiceRoom = useCallback(() => {
    addDebugInfo('🚪 CLEANUP: Starting leave voice room process');
    
    if (!isVoiceEnabled || !currentRoom) {
      addDebugInfo('❌ CLEANUP: No room to leave');
      return;
    }

    // Stop audio monitoring
    if (audioMonitorIntervalRef.current) {
      addDebugInfo('🛑 CLEANUP: Stopping audio monitoring');
      clearInterval(audioMonitorIntervalRef.current);
      audioMonitorIntervalRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      addDebugInfo('🛑 CLEANUP: Stopping local stream');
      localStreamRef.current.getTracks().forEach(track => {
        addDebugInfo(`🛑 Stopping track: ${track.kind}, enabled: ${track.enabled}`);
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Cleanup audio analysis
    if ((channelRef.current as any)?.audioCleanup) {
      addDebugInfo('🧹 CLEANUP: Running audio analysis cleanup');
      (channelRef.current as any).audioCleanup();
    }

    // Stop audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      addDebugInfo(`🔊 CLEANUP: Closing audio context (state: ${audioContextRef.current.state})`);
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      addDebugInfo('📡 CLEANUP: Unsubscribing from channel');
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

  // Enhanced mute toggle with debugging
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
    audioTrack.enabled = !newMutedState;
    setIsMuted(newMutedState);
    
    addDebugInfo(`✅ TOGGLE MUTE SUCCESS: track.enabled=${audioTrack.enabled}, muted=${newMutedState}`);
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
