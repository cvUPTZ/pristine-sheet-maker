import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WebRTCManager } from '@/utils/webrtcManager';
import { AudioManager } from '@/utils/audioManager';

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
  const [connectionQualities, setConnectionQualities] = useState<Map<string, any>>(new Map());

  const channelRef = useRef<any>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const isCleaningUpRef = useRef(false);

  // Add debug info helper
  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const debugMessage = `[${timestamp}] ${message}`;
    console.log('🔍 VOICE DEBUG:', debugMessage);
    setDebugInfo(prev => [...prev.slice(-14), debugMessage]);
  }, []);

  // Initialize AudioManager
  useEffect(() => {
    audioManagerRef.current = AudioManager.getInstance();
    
    return () => {
      if (audioManagerRef.current && !isCleaningUpRef.current) {
        AudioManager.destroyInstance();
      }
    };
  }, []);

  // IMPROVED: Create and manage remote audio elements with better autoplay handling
  const createRemoteAudio = useCallback(async (userId: string, stream: MediaStream) => {
    addDebugInfo(`🔊 Creating remote audio for user: ${userId}`);
    
    try {
      // Remove existing audio if any
      const existingAudio = remoteAudiosRef.current.get(userId);
      if (existingAudio) {
        existingAudio.pause();
        existingAudio.srcObject = null;
        remoteAudiosRef.current.delete(userId);
        addDebugInfo(`🗑️ Removed existing audio for: ${userId}`);
      }
      
      const audio = new Audio();
      audio.srcObject = stream;
      audio.volume = 1.0;
      audio.muted = false;
      
      // Handle autoplay restrictions with better error handling
      try {
        await audio.play();
        addDebugInfo(`✅ Started playing audio for: ${userId}`);
      } catch (playError: any) {
        addDebugInfo(`⚠️ Autoplay blocked for ${userId}: ${playError.message}`);
        
        // Set up user interaction listener - Fixed TypeScript error
        const playOnInteraction = async () => {
          try {
            await audio.play();
            addDebugInfo(`🎵 Audio started after user interaction for: ${userId}`);
          } catch (e: any) {
            addDebugInfo(`❌ Still can't play audio for ${userId}: ${e.message}`);
          }
          document.removeEventListener('click', playOnInteraction);
          document.removeEventListener('touchstart', playOnInteraction);
        };
        
        document.addEventListener('click', playOnInteraction);
        document.addEventListener('touchstart', playOnInteraction);
      }
      
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
      
    } catch (error: any) {
      addDebugInfo(`❌ Failed to create remote audio for ${userId}: ${error.message}`);
      console.error('Remote audio creation error:', error);
    }
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

  // Handle WebRTC signaling messages with improved error handling
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
          
          // Send ICE candidates after a short delay to ensure peer is ready
          setTimeout(() => {
            const candidates = webrtcManagerRef.current?.getPendingIceCandidates(senderId) || [];
            candidates.forEach(candidate => {
              channelRef.current?.send({
                type: 'broadcast',
                event: 'webrtc_signal',
                payload: { type: 'ice_candidate', senderId: userId, targetId: senderId, data: candidate }
              });
            });
          }, 100);
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
          
          // Send ICE candidates after answer
          setTimeout(() => {
            const candidates = webrtcManagerRef.current?.getPendingIceCandidates(senderId) || [];
            candidates.forEach(candidate => {
              channelRef.current?.send({
                type: 'broadcast',
                event: 'webrtc_signal',
                payload: { type: 'ice_candidate', senderId: userId, targetId: senderId, data: candidate }
              });
            });
          }, 100);
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
        case 'user_leaving':
          await webrtcManagerRef.current.closePeerConnection(senderId);
          removeRemoteAudio(senderId);
          break;
      }
    } catch (error: any) {
      addDebugInfo(`❌ WebRTC signaling error: ${error.message}`);
      console.error('WebRTC signaling error:', error);
    }
  }, [userId, addDebugInfo, removeRemoteAudio]);

  // Join voice room with improved sequencing
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isConnecting || isVoiceEnabled) {
      addDebugInfo(`❌ Already connecting or connected`);
      return;
    }

    addDebugInfo(`🚪 Starting join process for room: ${room.name}`);
    setIsConnecting(true);
    
    try {
      // Step 1: Initialize AudioManager
      if (!audioManagerRef.current) {
        throw new Error('AudioManager not available');
      }

      await audioManagerRef.current.initialize({
        onAudioLevel: setAudioLevel,
        onError: (error) => {
          addDebugInfo(`❌ AudioManager error: ${error.message}`);
          toast.error('Audio system error: ' + error.message);
        }
      });

      // Step 2: Get user media
      addDebugInfo('🎤 Requesting microphone access...');
      const stream = await audioManagerRef.current.getUserMedia(
        audioManagerRef.current.getStreamConstraints()
      );

      // Step 3: Setup audio monitoring (no local playback)
      await audioManagerRef.current.setupAudioMonitoring(stream);
      
      // Step 4: Initialize WebRTC manager with connection monitoring
      webrtcManagerRef.current = new WebRTCManager({
        localStream: stream,
        onRemoteStream: createRemoteAudio,
        onPeerDisconnected: removeRemoteAudio,
        onError: (error) => {
          addDebugInfo(`❌ WebRTC error: ${error.message}`);
          toast.error('Voice connection error: ' + error.message);
        },
        onConnectionQuality: (userId, quality) => {
          setConnectionQualities(prev => new Map(prev).set(userId, quality));
          
          if (quality.quality === 'poor') {
            addDebugInfo(`⚠️ Poor connection quality with ${userId}`);
            toast.warning(`Poor voice quality with ${userId.slice(-4)}`);
          }
        }
      });

      // Start health monitoring
      webrtcManagerRef.current.startHealthMonitoring();
      
      // Step 5: Setup Supabase channel
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
          setCurrentRoom(room);
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
          throw new Error('Channel subscription failed');
        }
      });

    } catch (error: any) {
      addDebugInfo(`❌ JOIN FAILED: ${error.message}`);
      console.error('Voice room join error:', error);
      
      // Cleanup on failure
      await cleanupVoiceResources();
      
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone and try again.');
      } else {
        toast.error('Failed to join voice room: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isVoiceEnabled, addDebugInfo, userId, handleSignalingMessage, createRemoteAudio, removeRemoteAudio]);

  // Improved cleanup sequence
  const cleanupVoiceResources = useCallback(async () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    addDebugInfo('🧹 Starting voice resources cleanup');
    
    try {
      // Step 1: Stop WebRTC connections
      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.closeAllConnections();
        webrtcManagerRef.current = null;
      }

      // Step 2: Stop all remote audio elements
      remoteAudiosRef.current.forEach((audio, userId) => {
        audio.pause();
        audio.srcObject = null;
      });
      remoteAudiosRef.current.clear();

      // Step 3: Cleanup AudioManager
      if (audioManagerRef.current) {
        await audioManagerRef.current.cleanup();
      }

      // Step 4: Unsubscribe from channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      addDebugInfo('✅ Voice resources cleanup completed');
      
    } catch (error: any) {
      addDebugInfo(`❌ Cleanup error: ${error.message}`);
      console.error('Cleanup error:', error);
    } finally {
      isCleaningUpRef.current = false;
    }
  }, [addDebugInfo]);

  // Leave voice room with proper sequencing
  const leaveVoiceRoom = useCallback(async () => {
    if (!isVoiceEnabled || !currentRoom) {
      return;
    }

    addDebugInfo('🚪 Leaving voice room');
    
    // Announce leaving to other users
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: { type: 'user_leaving', senderId: userId }
      });
      
      // Wait a moment for the message to be sent
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const roomName = currentRoom.name;
    
    // Reset state first
    setIsVoiceEnabled(false);
    setConnectedTrackers([]);
    setAudioLevel(0);
    setIsMuted(true);
    setCurrentRoom(null);
    setIsRoomAdmin(false);
    
    // Then cleanup resources
    await cleanupVoiceResources();
    
    addDebugInfo(`✅ Left voice room: ${roomName}`);
    toast.info(`Left ${roomName}`);
  }, [isVoiceEnabled, currentRoom, addDebugInfo, userId, cleanupVoiceResources]);

  // Toggle mute using AudioManager
  const toggleMute = useCallback(() => {
    if (!audioManagerRef.current || !audioManagerRef.current.isStreamActive()) {
      addDebugInfo('❌ No active audio stream for mute control');
      toast.error('Audio system not ready');
      return;
    }
    
    const newMutedState = !isMuted;
    const success = audioManagerRef.current.muteStream(newMutedState);
    
    if (success) {
      setIsMuted(newMutedState);
      addDebugInfo(`✅ MUTE STATE: ${newMutedState ? 'MUTED' : 'UNMUTED'}`);
      toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
    } else {
      addDebugInfo('❌ Failed to toggle mute state');
      toast.error('Failed to toggle microphone');
    }
  }, [isMuted, addDebugInfo]);

  // Legacy compatibility functions
  const startVoiceCollaboration = useCallback(async () => {
    const mainRoom = availableRooms.find(room => room.id.includes('_main'));
    if (mainRoom) {
      await joinVoiceRoom(mainRoom);
    }
  }, [availableRooms, joinVoiceRoom]);

  const stopVoiceCollaboration = useCallback(async () => {
    await leaveVoiceRoom();
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
    
    // Enhanced features
    connectionQualities,
    
    // Debug information
    debugInfo
  };
};
