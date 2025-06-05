
import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { useToast } from '@/components/ui/use-toast';
import { WebRTCManager } from '@/services/WebRTCManager';
import { supabase } from '@/integrations/supabase/client';
import { AudioManager } from '@/utils/audioManager'; // Ensure AudioManager is imported


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
  const initializedRef = useRef(false);
  const webRTCManager = useRef(WebRTCManager.getInstance());
  const audioManager = useRef(AudioManager.getInstance());
  
  // Core state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [connectedTrackers, setConnectedTrackers] = useState<ConnectedTracker[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerStatuses, setPeerStatuses] = useState<Map<string, string>>(new Map());
  
  // Audio and connection state
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionQualities, setConnectionQualities] = useState<Map<string, ConnectionQuality>>(new Map());
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online');
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics | null>(null);
  
  // Admin status
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);

  // Initialize WebRTCManager
  useEffect(() => {
    if (userId) { // Ensure userId is available
        webRTCManager.current.initialize(supabase, userId);
    }
  }, [userId]);

  // Set up WebRTCManager callbacks
  useEffect(() => {
    const manager = webRTCManager.current;
    const oldOnRemoteStreamAdded = manager.onRemoteStreamAdded;
    const oldOnRemoteStreamRemoved = manager.onRemoteStreamRemoved;
    const oldOnPeerStatusChanged = manager.onPeerStatusChanged;

    manager.onRemoteStreamAdded = (peerId, stream) => {
        console.log(`[useVoiceCollaboration] Remote stream added from ${peerId}`, stream);
        setRemoteStreams(prev => new Map(prev).set(peerId, stream));
    };
    manager.onRemoteStreamRemoved = (peerId) => {
        console.log(`[useVoiceCollaboration] Remote stream removed from ${peerId}`);
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
        });
        setPeerStatuses(prev => {
              const newMap = new Map(prev);
              newMap.delete(peerId);
              return newMap;
        });
    };
    manager.onPeerStatusChanged = (peerId, status) => {
          console.log(`[useVoiceCollaboration] Peer ${peerId} status changed: ${status}`);
          setPeerStatuses(prev => new Map(prev).set(peerId, status));
    };

    return () => {
        // Restore old callbacks or set to no-op if appropriate for your singleton
        manager.onRemoteStreamAdded = oldOnRemoteStreamAdded;
        manager.onRemoteStreamRemoved = oldOnRemoteStreamRemoved;
        manager.onPeerStatusChanged = oldOnPeerStatusChanged;
    };
  }, []); // Runs once

  // Initialize voice rooms on component mount - only once & main cleanup
  useEffect(() => {
    if (initializedRef.current || !matchId || !userRole) {
      return;
    }

    initializedRef.current = true;

    const initializeRooms = async () => {
      try {
        console.log('🏗️ Initializing voice rooms for match:', matchId, 'userRole:', userRole);
        const rooms = await voiceService.current.initializeRoomsForMatch(matchId);
        
        // For trackers, show all available rooms (more permissive)
        const filteredRooms = rooms.filter(room => {
          // Always allow trackers to see rooms
          if (userRole === 'tracker') return true;
          
          // For other roles, check permissions
          return room.permissions.includes(userRole) || room.permissions.includes('all');
        });
        
        console.log('✅ Available rooms for user role:', userRole, filteredRooms);
        setAvailableRooms(filteredRooms);
        
        if (filteredRooms.length > 0) {
          toast({
            title: "Voice System Ready",
            description: `${filteredRooms.length} voice rooms available for ${userRole}s`,
          });
        } else {
          console.log('⚠️ No rooms available for role:', userRole);
          toast({
            title: "Voice System Limited",
            description: "Voice rooms are being initialized. Please try again in a moment.",
            variant: "default"
          });
        }
      } catch (error) {
        console.error('❌ Failed to initialize voice rooms:', error);
        toast({
          title: "Voice System Notice",
          description: "Running in demonstration mode. Some features may be limited.",
          variant: "default"
        });
      }
    };

    initializeRooms();

    // Main unmount cleanup
    return () => {
        if (webRTCManager.current && webRTCManager.current.getCurrentRoomId()) { 
             webRTCManager.current.leaveRoom();
        }
        // AudioManager is a singleton, typically not destroyed here unless app-wide cleanup
        // if (audioManager.current) {
        //   audioManager.current.cleanup(); // Or a more specific method if it exists
        // }
    };
  }, [matchId, userRole, toast]); // Added toast to dependencies

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

  // Create a stable reference for the join room function
  const joinRoomInternal = useCallback(async (room: VoiceRoom, attemptNumber: number = 1) => {
    try {
      console.log(`[joinRoomInternal] Attempt #${attemptNumber} to join room: ${room.name} (ID: ${room.id}) as ${userRole}`);
      
      const result = await voiceService.current.joinRoom(room.id, userId, userRole);
      
      if (result.success && result.room) {
        // --- WebRTC Integration: Microphone Access & Join ---
        if (!audioManager.current.isStreamActive()) {
            try {
                if(!audioManager.current.getAudioContext() || audioManager.current.getAudioContext()?.state === 'closed') {
                    await audioManager.current.initialize({ 
                        onAudioLevel: setAudioLevel, // Assuming setAudioLevel is available
                        onError: (e: Error) => { 
                            console.error("AudioManager initialization error in joinRoomInternal:", e);
                            toast({ title: "Audio System Error", description: e.message, variant: "destructive" });
                        }
                    });
                }
                await audioManager.current.getUserMedia(); // Use default constraints or pass specific ones
                // If audio level monitoring needs to be (re)started with the new stream:
                if (audioManager.current.getCurrentStream()) {
                    await audioManager.current.setupAudioMonitoring(audioManager.current.getCurrentStream()!);
                } else {
                     console.warn("[useVoiceCollaboration] No stream available after getUserMedia to setup audio monitoring.")
                }

            } catch (micError: any) {
                console.error("Microphone permission error before WebRTC join:", micError);
                toast({ title: "Microphone Required", description: `Microphone access is required for voice chat. ${micError.message}`, variant: "destructive"});
                setIsConnecting(false); // Reset connecting state
                throw micError; // Propagate error to stop further execution in joinRoomInternal
            }
        }
        if (!audioManager.current.isStreamActive()) {
             toast({ title: "Microphone Error", description: "Local audio stream is not available. Cannot join voice chat.", variant: "destructive"});
             setIsConnecting(false);
             throw new Error("Local audio stream not available for WebRTC.");
        }

        const initialParticipants = await voiceService.current.getRoomParticipants(result.room.id);
        // Ensure user roles are passed if your WebRTCManager uses them for anything (e.g. permissions within WebRTC context)
        await webRTCManager.current.joinRoom(result.room.id, initialParticipants.map(p => ({ userId: p.user_id /*, userRole: p.user_role */ })));
        // --- End WebRTC Integration ---

        setCurrentRoom(result.room);
        setIsVoiceEnabled(true);
        setIsRoomAdmin(userRole === 'admin' || userRole === 'coordinator');
        
        // Initialize connection metrics
        setConnectionMetrics({
          totalPeers: initialParticipants.length -1, // Exclude self
          connectedPeers: 0, // WebRTC will update this
          reconnectionAttempts: 0
        });

        onRoomChanged?.(result.room);
        
        toast({
          title: "Joined Voice Room",
          description: `Connected to ${result.room.name} as ${userRole}`,
        });

        // Start fetching participants (may be redundant if WebRTC handles this, but good for initial state)
        fetchRoomParticipants(result.room.id);
        
        console.log(`[joinRoomInternal] Successfully joined room: ${result.room.name} after ${attemptNumber} attempt(s).`);
        setRetryAttempts(0); // Reset retries on success
        setIsRecovering(false);
        return true;
      } else {
        // This part of the original code handles failure to join the metadata room
        // WebRTC join failure is handled by exceptions within the try block above
        console.error(`[joinRoomInternal] Attempt #${attemptNumber} failed to join metadata room. Error: ${result.error}`);
        throw new Error(result.error || 'Failed to join metadata room');
      }
    } catch (error: any) {
      // This catch block now handles errors from both metadata room join AND WebRTC setup/join
      console.error(`[joinRoomInternal] Error during voice room join process (attempt #${attemptNumber}):`, error.message);
      // If the error is from WebRTC (e.g. mic permission), it would have already shown a toast.
      // Avoid showing a generic "Retrying" toast if a specific mic error was already shown.
      if (error.message.includes("Microphone") || error.message.includes("Local audio stream")) {
        // setIsConnecting(false) was already called.
        // No further retries for mic/stream errors here as they require user action.
      } else if (attemptNumber < 3) {
        setIsRecovering(true);
        toast({
          title: "Retrying Connection",
          description: `Attempt ${attemptNumber + 1}/3 - ${error.message}`,
          variant: "default"
        });
        setTimeout(() => {
          joinRoomInternal(room, attemptNumber + 1);
        }, 2000);
      } else {
        console.error(`[joinRoomInternal] All ${attemptNumber} attempts failed. Final error: ${error.message}`);
        toast({
          title: "Connection Failed",
          description: error.message.includes("Microphone") || error.message.includes("Local audio stream") 
            ? error.message // Show specific error
            : "Unable to join voice room. The system may be in demonstration mode or network issues.",
          variant: "destructive" // More prominent for final failure
        });
        setIsRecovering(false);
        setRetryAttempts(0);
        setIsConnecting(false); // Ensure this is reset
      }
      return false; // Indicate failure
    }
  }, [userId, userRole, onRoomChanged, toast, fetchRoomParticipants, setAudioLevel]); // Added fetchRoomParticipants and setAudioLevel

  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isConnecting) {
      console.log('Already connecting to a room');
      return;
    }

    setIsConnecting(true);
    setRetryAttempts(0);
    
    const success = await joinRoomInternal(room, 1);
    if (success) {
      setIsConnecting(false);
    }
  }, [isConnecting, joinRoomInternal]);

  const leaveVoiceRoom = useCallback(async () => {
    if (!currentRoom) return;

    try {
      console.log('🚪 Leaving voice room:', currentRoom.name);
      
      await webRTCManager.current.leaveRoom(); // WebRTC cleanup
      setRemoteStreams(new Map());
      setPeerStatuses(new Map());

      const success = await voiceService.current.leaveRoom(currentRoom.id, userId); // Metadata cleanup
      
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
        
        console.log('✅ Successfully left voice room (including WebRTC)');
      } else {
        // Handle case where metadata leave fails but WebRTC leave might have succeeded
        console.warn('⚠️ WebRTC leave called, but metadata leaveRoom failed. State might be inconsistent.');
        toast({
          title: "Partial Disconnect",
          description: "Disconnected from voice channels, but server update failed.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Failed to leave voice room (WebRTC or metadata):', error);
      toast({
        title: "Disconnect Error",
        description: `Error leaving voice room: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    }
  }, [currentRoom, userId, onRoomChanged, toast]);

  const toggleMute = useCallback(async () => {
    if (!currentRoom) return;

    const newMutedState = !isMuted;
    try {
      // Update local audio state via AudioManager first
      audioManager.current.setMuted(newMutedState);
      setIsMuted(newMutedState); // Optimistically update UI

      // Then, update the backend/metadata state
      const success = await voiceService.current.updateParticipantStatus(
        currentRoom.id,
        userId,
        { is_muted: newMutedState } // This remains for other users' view of mute state
      );

      if (success) {
        console.log(`🎤 ${newMutedState ? 'Muted' : 'Unmuted'} microphone. Local: ${audioManager.current.isMuted()}. DB updated.`);
      } else {
        // Revert optimistic update if DB fails
        audioManager.current.setMuted(!newMutedState);
        setIsMuted(!newMutedState);
        toast({ title: "Mute Sync Error", description: "Could not sync mute state with server.", variant: "destructive"});
        console.warn('🎤 Failed to update mute state in DB. Reverted local state.');
      }
    } catch (error) {
      // Revert optimistic update on any error
      audioManager.current.setMuted(!newMutedState);
      setIsMuted(!newMutedState);
      console.error('❌ Failed to toggle mute:', error);
      toast({ title: "Mute Error", description: "An error occurred while toggling mute.", variant: "destructive"});
    }
  }, [currentRoom, userId, isMuted, toast]); // Added toast to dependencies

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
    toggleMute,

    // WebRTC related state
    remoteStreams,
    peerStatuses
  };
};
