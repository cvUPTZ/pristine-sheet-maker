
import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { useToast } from '@/components/ui/use-toast';
import { LiveKitManager } from '@/services/LiveKitManager';
import { supabase } from '@/integrations/supabase/client';
import { AudioManager } from '@/utils/audioManager';
import { ConnectionState, Track, RemoteParticipant as LiveKitRemoteParticipant, LocalTrackPublication, LocalParticipant, RemoteTrackPublication, RoomEvent } from 'livekit-client';

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

  // Initialize LiveKitManager with userId
  useEffect(() => {
    if (userId) {
        liveKitManager.current.initialize(userId);
        console.log('[useVoiceCollab] LiveKitManager initialized with userId:', userId);
    }
  }, [userId]);

  // Fetch Audio Output Devices
  useEffect(() => {
    const fetchDevices = async () => {
      console.log('[useVoiceCollab] Fetching audio output devices...');
      try {
        if (!audioManager.current.isStreamActive() && typeof navigator.mediaDevices.getUserMedia === 'function') {
          await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(tempStream => tempStream.getTracks().forEach(track => track.stop()))
            .catch(permError => console.warn("[useVoiceCollab] Mic permission for device enumeration not granted on initial check:", permError.message));
        }
      } catch (permError: any) {
        console.warn("[useVoiceCollab] Error during pre-enumeration permission check:", permError.message);
      }

      try {
        if (typeof navigator.mediaDevices.enumerateDevices !== 'function') {
            console.warn("[useVoiceCollab] enumerateDevices is not supported by this browser.");
            setAudioOutputDevices([]);
            return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(device => device.kind === 'audiooutput');
        setAudioOutputDevices(outputs);
        console.log('[useVoiceCollab] Audio output devices found:', outputs.length);
        
        const savedDeviceId = localStorage.getItem('selectedAudioOutputDeviceId');
        if (savedDeviceId && outputs.some(d => d.deviceId === savedDeviceId)) {
            setSelectedAudioOutputDeviceId(savedDeviceId);
            console.log('[useVoiceCollab] Loaded saved audio output device:', savedDeviceId);
        } else if (outputs.length > 0) {
            setSelectedAudioOutputDeviceId(outputs[0].deviceId);
            console.log('[useVoiceCollab] Set default audio output device:', outputs[0].deviceId);
        }
      } catch (error: any) {
        console.error("[useVoiceCollab] Error fetching audio output devices:", error.message);
        toast({ title: "Audio Device Error", description: "Could not list audio output devices.", variant: "destructive"});
      }
    };

    fetchDevices();
    
    if (typeof navigator.mediaDevices.addEventListener === 'function') {
        navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    }
    return () => {
        if (typeof navigator.mediaDevices.removeEventListener === 'function') {
            navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
        }
    };
  }, [toast]);

  // Apply Audio Output Device Selection
  useEffect(() => {
    if (selectedAudioOutputDeviceId && liveKitManager.current && liveKitManager.current.getRoom()?.state === ConnectionState.Connected) {
      console.log('[useVoiceCollab] Applying selected audio output device:', selectedAudioOutputDeviceId);
      liveKitManager.current.setAudioOutputDevice(selectedAudioOutputDeviceId)
        .then(() => console.log('[useVoiceCollab] Successfully set audio output device.'))
        .catch(error => {
            console.error("[useVoiceCollab] Failed to apply audio output device in hook:", error.message);
            toast({ title: "Audio Output Error", description: `Failed to set audio output: ${error.message}`, variant: "destructive"});
        });
    }
  }, [selectedAudioOutputDeviceId, livekitConnectionState, toast]);

  const selectAudioOutputDevice = useCallback((deviceId: string) => {
    const device = audioOutputDevices.find(d => d.deviceId === deviceId);
    if (device) {
        console.log('[useVoiceCollab] User selected audio output device:', deviceId, device.label);
        setSelectedAudioOutputDeviceId(deviceId);
        localStorage.setItem('selectedAudioOutputDeviceId', deviceId);
    } else {
        console.warn(`[useVoiceCollab] Attempted to select invalid audio output deviceId: ${deviceId}`);
    }
  }, [audioOutputDevices]);

  const adminSetParticipantMute = useCallback(async (targetRoomId: string, targetIdentity: string, mute: boolean) => {
    if (!currentRoom || currentRoom.id !== targetRoomId) {
        console.error("[useVoiceCollab] Admin action: Attempted on incorrect or no current room.");
        toast({ title: "Operation Failed", description: "Not in the target room for this action.", variant: "destructive"});
        return;
    }
    if (userRole !== 'admin' && userRole !== 'coordinator') {
        console.warn(`[useVoiceCollab] Admin action: User ${userId} (role: ${userRole}) lacks permission.`);
        toast({ title: "Permission Denied", description: "You do not have rights to perform this moderation action.", variant: "destructive"});
        return;
    }

    console.log(`[useVoiceCollab] Admin action: User ${userId} attempting to ${mute ? 'mute' : 'unmute'} ${targetIdentity} in room ${targetRoomId}`);
    try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('moderate-livekit-room', {
            body: { roomId: targetRoomId, targetIdentity, mute }
        });

        if (functionError) {
            const context = (functionError as any).context;
            const message = context?.json?.error || context?.responseText || functionError.message;
            throw new Error(message || `Failed to update mute status: ${functionError.message}`);
        }
        if (functionData?.error) {
             throw new Error(functionData.error);
        }

        toast({ title: "Moderation Action Sent", description: `${mute ? 'Mute' : 'Unmute'} command sent for participant ${targetIdentity.slice(0,8)}...`});
    } catch (error: any) {
        console.error("[useVoiceCollab] Error calling moderate-livekit-room function:", error.message);
        toast({ title: "Moderation Failed", description: error.message, variant: "destructive"});
    }
  }, [currentRoom, userRole, userId, toast]);

  // Set up LiveKitManager callbacks
  useEffect(() => {
    const manager = liveKitManager.current;

    const handleRemoteStreamSubscribed = (peerId: string, stream: MediaStream, participant: LiveKitRemoteParticipant) => {
      console.log(`[useVoiceCollab] LiveKit Remote stream subscribed from ${peerId} (${participant.name})`, stream);
      setRemoteStreams(prev => new Map(prev).set(peerId, stream));
    };

    const handleRemoteStreamUnsubscribed = (peerId: string, participant: LiveKitRemoteParticipant) => {
      console.log(`[useVoiceCollab] LiveKit Remote stream unsubscribed from ${peerId} (${participant.name})`);
      setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
      });
    };

    const handlePeerStatusChanged = (peerId: string, status: string, participant?: LiveKitRemoteParticipant | LocalParticipant) => {
      console.log(`[useVoiceCollab] LiveKit Peer ${peerId} (${participant?.name || 'N/A'}) status: ${status}`);
      setPeerStatuses(prev => new Map(prev).set(peerId, status));

      if (participant && participant instanceof LiveKitRemoteParticipant) {
        if (status === 'connected') {
          onUserJoined?.(participant.identity);
          let userRoleFromMeta: string | undefined = undefined;
          if (participant.metadata) {
            try {
              const metadata = JSON.parse(participant.metadata);
              userRoleFromMeta = metadata.userRole;
            } catch (e: any) { console.error("[useVoiceCollab] Failed to parse participant metadata:", e.message); }
          }
          
          let initialIsMuted = true; 
          const audioPub = Array.from(participant.audioTrackPublications.values()).find(p => p.source === Track.Source.Microphone);
          if (audioPub) {
            initialIsMuted = audioPub.isMuted;
          }

          setLivekitParticipants(prev => new Map(prev).set(participant.identity, {
            id: participant.identity,
            name: participant.name || participant.identity,
            role: userRoleFromMeta,
            isMuted: initialIsMuted,
            isSpeaking: participant.isSpeaking,
            isConnected: true,
          }));
        } else if (status === 'disconnected') {
          onUserLeft?.(participant.identity);
          setLivekitParticipants(prev => {
            const newMap = new Map(prev);
            newMap.delete(participant.identity);
            return newMap;
          });
        }
      }
    };

    const handleTrackMuteChanged = (
        trackPub: RemoteTrackPublication | LocalTrackPublication, 
        participant: LiveKitRemoteParticipant | LocalParticipant
    ) => {
        if (trackPub.source === Track.Source.Microphone) {
            console.log(`[useVoiceCollab] Track mute changed for ${participant.identity} (${participant.name}): ${trackPub.isMuted ? 'MUTED' : 'UNMUTED'}`);
            if (participant.identity === userId) {
                setIsMuted(trackPub.isMuted);
            } else {
                setLivekitParticipants(prev => {
                    const pState = prev.get(participant.identity);
                    if (pState) {
                        return new Map(prev).set(participant.identity, { ...pState, isMuted: trackPub.isMuted });
                    }
                    return prev;
                });
            }
        }
    };
    
    const handleIsSpeakingChanged = (isSpeaking: boolean, participant: LiveKitRemoteParticipant | LocalParticipant) => {
        if (participant.identity === userId) {
            // Could update local speaking state if needed for UI
        } else {
            setLivekitParticipants(prev => {
                const pState = prev.get(participant.identity);
                if (pState) {
                    return new Map(prev).set(participant.identity, { ...pState, isSpeaking });
                }
                return prev;
            });
        }
    };

    const handleConnectionStateChanged = (state: ConnectionState, error?: Error) => {
      console.log(`[useVoiceCollab] LiveKit Connection state: ${ConnectionState[state]}`, error?.message || '');
      setLivekitConnectionState(state);

      if (state === ConnectionState.Connected && currentRoom) {
        if (liveKitManager.current.getRoom()?.localParticipant) {
            liveKitManager.current.setTrackEnabled(Track.Source.Microphone, !isMuted);
        }
        if (selectedAudioOutputDeviceId) {
            liveKitManager.current.setAudioOutputDevice(selectedAudioOutputDeviceId).catch(e => console.error("Failed to set audio output on connect:", e.message));
        }
      }
      
      if (state === ConnectionState.Disconnected) {
        setRemoteStreams(new Map()); 
        setPeerStatuses(new Map());
        setLivekitParticipants(new Map());
        setIsVoiceEnabled(false);

        if (error) {
          console.error('[useVoiceCollab] LiveKit disconnected with error:', error.message);
          toast({ title: "LiveKit Connection Error", description: `Disconnected: ${error.message}`, variant: "destructive" });
        } else if (currentRoom) {
            console.log('[useVoiceCollab] LiveKit disconnected (e.g., user left or network drop without specific error).');
        }
      }
    };
    
    // Set up event callbacks on LiveKitManager
    manager.onRemoteStreamSubscribed = handleRemoteStreamSubscribed;
    manager.onRemoteStreamUnsubscribed = handleRemoteStreamUnsubscribed;
    manager.onPeerStatusChanged = handlePeerStatusChanged;
    manager.onConnectionStateChanged = handleConnectionStateChanged;
    manager.onTrackMuteChanged = (peerId: string, source: Track.Source, isMuted: boolean) => {
      // Handle track mute changes
      setLivekitParticipants(prev => {
        const pState = prev.get(peerId);
        if (pState && source === Track.Source.Microphone) {
          return new Map(prev).set(peerId, { ...pState, isMuted });
        }
        return prev;
      });
    };
    manager.onIsSpeakingChanged = (peerId: string, isSpeaking: boolean) => {
      setLivekitParticipants(prev => {
        const pState = prev.get(peerId);
        if (pState) {
          return new Map(prev).set(peerId, { ...pState, isSpeaking });
        }
        return prev;
      });
    };

    return () => {
      // Clean up callbacks
      manager.onRemoteStreamSubscribed = () => {};
      manager.onRemoteStreamUnsubscribed = () => {};
      manager.onPeerStatusChanged = () => {};
      manager.onConnectionStateChanged = () => {};
      manager.onTrackMuteChanged = () => {};
      manager.onIsSpeakingChanged = () => {};
    };
  }, [toast, currentRoom, isMuted, selectedAudioOutputDeviceId, userId, onUserJoined, onUserLeft]);

  // Initialize voice rooms based on matchId and userRole
  useEffect(() => {
    if (initializedRef.current || !matchId || !userRole) {
      return;
    }
    initializedRef.current = true;

    const initializeRooms = async () => {
      try {
        console.log('[useVoiceCollab] 🏗️ Initializing voice rooms for match:', matchId, 'userRole:', userRole);
        const rooms = await voiceService.current.initializeRoomsForMatch(matchId);
        
        const filteredRooms = rooms.filter(room => {
          if (!room.permissions || room.permissions.length === 0) return true;
          return room.permissions.includes(userRole) || room.permissions.includes('all');
        });
        
        console.log('[useVoiceCollab] ✅ Available rooms for user role:', userRole, filteredRooms.map(r => r.name));
        setAvailableRooms(filteredRooms);
        
        if (filteredRooms.length > 0) {
          toast({
            title: "Voice System Ready",
            description: `${filteredRooms.length} voice room(s) available for your role.`,
          });
        } else {
          console.log('[useVoiceCollab] ⚠️ No rooms available for role:', userRole);
          toast({
            title: "Voice System Notice",
            description: "No voice rooms are currently configured for your role in this match.",
            variant: "default"
          });
        }
      } catch (error: any) {
        console.error('[useVoiceCollab] ❌ Failed to initialize voice rooms:', error.message);
        toast({
          title: "Voice System Error",
          description: "Could not retrieve voice room configurations. Please try again later.",
          variant: "destructive"
        });
      }
    };

    initializeRooms();

    return () => {
        console.log('[useVoiceCollab] Hook unmounting. Ensuring LiveKit room is left.');
        if (liveKitManager.current && liveKitManager.current.getRoom()?.state !== ConnectionState.Disconnected) { 
             liveKitManager.current.leaveRoom().catch(e => console.warn("[useVoiceCollab] Error during unmount leaveRoom:", e.message));
        }
        audioManager.current.cleanup();
    };
  }, [matchId, userRole, toast]);

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      if (typeof navigator.onLine === 'undefined') {
        console.warn('[useVoiceCollab] navigator.onLine is not supported. Assuming online.');
        setNetworkStatus('online');
        return;
      }

      if (!navigator.onLine) {
        setNetworkStatus('offline');
      } else {
        setNetworkStatus('online');
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

  const joinRoomInternal = useCallback(async (room: VoiceRoom) => {
    console.log(`[useVoiceCollab] Attempting to join room: ${room.name} (ID: ${room.id}) as user ${userId} with role ${userRole}`);
    setIsConnecting(true);

    try {
      const result = await voiceService.current.joinRoom(room.id, userId, userRole);
      if (!result.success || !result.room) {
        throw new Error(result.error || 'Failed to register in voice room (database).');
      }
      console.log('[useVoiceCollab] Successfully registered in DB for room:', result.room.name);

      let token: string | null = null;
      console.log(`[useVoiceCollab] Fetching LiveKit token for room ${result.room.id}, user ${userId}`);
      const { data: tokenPayload, error: functionError } = await supabase.functions.invoke('generate-livekit-token', {
          body: { 
              roomId: result.room.id, 
              participantIdentity: userId,
              participantName: userRole
          }
      });

      if (functionError) {
          let errMsg = functionError.message;
          const context = (functionError as any).context;
          if (context) {
              if (typeof context.responseText === 'string' && context.responseText.toLowerCase().includes("<!doctype html>")) {
                  errMsg = "Token endpoint returned HTML. Please check Edge Function deployment.";
              } else if (context.json && (context.json.error || context.json.message)) {
                  errMsg = context.json.error || context.json.message || errMsg;
              } else if (typeof context.responseText === 'string') {
                  errMsg = `Function call failed: ${context.responseText.substring(0,200)}`;
              }
          }
          throw new Error(`Failed to get voice server token: ${errMsg}`);
      }
      
      if (!tokenPayload || tokenPayload.error) {
          throw new Error(tokenPayload?.error || "Received no token or error from token function.");
      }
      token = tokenPayload.token;
      if (!token) throw new Error("LiveKit token is null after fetch.");
      console.log('[useVoiceCollab] Successfully fetched LiveKit token.');

      if (!audioManager.current.isStreamActive() || !audioManager.current.getAudioContext() || audioManager.current.getAudioContext()?.state === 'closed') {
        console.log('[useVoiceCollab] Initializing AudioManager and getting user media...');
        await audioManager.current.initialize({ 
            onAudioLevel: setAudioLevel,
            onError: (e: Error) => { 
                console.error("[useVoiceCollab] AudioManager initialization error in joinRoom:", e.message);
                toast({ title: "Audio System Error", description: e.message, variant: "destructive" });
            }
        });
        await audioManager.current.getUserMedia();
        
        const localStream = audioManager.current.getCurrentStream();
        if (localStream) {
            await audioManager.current.setupAudioMonitoring(localStream);
        } else {
            throw new Error("Microphone access denied or no audio track available.");
        }
        console.log('[useVoiceCollab] AudioManager initialized and user media obtained.');
      } else {
        console.log('[useVoiceCollab] AudioManager already active.');
      }
      
      const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;
      if (!LIVEKIT_URL) throw new Error("LiveKit server URL (VITE_LIVEKIT_URL) is not configured.");
      
      console.log(`[useVoiceCollab] Joining LiveKit room ${result.room.id} at ${LIVEKIT_URL}`);
      
      await liveKitManager.current.joinRoom(LIVEKIT_URL, token, result.room.id);

      liveKitManager.current.setTrackEnabled(Track.Source.Microphone, !isMuted);

      setCurrentRoom(result.room);
      setIsVoiceEnabled(true);
      setIsRoomAdmin(userRole === 'admin' || userRole === 'coordinator');
      
      onRoomChanged?.(result.room);
      toast({
        title: "Joined Voice Room",
        description: `Successfully connected to ${result.room.name}.`,
      });
      console.log(`[useVoiceCollab] Successfully joined room (DB & LiveKit): ${result.room.name}`);
      setIsConnecting(false);
      return true;

    } catch (error: any) {
      console.error(`[useVoiceCollab] Error during voice room join process:`, error.message, error.stack);
      toast({
          title: "Voice Connection Failed",
          description: error.message || "An unknown error occurred while joining.",
          variant: "destructive"
      });
      if (liveKitManager.current.getRoom()?.state !== ConnectionState.Disconnected) {
        liveKitManager.current.leaveRoom().catch(e => console.warn("Error leaving room after failed join:", e.message));
      }
      audioManager.current.cleanup();
      setIsConnecting(false); 
      setIsVoiceEnabled(false);
      setCurrentRoom(null);
      return false;
    }
  }, [userId, userRole, onRoomChanged, toast, setAudioLevel, isMuted]);

  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isConnecting || livekitConnectionState === ConnectionState.Connecting || livekitConnectionState === ConnectionState.Connected) {
      console.log('[useVoiceCollab] Join attempt ignored: Already connecting or connected.');
      if (livekitConnectionState === ConnectionState.Connected && currentRoom?.id !== room.id) {
        toast({ title: "Action Needed", description: "Please leave your current room before joining another.", variant: "default"});
      }
      return;
    }
    await joinRoomInternal(room);
  }, [isConnecting, livekitConnectionState, joinRoomInternal, currentRoom, toast]);

  const leaveVoiceRoom = useCallback(async () => {
    if (!currentRoom && liveKitManager.current.getRoom()?.state === ConnectionState.Disconnected) {
        console.log('[useVoiceCollab] Leave attempt ignored: Not in a room or already disconnected.');
        return;
    }
    
    const roomToLeaveName = currentRoom?.name || 'the voice room';
    console.log('[useVoiceCollab] Leaving voice room:', roomToLeaveName);
    setIsConnecting(true);

    try {
      await liveKitManager.current.leaveRoom();
      console.log('[useVoiceCollab] Successfully left LiveKit room.');

      if (currentRoom) {
        const success = await voiceService.current.leaveRoom(currentRoom.id, userId);
        if (success) {
            console.log(`[useVoiceCollab] Successfully updated DB for leaving room ${currentRoom.id}`);
        } else {
            console.warn(`[useVoiceCollab] Failed to update DB for leaving room ${currentRoom.id}`);
        }
      }
    } catch (error: any) {
      console.error('[useVoiceCollab] Error leaving voice room:', error.message);
      toast({
        title: "Leave Room Error",
        description: error.message || "Failed to disconnect properly.",
        variant: "destructive"
      });
    } finally {
      setCurrentRoom(null);
      setIsVoiceEnabled(false);
      setLivekitParticipants(new Map());
      setRemoteStreams(new Map());
      setPeerStatuses(new Map());
      setLivekitConnectionState(null);
      setIsRoomAdmin(false);
      
      audioManager.current.cleanup();
      setAudioLevel(0);
      
      onRoomChanged?.(null);
      toast({
        title: "Left Voice Room",
        description: `You have been disconnected from ${roomToLeaveName}.`,
      });
      setIsConnecting(false);
      console.log('[useVoiceCollab] Successfully left voice room and reset state.');
    }
  }, [currentRoom, userId, onRoomChanged, toast]);

  const toggleMute = useCallback(async () => {
    if (!isVoiceEnabled || !liveKitManager.current.getRoom() || liveKitManager.current.getRoom()?.state !== ConnectionState.Connected) {
        console.warn("[useVoiceCollab] Cannot toggle mute: Not connected to a voice room.");
        return;
    }

    const newMutedState = !isMuted;
    console.log(`[useVoiceCollab] Toggling mute. New state: ${newMutedState ? 'MUTED' : 'UNMUTED'}`);
    
    liveKitManager.current.setTrackEnabled(Track.Source.Microphone, !newMutedState);
    setIsMuted(newMutedState); 
    
    audioManager.current.setMuted(newMutedState); 

    if (currentRoom) {
        try {
            const success = await voiceService.current.updateParticipantStatus(
                currentRoom.id,
                userId,
                { is_muted: newMutedState }
            );
            if (success) {
                console.log(`[useVoiceCollab] Synced mute state (${newMutedState}) with DB.`);
            } else {
                console.warn("[useVoiceCollab] Failed to sync mute state with DB. LiveKit state is primary.");
            }
        } catch (dbError: any) {
            console.error("[useVoiceCollab] Failed to sync mute state with DB:", dbError.message);
        }
    }
  }, [isVoiceEnabled, isMuted, currentRoom, userId]);

  useEffect(() => {
    if (!isVoiceEnabled || isMuted || livekitConnectionState !== ConnectionState.Connected) {
      if (audioLevel !== 0) setAudioLevel(0);
      return;
    }
  }, [isVoiceEnabled, isMuted, livekitConnectionState, audioLevel]);

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
    peerStatuses,
  };
};
