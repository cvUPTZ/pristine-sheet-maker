import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WebRTCManager } from '@/utils/webrtcManager';

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
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  // Add debug info helper
  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const debugMessage = `[${timestamp}] ${message}`;
    console.log('🔍 VOICE DEBUG:', debugMessage);
    setDebugInfo(prev => [...prev.slice(-14), debugMessage]);
  }, []);

  // Create and manage remote audio elements
  const createRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
    addDebugInfo(`🔊 Creating remote audio for user: ${userId}`);
    
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.volume = 1.0;
    
    remoteAudiosRef.current.set(userId, audio);
    
    // Update connected trackers
    setConnectedTrackers(prev => {
      const existing = prev.find(t => t.userId === userId);
      if (existing) {
        return prev.map(t => t.userId === userId ? { ...t, isConnected: true } : t);
      }
      return [...prev, {
        userId,
        isMuted: false,
        isSpeaking: false,
        isConnected: true,
        username: `User ${userId.slice(-4)}`
      }];
    });
    
    onUserJoined?.(userId);
  }, [addDebugInfo, onUserJoined]);

  const removeRemoteAudio = useCallback((userId: string) => {
    addDebugInfo(`🔇 Removing remote audio for user: ${userId}`);
    
    const audio = remoteAudiosRef.current.get(userId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      remoteAudiosRef.current.delete(userId);
    }
    
    setConnectedTrackers(prev => prev.filter(t => t.userId !== userId));
    onUserLeft?.(userId);
  }, [addDebugInfo, onUserLeft]);

  // Setup audio analysis WITHOUT local playback
  const setupAudioAnalysis = useCallback((stream: MediaStream) => {
    addDebugInfo('🎵 Setting up audio analysis (monitoring only)');
    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
        addDebugInfo('▶️ Resumed audio context');
      }
      
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3;
      
      // ONLY connect source to analyser - NO connection to destination (speakers)
      sourceNodeRef.current.connect(analyserRef.current);
      
      addDebugInfo('✅ Audio pipeline: source -> analyser (NO local playback)');
      
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
        }, 100);
        
        addDebugInfo('✅ Audio monitoring started (level detection only)');
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

  // Initialize rooms
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
      }
    ];
    setAvailableRooms(rooms);
    addDebugInfo(`✅ ${rooms.length} voice rooms initialized`);
  }, [matchId, addDebugInfo]);

  // Handle WebRTC signaling messages
  const handleSignalingMessage = useCallback(async (event: any) => {
    const { type, senderId, data } = event.payload;
    
    if (senderId === userId || !webrtcManagerRef.current) return;
    
    addDebugInfo(`📨 Received ${type} from ${senderId}`);
    
    try {
      switch (type) {
        case 'user_joined':
          await webrtcManagerRef.current.createPeerConnection(senderId);
          const offer = await webrtcManagerRef.current.createOffer(senderId);
          
          channelRef.current?.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: { type: 'offer', senderId: userId, targetId: senderId, data: offer }
          });
          
          const iceCandidate = webrtcManagerRef.current.getPendingIceCandidate(senderId);
          if (iceCandidate) {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'webrtc_signal',
              payload: { type: 'ice_candidate', senderId: userId, targetId: senderId, data: iceCandidate }
            });
          }
          break;
          
        case 'offer':
          if (data.targetId !== userId) return;
          await webrtcManagerRef.current.createPeerConnection(senderId);
          const answer = await webrtcManagerRef.current.createAnswer(senderId, data.data);
          
          channelRef.current?.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: { type: 'answer', senderId: userId, targetId: senderId, data: answer }
          });
          
          const answerIceCandidate = webrtcManagerRef.current.getPendingIceCandidate(senderId);
          if (answerIceCandidate) {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'webrtc_signal',
              payload: { type: 'ice_candidate', senderId: userId, targetId: senderId, data: answerIceCandidate }
            });
          }
          break;
          
        case 'answer':
          if (data.targetId !== userId) return;
          await webrtcManagerRef.current.handleAnswer(senderId, data.data);
          break;
          
        case 'ice_candidate':
          if (data.targetId !== userId) return;
          await webrtcManagerRef.current.addIceCandidate(senderId, data.data);
          break;
          
        case 'user_left':
          webrtcManagerRef.current.closePeerConnection(senderId);
          removeRemoteAudio(senderId);
          break;
      }
    } catch (error) {
      addDebugInfo(`❌ WebRTC signaling error: ${error}`);
      console.error('WebRTC signaling error:', error);
    }
  }, [userId, addDebugInfo, removeRemoteAudio]);

  // Join voice room with WebRTC
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
      
      localStreamRef.current = stream;
      setCurrentRoom(room);
      
      // Setup audio analysis (monitoring only, no local playback)
      const audioCleanup = setupAudioAnalysis(stream);
      
      // Initialize WebRTC manager
      webrtcManagerRef.current = new WebRTCManager({
        localStream: stream,
        onRemoteStream: createRemoteAudio,
        onPeerDisconnected: removeRemoteAudio,
        onError: (error) => {
          addDebugInfo(`❌ WebRTC error: ${error.message}`);
          toast.error('Voice connection error: ' + error.message);
        }
      });
      
      // Setup Supabase channel
      channelRef.current = supabase.channel(`voice_${room.id}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });
      
      // Listen for WebRTC signaling
      channelRef.current.on('broadcast', { event: 'webrtc_signal' }, handleSignalingMessage);
      
      channelRef.current.subscribe(async (status: string) => {
        addDebugInfo(`📡 Channel status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setIsVoiceEnabled(true);
          addDebugInfo('✅ Voice room joined successfully');
          
          // Announce presence to other users
          channelRef.current?.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: { type: 'user_joined', senderId: userId }
          });
          
          toast.success(`Joined ${room.name} - You are muted by default`);
        } else if (status === 'CHANNEL_ERROR') {
          addDebugInfo('❌ Channel subscription error');
          toast.error('Failed to connect to voice channel');
        }
      });

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
  }, [isVoiceEnabled, setupAudioAnalysis, addDebugInfo, userId, handleSignalingMessage, createRemoteAudio, removeRemoteAudio]);

  // Leave voice room
  const leaveVoiceRoom = useCallback(() => {
    addDebugInfo('🚪 Leaving voice room');
    
    if (!isVoiceEnabled || !currentRoom) {
      return;
    }

    // Announce leaving to other users
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: { type: 'user_left', senderId: userId }
      });
    }

    // Stop audio monitoring
    if (audioMonitorIntervalRef.current) {
      clearInterval(audioMonitorIntervalRef.current);
      audioMonitorIntervalRef.current = null;
    }

    // Close all WebRTC connections
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.closeAllConnections();
      webrtcManagerRef.current = null;
    }

    // Stop all remote audio elements
    remoteAudiosRef.current.forEach((audio, userId) => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudiosRef.current.clear();

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
  }, [isVoiceEnabled, currentRoom, addDebugInfo, userId]);

  // Toggle mute by enabling/disabling the audio track
  const toggleMute = useCallback(() => {
    addDebugInfo(`🔇 TOGGLE MUTE: Current state=${isMuted ? 'MUTED' : 'UNMUTED'}`);
    
    if (!localStreamRef.current) {
      addDebugInfo('❌ No local stream available for mute control');
      toast.error('Audio system not ready');
      return;
    }
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) {
      addDebugInfo('❌ No audio track available');
      toast.error('No audio track found');
      return;
    }
    
    const newMutedState = !isMuted;
    audioTrack.enabled = !newMutedState;
    setIsMuted(newMutedState);
    
    addDebugInfo(`✅ MUTE STATE: ${newMutedState ? 'MUTED' : 'UNMUTED'}, track enabled=${audioTrack.enabled}`);
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
        
        addDebugInfo(`📊 STATE: enabled=${isVoiceEnabled}, muted=${isMuted}, connecting=${isConnecting}, room=${currentRoom?.name}, audio=${audioLevel.toFixed(3)}, stream=${streamInfo}, context=${contextInfo}, ${gainInfo}, peers=${connectedTrackers.length}`);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isVoiceEnabled, isMuted, isConnecting, currentRoom, audioLevel, connectedTrackers.length, addDebugInfo]);

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
