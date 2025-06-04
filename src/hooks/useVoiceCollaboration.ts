
import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { useToast } from '@/components/ui/use-toast';

interface ConnectedTracker {
  userId: string;
  username?: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  role?: string;
}

interface ConnectionQuality {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  rtt: number;
}

interface ConnectionMetrics {
  totalPeers: number;
  connectedPeers: number;
  reconnectionAttempts: number;
}

interface UseVoiceCollaborationProps {
  matchId: string;
  userId: string;
  userRole: string;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onRoomChanged?: (room: VoiceRoom | null) => void;
}

export const useVoiceCollaboration = ({
  matchId,
  userId,
  userRole,
  onUserJoined,
  onUserLeft,
  onRoomChanged
}: UseVoiceCollaborationProps) => {
  const { toast } = useToast();
  const voiceService = useRef(VoiceRoomService.getInstance());
  
  // Core state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [connectedTrackers, setConnectedTrackers] = useState<ConnectedTracker[]>([]);
  
  // Audio and connection state
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionQualities, setConnectionQualities] = useState<Map<string, ConnectionQuality>>(new Map());
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online');
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics | null>(null);
  
  // Admin status
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);

  // Initialize voice rooms on component mount
  useEffect(() => {
    const initializeRooms = async () => {
      if (!matchId || !userRole) {
        console.log('Missing matchId or userRole, skipping room initialization');
        return;
      }

      try {
        console.log('🏗️ Initializing voice rooms for match:', matchId);
        const rooms = await voiceService.current.initializeRoomsForMatch(matchId);
        const filteredRooms = rooms.filter(room => 
          room.permissions.includes(userRole) || room.permissions.includes('all')
        );
        
        console.log('✅ Available rooms for user role:', filteredRooms);
        setAvailableRooms(filteredRooms);
        
        if (filteredRooms.length > 0) {
          toast({
            title: "Voice System Ready",
            description: `${filteredRooms.length} voice rooms available for your role`,
          });
        }
      } catch (error) {
        console.error('❌ Failed to initialize voice rooms:', error);
        toast({
          title: "Voice System Error",
          description: "Failed to load voice rooms. Please try again.",
          variant: "destructive"
        });
      }
    };

    initializeRooms();
  }, [matchId, userRole, toast]);

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        setNetworkStatus('offline');
      } else {
        const connection = (navigator as any).connection;
        if (connection) {
          if (connection.effectiveType === '4g' && connection.downlink > 2) {
            setNetworkStatus('online');
          } else if (connection.effectiveType === '3g' || connection.downlink < 1) {
            setNetworkStatus('unstable');
          } else {
            setNetworkStatus('online');
          }
        } else {
          setNetworkStatus('online');
        }
      }
    };

    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isConnecting || networkStatus === 'offline') {
      console.log('Cannot join room: already connecting or offline');
      return;
    }

    setIsConnecting(true);
    setRetryAttempts(0);

    try {
      console.log('🚪 Attempting to join room:', room.name);
      
      const result = await voiceService.current.joinRoom(room.id, userId, userRole);
      
      if (result.success && result.room) {
        setCurrentRoom(result.room);
        setIsVoiceEnabled(true);
        setIsRoomAdmin(userRole === 'admin' || userRole === 'coordinator');
        
        // Initialize connection metrics
        setConnectionMetrics({
          totalPeers: 0,
          connectedPeers: 0,
          reconnectionAttempts: 0
        });

        onRoomChanged?.(result.room);
        
        toast({
          title: "Joined Voice Room",
          description: `Connected to ${result.room.name}`,
        });

        // Start fetching participants
        fetchRoomParticipants(result.room.id);
        
        console.log('✅ Successfully joined room:', result.room.name);
      } else {
        throw new Error(result.error || 'Failed to join room');
      }
    } catch (error: any) {
      console.error('❌ Failed to join voice room:', error);
      
      if (retryAttempts < 5) {
        setRetryAttempts(prev => prev + 1);
        setIsRecovering(true);
        
        // Exponential backoff retry
        setTimeout(() => {
          joinVoiceRoom(room);
        }, Math.pow(2, retryAttempts) * 1000);
      } else {
        toast({
          title: "Connection Failed",
          description: error.message || "Unable to join voice room after multiple attempts",
          variant: "destructive"
        });
        setIsRecovering(false);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, networkStatus, userId, userRole, retryAttempts, onRoomChanged, toast]);

  const leaveVoiceRoom = useCallback(async () => {
    if (!currentRoom) return;

    try {
      console.log('🚪 Leaving voice room:', currentRoom.name);
      
      const success = await voiceService.current.leaveRoom(currentRoom.id, userId);
      
      if (success) {
        setCurrentRoom(null);
        setIsVoiceEnabled(false);
        setConnectedTrackers([]);
        setIsRoomAdmin(false);
        setConnectionMetrics(null);
        setConnectionQualities(new Map());
        setRetryAttempts(0);
        setIsRecovering(false);
        
        onRoomChanged?.(null);
        
        toast({
          title: "Left Voice Room",
          description: "Disconnected from voice chat",
        });
        
        console.log('✅ Successfully left voice room');
      }
    } catch (error) {
      console.error('❌ Failed to leave voice room:', error);
      toast({
        title: "Disconnect Error",
        description: "Error leaving voice room",
        variant: "destructive"
      });
    }
  }, [currentRoom, userId, onRoomChanged, toast]);

  const toggleMute = useCallback(async () => {
    if (!currentRoom) return;

    try {
      const newMutedState = !isMuted;
      const success = await voiceService.current.updateParticipantStatus(
        currentRoom.id,
        userId,
        { is_muted: newMutedState }
      );

      if (success) {
        setIsMuted(newMutedState);
        console.log(`🎤 ${newMutedState ? 'Muted' : 'Unmuted'} microphone`);
      }
    } catch (error) {
      console.error('❌ Failed to toggle mute:', error);
    }
  }, [currentRoom, userId, isMuted]);

  const fetchRoomParticipants = useCallback(async (roomId: string) => {
    try {
      const participants = await voiceService.current.getRoomParticipants(roomId);
      
      const trackers: ConnectedTracker[] = participants
        .filter(p => p.user_id !== userId)
        .map(p => ({
          userId: p.user_id,
          username: p.user_name,
          isMuted: p.is_muted,
          isSpeaking: p.is_speaking,
          isConnected: true,
          role: p.user_role
        }));

      setConnectedTrackers(trackers);
      
      // Update connection qualities
      const qualities = new Map<string, ConnectionQuality>();
      participants.forEach(p => {
        if (p.user_id !== userId) {
          qualities.set(p.user_id, {
            quality: p.connection_quality,
            rtt: Math.floor(Math.random() * 100) + 50 // Simulated RTT
          });
        }
      });
      setConnectionQualities(qualities);
      
    } catch (error) {
      console.error('❌ Failed to fetch room participants:', error);
    }
  }, [userId]);

  // Simulate audio level (replace with real audio processing)
  useEffect(() => {
    if (!isVoiceEnabled || isMuted) {
      setAudioLevel(0);
      return;
    }

    const interval = setInterval(() => {
      // Simulate varying audio levels
      const level = Math.random() * 0.8 + 0.1;
      setAudioLevel(level);
    }, 100);

    return () => clearInterval(interval);
  }, [isVoiceEnabled, isMuted]);

  // Periodic participant updates
  useEffect(() => {
    if (!currentRoom) return;

    const interval = setInterval(() => {
      fetchRoomParticipants(currentRoom.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentRoom, fetchRoomParticipants]);

  return {
    // Core voice state
    isVoiceEnabled,
    isMuted,
    isConnecting,
    availableRooms,
    currentRoom,
    connectedTrackers,
    isRoomAdmin,
    
    // Audio and connection
    audioLevel,
    connectionQualities,
    retryAttempts,
    isRecovering,
    networkStatus,
    connectionMetrics,
    
    // Actions
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute
  };
};
