
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WebRTCManager } from '@/utils/webrtcManager';
import { AudioManager } from '@/utils/audioManager';
import { VoiceRoomService, VoiceRoom, VoiceParticipant } from '@/services/voiceRoomService';
import { PRODUCTION_VOICE_CONFIG } from '@/config/voiceConfig';

interface VoiceCollaborationOptions {
  matchId: string;
  userId: string;
  userRole: string;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onRoomChanged?: (room: VoiceRoom | null) => void;
}

interface TrackerVoiceStatus {
  userId: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  username?: string;
  role?: string;
  audioLevel?: number;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}

export const useVoiceCollaboration = ({
  matchId,
  userId,
  userRole,
  onUserJoined,
  onUserLeft,
  onRoomChanged
}: VoiceCollaborationOptions) => {
  console.log('🎤 useVoiceCollaboration: PRODUCTION INIT', { matchId, userId, userRole });
  
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedTrackers, setConnectedTrackers] = useState<TrackerVoiceStatus[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);
  const [connectionQualities, setConnectionQualities] = useState<Map<string, any>>(new Map());
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online');

  const channelRef = useRef<any>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const voiceRoomServiceRef = useRef<VoiceRoomService | null>(null);
  const isCleaningUpRef = useRef(false);
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize services
  useEffect(() => {
    audioManagerRef.current = AudioManager.getInstance();
    voiceRoomServiceRef.current = VoiceRoomService.getInstance();
    
    // Initialize rooms for the match
    if (voiceRoomServiceRef.current && matchId) {
      voiceRoomServiceRef.current.initializeRoomsForMatch(matchId).then(rooms => {
        setAvailableRooms(voiceRoomServiceRef.current!.getAvailableRooms(userRole));
      });
    }

    // Monitor network status
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (!isCleaningUpRef.current) {
        AudioManager.destroyInstance();
      }
    };
  }, [matchId, userRole]);

  // Enhanced remote audio management with production quality
  const createRemoteAudio = useCallback(async (userId: string, stream: MediaStream) => {
    console.log(`🔊 Creating production remote audio for: ${userId}`);
    
    try {
      // Remove existing audio
      const existingAudio = remoteAudiosRef.current.get(userId);
      if (existingAudio) {
        existingAudio.pause();
        existingAudio.srcObject = null;
        existingAudio.remove?.();
        remoteAudiosRef.current.delete(userId);
      }
      
      const audio = new Audio();
      audio.srcObject = stream;
      audio.volume = 1.0;
      audio.autoplay = true;
      
      // Production audio settings
      audio.muted = false;
      audio.crossOrigin = 'anonymous';
      
      // Add to DOM for proper playback
      audio.style.display = 'none';
      document.body.appendChild(audio);
      
      // Enhanced autoplay handling for production
      const attemptPlayback = async () => {
        try {
          // Resume audio context if needed
          if (typeof AudioContext !== 'undefined') {
            const audioContext = new AudioContext();
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
              console.log(`🎵 Audio context resumed for: ${userId}`);
            }
            audioContext.close();
          }
          
          await audio.play();
          console.log(`✅ Production audio playing for: ${userId}`);
          return true;
        } catch (error: any) {
          console.warn(`⚠️ Autoplay failed for ${userId}:`, error.message);
          return false;
        }
      };
      
      const playbackSuccess = await attemptPlayback();
      
      if (!playbackSuccess) {
        // Production fallback for autoplay restrictions
        const enableAudioOnInteraction = async () => {
          try {
            await audio.play();
            console.log(`🎵 Audio enabled after interaction for: ${userId}`);
            toast.success(`Audio enabled for participant ${userId.slice(-4)}`);
            
            // Remove event listeners after success
            ['click', 'touchstart', 'keydown'].forEach(event => {
              document.removeEventListener(event, enableAudioOnInteraction);
            });
          } catch (error: any) {
            console.error(`❌ Failed to enable audio for ${userId}:`, error);
          }
        };
        
        ['click', 'touchstart', 'keydown'].forEach(event => {
          document.addEventListener(event, enableAudioOnInteraction, { once: true });
        });
        
        toast.info(`Click anywhere to enable audio for participant ${userId.slice(-4)}`);
      }
      
      // Production audio monitoring
      audio.addEventListener('loadstart', () => console.log(`📡 Audio loading for: ${userId}`));
      audio.addEventListener('canplay', () => console.log(`🎵 Audio ready for: ${userId}`));
      audio.addEventListener('error', (e) => console.error(`❌ Audio error for ${userId}:`, e));
      audio.addEventListener('stalled', () => console.warn(`⚠️ Audio stalled for: ${userId}`));
      
      remoteAudiosRef.current.set(userId, audio);
      
      // Update tracker status
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
          username: `Participant ${userId.slice(-4)}`,
          role: 'tracker',
          connectionQuality: 'good'
        }];
      });
      
      onUserJoined?.(userId);
      
    } catch (error: any) {
      console.error(`❌ Failed to create remote audio for ${userId}:`, error);
      toast.error(`Failed to connect audio for participant ${userId.slice(-4)}`);
    }
  }, [onUserJoined]);

  const removeRemoteAudio = useCallback((userId: string) => {
    console.log(`🔇 Removing remote audio for: ${userId}`);
    
    const audio = remoteAudiosRef.current.get(userId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove?.();
      remoteAudiosRef.current.delete(userId);
    }
    
    setConnectedTrackers(prev => prev.filter(t => t.userId !== userId));
    onUserLeft?.(userId);
  }, [onUserLeft]);

  // Production-ready room joining with comprehensive error handling
  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isConnecting || isVoiceEnabled || networkStatus === 'offline') {
      console.warn('❌ Cannot join room:', { isConnecting, isVoiceEnabled, networkStatus });
      return;
    }

    console.log(`🚪 Joining production voice room: ${room.name}`);
    setIsConnecting(true);
    setRetryAttempts(0);
    
    const attemptJoin = async (attempt: number = 1): Promise<void> => {
      try {
        console.log(`🔄 Join attempt ${attempt}/${PRODUCTION_VOICE_CONFIG.reconnectionAttempts}`);
        
        // Check room availability through service
        const joinResult = await voiceRoomServiceRef.current!.joinRoom(room.id, userId, userRole);
        if (!joinResult.success) {
          throw new Error(joinResult.error || 'Failed to join room');
        }

        // Initialize audio system
        if (!audioManagerRef.current) {
          throw new Error('AudioManager not available');
        }

        await audioManagerRef.current.initialize({
          onAudioLevel: setAudioLevel,
          onError: (error) => {
            console.error('❌ AudioManager error:', error);
            toast.error('Audio system error: ' + error.message);
          }
        });

        // Get user media with production constraints
        const stream = await audioManagerRef.current.getUserMedia(
          PRODUCTION_VOICE_CONFIG.audioConstraints
        );

        console.log('🎤 Audio stream acquired with production settings');
        await audioManagerRef.current.setupAudioMonitoring(stream);
        
        // Initialize WebRTC manager
        webrtcManagerRef.current = new WebRTCManager({
          localStream: stream,
          onRemoteStream: createRemoteAudio,
          onPeerDisconnected: removeRemoteAudio,
          onError: (error) => {
            console.error('❌ WebRTC error:', error);
            toast.error('Voice connection error: ' + error.message);
          },
          onConnectionQuality: (userId, quality) => {
            setConnectionQualities(prev => new Map(prev).set(userId, quality));
            
            // Update tracker quality
            setConnectedTrackers(prev => prev.map(t => 
              t.userId === userId ? { ...t, connectionQuality: quality.quality } : t
            ));
          },
          onDataChannel: (userId, channel) => {
            console.log(`📱 Data channel established with ${userId}`);
          }
        });

        // Start production monitoring
        webrtcManagerRef.current.startProductionMonitoring();
        
        // Setup Supabase channel with production config
        channelRef.current = supabase.channel(`voice_production_${room.id}`, {
          config: {
            presence: { key: userId },
            broadcast: { self: true }
          },
        });
        
        channelRef.current.on('broadcast', { event: 'webrtc_signal' }, handleSignalingMessage);
        channelRef.current.on('broadcast', { event: 'room_event' }, handleRoomEvent);
        
        channelRef.current.subscribe(async (status: string) => {
          console.log(`📡 Channel status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            setCurrentRoom(joinResult.room!);
            setIsVoiceEnabled(true);
            setIsRoomAdmin(userRole === 'admin');
            
            // Announce presence
            channelRef.current?.send({
              type: 'broadcast',
              event: 'webrtc_signal',
              payload: { type: 'user_joined', senderId: userId, userRole }
            });
            
            // Announce to room service
            channelRef.current?.send({
              type: 'broadcast',
              event: 'room_event',
              payload: { type: 'user_joined', userId, roomId: room.id, userRole }
            });
            
            console.log(`✅ Successfully joined production room: ${room.name}`);
            toast.success(`Joined ${room.name} - You are muted by default`);
            
            onRoomChanged?.(joinResult.room!);
          } else if (status === 'CHANNEL_ERROR') {
            throw new Error('Channel subscription failed');
          }
        });

      } catch (error: any) {
        console.error(`❌ Join attempt ${attempt} failed:`, error);
        
        if (attempt < PRODUCTION_VOICE_CONFIG.reconnectionAttempts) {
          setRetryAttempts(attempt);
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          console.log(`🔄 Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptJoin(attempt + 1);
        } else {
          throw error;
        }
      }
    };

    try {
      await attemptJoin();
    } catch (error: any) {
      console.error('❌ All join attempts failed:', error);
      
      // Clean up on failure
      await cleanupVoiceResources();
      
      // Production error handling
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please enable microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone detected. Please connect a microphone and try again.');
      } else if (error.message.includes('permissions')) {
        toast.error('You do not have permission to join this room.');
      } else if (error.message.includes('capacity')) {
        toast.error('This room is currently full. Please try again later.');
      } else {
        toast.error(`Failed to join voice room: ${error.message}`);
      }
    } finally {
      setIsConnecting(false);
      setRetryAttempts(0);
    }
  }, [isConnecting, isVoiceEnabled, networkStatus, userId, userRole, createRemoteAudio, removeRemoteAudio, onRoomChanged]);

  // Enhanced signaling message handler
  const handleSignalingMessage = useCallback(async (event: any) => {
    const { type, senderId, data, userRole } = event.payload;
    
    if (senderId === userId || !webrtcManagerRef.current) return;
    
    console.log(`📨 Received ${type} from ${senderId} (${userRole})`);
    
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
      console.error(`❌ Signaling error:`, error);
      setIsRecovering(true);
      setTimeout(() => setIsRecovering(false), 5000);
    }
  }, [userId, removeRemoteAudio]);

  // Room event handler
  const handleRoomEvent = useCallback(async (event: any) => {
    const { type, userId: eventUserId, roomId } = event.payload;
    
    if (!voiceRoomServiceRef.current || !currentRoom) return;
    
    switch (type) {
      case 'user_joined':
        if (eventUserId !== userId) {
          console.log(`👤 User ${eventUserId} joined room ${roomId}`);
        }
        break;
      case 'user_left':
        if (eventUserId !== userId) {
          console.log(`👋 User ${eventUserId} left room ${roomId}`);
        }
        break;
    }
  }, [userId, currentRoom]);

  // Enhanced mute toggle with production feedback
  const toggleMute = useCallback(async () => {
    if (!isVoiceEnabled || !audioManagerRef.current) return;
    
    try {
      const newMutedState = !isMuted;
      await audioManagerRef.current.setMuted(newMutedState);
      setIsMuted(newMutedState);
      
      // Update room service
      if (currentRoom && voiceRoomServiceRef.current) {
        await voiceRoomServiceRef.current.updateParticipantStatus(currentRoom.id, userId, {
          isMuted: newMutedState
        });
      }
      
      // Broadcast mute status via data channel
      if (webrtcManagerRef.current) {
        connectedTrackers.forEach(tracker => {
          webrtcManagerRef.current!.sendDataChannelMessage(tracker.userId, {
            type: 'mute_status',
            isMuted: newMutedState
          });
        });
      }
      
      console.log(`🎤 Mute status changed to: ${newMutedState}`);
      toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
      
    } catch (error: any) {
      console.error('❌ Failed to toggle mute:', error);
      toast.error('Failed to change microphone status');
    }
  }, [isVoiceEnabled, isMuted, currentRoom, userId, connectedTrackers]);

  // Production cleanup with comprehensive resource management
  const cleanupVoiceResources = useCallback(async () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    console.log('🧹 Production voice cleanup initiated');
    
    try {
      // Clear reconnection timeout
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
        reconnectionTimeoutRef.current = null;
      }

      // Leave room in service
      if (currentRoom && voiceRoomServiceRef.current) {
        await voiceRoomServiceRef.current.leaveRoom(currentRoom.id, userId);
      }

      // Announce leaving
      if (channelRef.current && isVoiceEnabled) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { type: 'user_leaving', senderId: userId }
        });
        
        channelRef.current.send({
          type: 'broadcast',
          event: 'room_event',
          payload: { type: 'user_left', userId, roomId: currentRoom?.id }
        });
      }

      // Close WebRTC connections
      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.closeAllConnections();
        webrtcManagerRef.current = null;
      }

      // Clean up audio
      remoteAudiosRef.current.forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
        audio.remove?.();
      });
      remoteAudiosRef.current.clear();

      // Stop audio manager
      if (audioManagerRef.current) {
        audioManagerRef.current.stopAudioLevelMonitoring();
        audioManagerRef.current.stopCurrentStream();
      }

      // Unsubscribe from channel
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Reset state
      setIsVoiceEnabled(false);
      setIsMuted(true);
      setConnectedTrackers([]);
      setCurrentRoom(null);
      setConnectionQualities(new Map());
      setAudioLevel(0);
      setIsRecovering(false);
      setRetryAttempts(0);
      
      onRoomChanged?.(null);
      
      console.log('✅ Production voice cleanup completed');
      
    } catch (error: any) {
      console.error('❌ Error during cleanup:', error);
    } finally {
      isCleaningUpRef.current = false;
    }
  }, [currentRoom, userId, isVoiceEnabled, onRoomChanged]);

  // Leave room function
  const leaveVoiceRoom = useCallback(async () => {
    console.log('🚪 Leaving voice room');
    await cleanupVoiceResources();
    toast.info('Left voice room');
  }, [cleanupVoiceResources]);

  // Periodic room cleanup
  useEffect(() => {
    if (!voiceRoomServiceRef.current) return;
    
    const cleanupInterval = setInterval(() => {
      voiceRoomServiceRef.current!.cleanupInactiveParticipants();
    }, 60000); // Every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  // Network status monitoring
  useEffect(() => {
    if (networkStatus === 'offline' && isVoiceEnabled) {
      console.warn('📡 Network offline - entering recovery mode');
      setIsRecovering(true);
      toast.warning('Network connection lost - attempting to recover...');
    } else if (networkStatus === 'online' && isRecovering) {
      console.log('📡 Network back online - recovering connections');
      setIsRecovering(false);
      toast.success('Network connection restored');
      
      // Auto-reconnect logic could go here
    }
  }, [networkStatus, isVoiceEnabled, isRecovering]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isVoiceEnabled) {
        cleanupVoiceResources();
      }
    };
  }, [isVoiceEnabled, cleanupVoiceResources]);

  return {
    // Core state
    isVoiceEnabled,
    isMuted,
    isConnecting,
    connectedTrackers,
    audioLevel,
    currentRoom,
    availableRooms,
    isRoomAdmin,
    connectionQualities,
    retryAttempts,
    isRecovering,
    networkStatus,
    
    // Actions
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    
    // Production metrics
    connectionMetrics: webrtcManagerRef.current?.getConnectionMetrics() || {}
  };
};
