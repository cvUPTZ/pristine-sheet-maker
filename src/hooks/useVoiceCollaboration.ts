import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { useToast } from '@/components/ui/use-toast';
import { LiveKitManager } from '@/services/LiveKitManager';
import { supabase } from '@/integrations/supabase/client';
import { AudioManager } from '@/utils/audioManager';
import { ConnectionState, Track, RemoteParticipant as LiveKitRemoteParticipant } from 'livekit-client';

interface LiveKitParticipantState {
  id: string;
  name?: string;
  role?: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
}

interface ConnectionMetrics {
  totalPeers: number;
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
  const liveKitManager = useRef(LiveKitManager.getInstance());
  const audioManager = useRef(AudioManager.getInstance());
  
  // Core state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [livekitParticipants, setLivekitParticipants] = useState<Map<string, LiveKitParticipantState>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerStatuses, setPeerStatuses] = useState<Map<string, string>>(new Map()); 
  const [livekitConnectionState, setLivekitConnectionState] = useState<ConnectionState | null>(null);
  
  // Audio and connection state
  const [audioLevel, setAudioLevel] = useState(0);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online'); 
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics | null>(null); 
  
  // Admin status
  const [isRoomAdmin, setIsRoomAdmin] = useState(false);
  // Audio Output Devices State
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState<string | null>(null);

  // Initialize LiveKitManager
  useEffect(() => {
    if (userId) {
        liveKitManager.current.initialize(userId);
    }
  }, [userId]);

  // Fetch Audio Output Devices
  useEffect(() => {
    const fetchDevices = async () => {
        try {
            if (!audioManager.current.isStreamActive()) {
                await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                    .then(tempStream => tempStream.getTracks().forEach(track => track.stop()))
                    .catch(permError => console.warn("Mic permission for device enumeration not granted on initial check:", permError));
            }
        } catch (permError) {
            console.warn("Error during pre-enumeration permission check:", permError);
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const outputs = devices.filter(device => device.kind === 'audiooutput');
            setAudioOutputDevices(outputs);
            
            const savedDeviceId = localStorage.getItem('selectedAudioOutputDeviceId');
            if (savedDeviceId && outputs.find(d => d.deviceId === savedDeviceId)) {
                setSelectedAudioOutputDeviceId(savedDeviceId);
            } else if (outputs.length > 0) {
                setSelectedAudioOutputDeviceId(outputs[0].deviceId);
            }
        } catch (error) {
            console.error("Error fetching audio output devices:", error);
            toast({ title: "Audio Device Error", description: "Could not list audio output devices.", variant: "destructive"});
        }
    };
    fetchDevices();
    
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => {
        navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
    };
  }, [toast]);

  // Apply Audio Output Device Selection
  useEffect(() => {
    if (selectedAudioOutputDeviceId && liveKitManager.current && liveKitManager.current.getRoom()?.state === ConnectionState.Connected) {
        liveKitManager.current.setAudioOutputDevice(selectedAudioOutputDeviceId)
            .catch(error => {
                console.error("Failed to apply audio output device in hook:", error);
                toast({ title: "Audio Output Error", description: `Failed to set audio output: ${error.message}`, variant: "destructive"});
            });
    }
  }, [selectedAudioOutputDeviceId, livekitConnectionState, toast]);

  const selectAudioOutputDevice = useCallback((deviceId: string) => {
    const device = audioOutputDevices.find(d => d.deviceId === deviceId);
    if (device) {
        setSelectedAudioOutputDeviceId(deviceId);
        localStorage.setItem('selectedAudioOutputDeviceId', deviceId);
    } else {
          console.warn(`Attempted to select invalid audio output deviceId: ${deviceId}`);
    }
  }, [audioOutputDevices]);

  const adminSetParticipantMute = useCallback(async (targetRoomId: string, targetIdentity: string, mute: boolean) => {
    if (!currentRoom || currentRoom.id !== targetRoomId) {
        console.error("Admin action attempted on incorrect or no current room.");
        toast({ title: "Operation Failed", description: "Not in the target room.", variant: "destructive"});
        return;
    }
    if (userRole !== 'admin' && userRole !== 'coordinator') {
        toast({ title: "Permission Denied", description: "You do not have rights to perform this action.", variant: "destructive"});
        return;
    }

    try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) throw new Error("Not authenticated");

        const response = await fetch('/api/moderate-livekit-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ roomId: targetRoomId, targetIdentity, mute })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to update mute status: ${response.statusText}`);
        }
        toast({ title: "Action Sent", description: `${mute ? 'Mute' : 'Unmute'} command sent for ${targetIdentity.slice(0,6)}...`});
    } catch (error: any) {
        console.error("Error calling moderate-livekit-room:", error);
        toast({ title: "Operation Failed", description: error.message, variant: "destructive"});
    }
  }, [currentRoom, userRole, toast]);

  // Set up LiveKitManager callbacks
  useEffect(() => {
    const manager = liveKitManager.current;
    const oldOnRemoteStreamSubscribed = manager.onRemoteStreamSubscribed;
    const oldOnRemoteStreamUnsubscribed = manager.onRemoteStreamUnsubscribed;
    const oldOnPeerStatusChanged = manager.onPeerStatusChanged;
    const oldOnConnectionStateChanged = manager.onConnectionStateChanged;
    const oldOnTrackMuteChanged = manager.onTrackMuteChanged;
    const oldOnIsSpeakingChanged = manager.onIsSpeakingChanged;

    manager.onRemoteStreamSubscribed = (peerId, stream) => {
        console.log(`[useVoiceCollab] LiveKit Remote stream subscribed from ${peerId}`, stream);
        setRemoteStreams(prev => new Map(prev).set(peerId, stream));
    };
    manager.onRemoteStreamUnsubscribed = (peerId) => {
        console.log(`[useVoiceCollab] LiveKit Remote stream unsubscribed from ${peerId}`);
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
        });
    };
    manager.onPeerStatusChanged = (peerId, status, participant) => {
        console.log(`[useVoiceCollab] LiveKit Peer ${peerId} status: ${status}`, participant);
        setPeerStatuses(prev => new Map(prev).set(peerId, status));

        if (status === 'connected' && participant) {
            let userRoleFromMeta: string | undefined = undefined;
            if (participant.metadata) {
                try {
                    const metadata = JSON.parse(participant.metadata);
                    userRoleFromMeta = metadata.userRole;
                } catch (e) { console.error("Failed to parse participant metadata:", e); }
            }
            
            let initialIsMuted = true; 
            const audioPub = Array.from(participant.audioTrackPublications.values()).find((p: any) => p.source === Track.Source.Microphone);
            if (audioPub) {
                initialIsMuted = audioPub.isMuted;
            }

            setLivekitParticipants(prev => new Map(prev).set(peerId, {
                id: peerId,
                name: participant.name || participant.identity,
                role: userRoleFromMeta,
                isMuted: initialIsMuted,
                isSpeaking: participant.isSpeaking,
                isConnected: true,
            }));
        } else if (status === 'disconnected') {
            setLivekitParticipants(prev => {
                const newMap = new Map(prev);
                newMap.delete(peerId);
                return newMap;
            });
        }
    };

    manager.onTrackMuteChanged = (peerId, source, isMuted) => {
        if (source === Track.Source.Microphone) {
            setLivekitParticipants(prev => {
                const participant = prev.get(peerId);
                if (participant) {
                    return new Map(prev).set(peerId, { ...participant, isMuted });
                }
                return prev;
            });
        }
    };
    
    manager.onIsSpeakingChanged = (peerId, isSpeaking) => {
        setLivekitParticipants(prev => {
            const participant = prev.get(peerId);
            if (participant) {
                return new Map(prev).set(peerId, { ...participant, isSpeaking });
            }
            return prev;
        });
    };

    manager.onConnectionStateChanged = (state, error) => {
        console.log(`[useVoiceCollab] LiveKit Connection state: ${state}`, error || '');
        setLivekitConnectionState(state);
        if (state === ConnectionState.Disconnected) {
            setRemoteStreams(new Map()); 
            setPeerStatuses(new Map());
            setLivekitParticipants(new Map());
            if (error) {
                toast({ title: "LiveKit Connection Error", description: error.message, variant: "destructive" });
            }
            if (state === ConnectionState.Disconnected && !error && currentRoom) {
                setIsVoiceEnabled(false); 
            } else if (currentRoom) {
                 setIsVoiceEnabled(false);
            }
        }
    };

    return () => {
        manager.onRemoteStreamSubscribed = oldOnRemoteStreamSubscribed;
        manager.onRemoteStreamUnsubscribed = oldOnRemoteStreamUnsubscribed;
        manager.onPeerStatusChanged = oldOnPeerStatusChanged;
        manager.onConnectionStateChanged = oldOnConnectionStateChanged;
        manager.onTrackMuteChanged = oldOnTrackMuteChanged;
        manager.onIsSpeakingChanged = oldOnIsSpeakingChanged;
    };
  }, [toast, currentRoom]);

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
        
        const filteredRooms = rooms.filter(room => {
          if (userRole === 'tracker') return true;
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

    return () => {
        if (liveKitManager.current && liveKitManager.current.getRoom()?.state !== ConnectionState.Disconnected) { 
             liveKitManager.current.leaveRoom();
        }
    };
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

  // Create a stable reference for the join room function
  const joinRoomInternal = useCallback(async (room: VoiceRoom, attemptNumber: number = 1) => {
    try {
      console.log(`[joinRoomInternal] Attempt #${attemptNumber} to join room: ${room.name} (ID: ${room.id}) as ${userRole}`);
      
      const result = await voiceService.current.joinRoom(room.id, userId, userRole);
      
      if (result.success && result.room) {
        let token = null;
        try {
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                throw new Error("No active Supabase session found to fetch LiveKit token.");
            }

            console.log(`[useVoiceCollab] Fetching LiveKit token for room ${result.room.id}, user ${userId}`);
            const tokenResponse = await fetch('/api/generate-livekit-token', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.data.session.access_token}`
                },
                body: JSON.stringify({ 
                    roomId: result.room.id, 
                    participantIdentity: userId,
                    participantName: userRole
                }),
            });
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                throw new Error(errorData.error || `Failed to fetch LiveKit token: ${tokenResponse.statusText} (${tokenResponse.status})`);
            }
            const { token: fetchedToken } = await tokenResponse.json();
            token = fetchedToken;
        } catch (error: any) {
            console.error("[useVoiceCollab] Error fetching LiveKit token:", error);
            toast({ title: "Voice Connection Error", description: `Could not get voice server token: ${error.message}`, variant: "destructive" });
            setIsConnecting(false);
            throw error; 
        }

        if (!token) {
             setIsConnecting(false);
             throw new Error("LiveKit token is null or undefined after fetch.");
        }

        if (!audioManager.current.isStreamActive()) {
            try {
                if(!audioManager.current.getAudioContext() || audioManager.current.getAudioContext()?.state === 'closed') {
                    await audioManager.current.initialize({ 
                        onAudioLevel: setAudioLevel,
                        onError: (e: Error) => { 
                            console.error("AudioManager initialization error in joinRoomInternal:", e);
                            toast({ title: "Audio System Error", description: e.message, variant: "destructive" });
                        }
                    });
                }
                await audioManager.current.getUserMedia();
                if (audioManager.current.getCurrentStream()) {
                    await audioManager.current.setupAudioMonitoring(audioManager.current.getCurrentStream()!);
                } else {
                     console.warn("[useVoiceCollab] No stream available after getUserMedia to setup audio monitoring.")
                }
            } catch (micError: any) {
                console.error("[useVoiceCollab] Microphone permission error before LiveKit join:", micError);
                toast({ title: "Microphone Required", description: `Microphone access is required for voice chat. ${micError.message}`, variant: "destructive"});
                setIsConnecting(false);
                throw micError;
            }
        }
        if (!audioManager.current.isStreamActive()) {
             toast({ title: "Microphone Error", description: "Local audio stream is not available. Cannot join voice chat.", variant: "destructive"});
             setIsConnecting(false);
             throw new Error("Local audio stream not available for LiveKit.");
        }
        
        const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;
        if (!LIVEKIT_URL) {
            console.error("LIVEKIT_URL is not set in environment variables.");
            toast({ title: "Configuration Error", description: "LiveKit server URL is not configured.", variant: "destructive" });
            setIsConnecting(false);
            throw new Error("LiveKit URL not configured.");
        }
        
        console.log(`[useVoiceCollab] Joining LiveKit room ${result.room.id} at ${LIVEKIT_URL}`);
        await liveKitManager.current.joinRoom(LIVEKIT_URL, token, result.room.id);

        setCurrentRoom(result.room);
        setIsVoiceEnabled(true);
        setIsRoomAdmin(userRole === 'admin' || userRole === 'coordinator');
        
        onRoomChanged?.(result.room);
        toast({
          title: "Joined Voice Room",
          description: `Successfully connected to ${result.room.name} via LiveKit.`,
        });
        
        console.log(`[useVoiceCollab] Successfully joined room (metadata & LiveKit): ${result.room.name}`);
        return true;

      } else {
        console.error(`[useVoiceCollab] Failed to join metadata room. Error: ${result.error}`);
        throw new Error(result.error || 'Failed to join metadata room');
      }
    } catch (error: any) {
      console.error(`[useVoiceCollab] Error during voice room join process:`, error);
      toast({
          title: "Voice Connection Failed",
          description: error.message || "An unknown error occurred while joining the voice room.",
          variant: "destructive"
      });
      setIsConnecting(false); 
      return false;
    }
  }, [userId, userRole, onRoomChanged, toast, setAudioLevel]);

  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isConnecting) {
      console.log('Already connecting to a room');
      return;
    }
    setIsConnecting(true);
    const success = await joinRoomInternal(room, 1);
    if (success) {
      setIsConnecting(false);
    }
  }, [isConnecting, joinRoomInternal]);

  const leaveVoiceRoom = useCallback(async () => {
    if (!currentRoom) return;

    console.log('[useVoiceCollab] Leaving voice room:', currentRoom.name);
    try {
      await liveKitManager.current.leaveRoom();
      
      const success = await voiceService.current.leaveRoom(currentRoom.id, userId);
      if (!success) {
          console.warn(`[useVoiceCollab] Failed to update metadata for leaving room ${currentRoom.id}`);
      }

    } catch (error: any) {
      console.error('[useVoiceCollab] Error leaving LiveKit room:', error);
      toast({
        title: "Leave Room Error",
        description: error.message || "Failed to disconnect properly.",
        variant: "destructive"
      });
    } finally {
      setCurrentRoom(null);
      setIsVoiceEnabled(false);
      setLivekitParticipants(new Map());
      setIsRoomAdmin(false);
      setRemoteStreams(new Map());
      setPeerStatuses(new Map());
      setLivekitConnectionState(null);
      
      onRoomChanged?.(null);
      toast({
        title: "Left Voice Room",
        description: "You have been disconnected from the voice chat.",
      });
      console.log('[useVoiceCollab] Successfully left voice room and reset state.');
    }
  }, [currentRoom, userId, onRoomChanged, toast]);

  const toggleMute = useCallback(async () => {
    if (!currentRoom || !liveKitManager.current.getRoom()) {
        console.warn("[useVoiceCollab] Cannot toggle mute, not in a LiveKit room.");
        return;
    }

    const newMutedState = !isMuted;
    audioManager.current.setMuted(newMutedState);
    liveKitManager.current.setTrackEnabled(Track.Source.Microphone, !newMutedState);
    setIsMuted(newMutedState);

    try {
        const success = await voiceService.current.updateParticipantStatus(
            currentRoom.id,
            userId,
            { is_muted: newMutedState }
        );
        if (success) {
            console.log(`[useVoiceCollab] 🎤 ${newMutedState ? 'Muted' : 'Unmuted'} microphone. Synced with DB.`);
        } else {
            console.warn("[useVoiceCollab] Failed to sync mute state with DB. LiveKit state is primary.");
        }
    } catch (dbError) {
        console.error("[useVoiceCollab] Failed to sync mute state with DB:", dbError);
    }
  }, [currentRoom, userId, isMuted]);

  useEffect(() => {
    if (!isVoiceEnabled || isMuted || livekitConnectionState !== ConnectionState.Connected) {
      setAudioLevel(0);
      return;
    }
    const interval = setInterval(() => {
      // Placeholder for audio level simulation if needed
    }, 200);

    return () => clearInterval(interval);
  }, [isVoiceEnabled, isMuted, livekitConnectionState]);

  return {
    isVoiceEnabled,
    isMuted,
    isConnecting,
    availableRooms,
    currentRoom,
    livekitParticipants: Array.from(livekitParticipants.values()),
    isRoomAdmin,
    audioLevel,
    networkStatus,
    connectionMetrics, 
    livekitConnectionState, 
    audioOutputDevices, 
    selectedAudioOutputDeviceId, 
    
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    adminSetParticipantMute, 
    selectAudioOutputDevice, 

    remoteStreams,
    peerStatuses
  };
};
