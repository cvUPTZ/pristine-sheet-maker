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
  isConnected: boolean; // Reflects if we have received their 'connected' status via onPeerStatusChanged
}

interface ConnectionMetrics {
  totalPeers: number;
  // Add more specific metrics if needed, e.g., bitrate, packet loss (from LiveKit stats)
}

interface UseVoiceCollaborationProps {
  matchId: string;
  userId: string;
  userRole: string; // The role of the current user (e.g., 'admin', 'coordinator', 'tracker')
  onUserJoined?: (userId: string) => void; // Callback when a remote user joins the LiveKit room
  onUserLeft?: (userId: string) => void; // Callback when a remote user leaves the LiveKit room
  onRoomChanged?: (room: VoiceRoom | null) => void; // Callback when the current room changes
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
  const initializedRef = useRef(false); // To prevent multiple initializations of rooms
  const liveKitManager = useRef(LiveKitManager.getInstance());
  const audioManager = useRef(AudioManager.getInstance());
  
  // Core state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false); // True if successfully joined a room
  const [isMuted, setIsMuted] = useState(true); // Local mute state
  const [isConnecting, setIsConnecting] = useState(false); // True during the join process
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [livekitParticipants, setLivekitParticipants] = useState<Map<string, LiveKitParticipantState>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerStatuses, setPeerStatuses] = useState<Map<string, string>>(new Map()); // Raw peer connection status
  const [livekitConnectionState, setLivekitConnectionState] = useState<ConnectionState | null>(null);
  
  // Audio and connection state
  const [audioLevel, setAudioLevel] = useState(0); // Local mic audio level
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online'); 
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics | null>(null); 
  
  // Admin status
  const [isRoomAdmin, setIsRoomAdmin] = useState(false); // Based on userRole and currentRoom permissions

  // Audio Output Devices State
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState<string | null>(null);

  // Initialize LiveKitManager with userId (important for token generation identity)
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
        // Attempt to get mic permission if not already active, to ensure full device list.
        // This temporary stream is immediately stopped.
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
            setAudioOutputDevices([]); // Set to empty if not supported
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
  }, [selectedAudioOutputDeviceId, livekitConnectionState, toast]); // livekitConnectionState ensures room is connected

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
    // Check against the userRole prop for the current user
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

      if (participant && participant instanceof LiveKitRemoteParticipant) { // Only process remote participants here
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
            if (participant.identity === userId) { // Local user
                setIsMuted(trackPub.isMuted);
            } else { // Remote user
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
        // console.log(`[useVoiceCollab] Speaking status changed for ${participant.identity} (${participant.name}): ${isSpeaking ? 'SPEAKING' : 'NOT SPEAKING'}`);
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
        // Ensure local mute state is correctly reflected in LiveKit upon connection
        if (liveKitManager.current.getRoom()?.localParticipant) {
            liveKitManager.current.setTrackEnabled(Track.Source.Microphone, !isMuted);
        }
        // Apply selected audio output device if already chosen
        if (selectedAudioOutputDeviceId) {
            liveKitManager.current.setAudioOutputDevice(selectedAudioOutputDeviceId).catch(e => console.error("Failed to set audio output on connect:", e.message));
        }
      }
      
      if (state === ConnectionState.Disconnected) {
        setRemoteStreams(new Map()); 
        setPeerStatuses(new Map());
        setLivekitParticipants(new Map());
        setIsVoiceEnabled(false); // Ensure this is reset
        // setCurrentRoom(null); // This is handled by leaveVoiceRoom to avoid race conditions

        if (error) {
          console.error('[useVoiceCollab] LiveKit disconnected with error:', error.message);
          toast({ title: "LiveKit Connection Error", description: `Disconnected: ${error.message}`, variant: "destructive" });
        } else if (currentRoom) { // If disconnected and was in a room, but no explicit error
            console.log('[useVoiceCollab] LiveKit disconnected (e.g., user left or network drop without specific error).');
            // Do not automatically clear currentRoom here, as user might want to rejoin.
            // The leaveVoiceRoom function is responsible for clearing currentRoom.
        }
      }
    };
    
    // Subscribe to LiveKitManager events
    manager.on(RoomEvent.TrackSubscribed, handleRemoteStreamSubscribed);
    manager.on(RoomEvent.TrackUnsubscribed, handleRemoteStreamUnsubscribed);
    manager.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
    manager.on(RoomEvent.ParticipantConnected, (p: LiveKitRemoteParticipant) => handlePeerStatusChanged(p.identity, 'connected', p));
    manager.on(RoomEvent.ParticipantDisconnected, (p: LiveKitRemoteParticipant) => handlePeerStatusChanged(p.identity, 'disconnected', p));
    manager.on(RoomEvent.TrackMuted, handleTrackMuteChanged);
    manager.on(RoomEvent.TrackUnmuted, handleTrackMuteChanged);
    manager.on(RoomEvent.ParticipantSpeakingChanged, handleIsSpeakingChanged);
    // For local participant speaking, if needed:
    // manager.on(RoomEvent.LocalTrackPublished, (pub, p) => { if(pub.source === Track.Source.Microphone){ /* handle initial mute */ }});
    // manager.on(RoomEvent.LocalTrackUnpublished, (pub, p) => { if(pub.source === Track.Source.Microphone){ /* ... */ }});


    return () => {
      // Unsubscribe from LiveKitManager events
      manager.off(RoomEvent.TrackSubscribed, handleRemoteStreamSubscribed);
      manager.off(RoomEvent.TrackUnsubscribed, handleRemoteStreamUnsubscribed);
      manager.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
      manager.off(RoomEvent.ParticipantConnected, (p: LiveKitRemoteParticipant) => handlePeerStatusChanged(p.identity, 'connected', p));
      manager.off(RoomEvent.ParticipantDisconnected, (p: LiveKitRemoteParticipant) => handlePeerStatusChanged(p.identity, 'disconnected', p));
      manager.off(RoomEvent.TrackMuted, handleTrackMuteChanged);
      manager.off(RoomEvent.TrackUnmuted, handleTrackMuteChanged);
      manager.off(RoomEvent.ParticipantSpeakingChanged, handleIsSpeakingChanged);
    };
  }, [toast, currentRoom, isMuted, selectedAudioOutputDeviceId, userId, onUserJoined, onUserLeft]); // Added userId to deps

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
        
        // Filter rooms based on user's role
        const filteredRooms = rooms.filter(room => {
          if (!room.permissions || room.permissions.length === 0) return true; // No specific permissions, open to all
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

    // Main cleanup when the component/hook instance is unmounted
    return () => {
        console.log('[useVoiceCollab] Hook unmounting. Ensuring LiveKit room is left.');
        if (liveKitManager.current && liveKitManager.current.getRoom()?.state !== ConnectionState.Disconnected) { 
             liveKitManager.current.leaveRoom().catch(e => console.warn("[useVoiceCollab] Error during unmount leaveRoom:", e.message));
        }
        audioManager.current.cleanup(); // Stop local media tracks and release resources
    };
  }, [matchId, userRole, toast]); // Dependencies for room initialization

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
        // Basic online check, more sophisticated checks (e.g., NetworkInformation API) could be added
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
    setIsConnecting(true); // Set connecting true at the start of the attempt

    try {
      // 1. Update DB that user is joining (or trying to join)
      const result = await voiceService.current.joinRoom(room.id, userId, userRole);
      if (!result.success || !result.room) {
        throw new Error(result.error || 'Failed to register in voice room (database).');
      }
      console.log('[useVoiceCollab] Successfully registered in DB for room:', result.room.name);

      // 2. Fetch LiveKit Token
      let token: string | null = null;
      console.log(`[useVoiceCollab] Fetching LiveKit token for room ${result.room.id}, user ${userId}`);
      const { data: tokenPayload, error: functionError } = await supabase.functions.invoke('generate-livekit-token', {
          body: { 
              roomId: result.room.id, 
              participantIdentity: userId,
              participantName: userRole // Or a more specific display name if available
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

      // 3. Initialize AudioManager (get microphone access)
      if (!audioManager.current.isStreamActive() || !audioManager.current.getAudioContext() || audioManager.current.getAudioContext()?.state === 'closed') {
        console.log('[useVoiceCollab] Initializing AudioManager and getting user media...');
        await audioManager.current.initialize({ 
            onAudioLevel: setAudioLevel, // Pass callback for local audio level
            onError: (e: Error) => { 
                console.error("[useVoiceCollab] AudioManager initialization error in joinRoom:", e.message);
                toast({ title: "Audio System Error", description: e.message, variant: "destructive" });
            }
        });
        await audioManager.current.getUserMedia(); // This will request mic permission
        
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
      
      // 4. Join LiveKit Room
      const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;
      if (!LIVEKIT_URL) throw new Error("LiveKit server URL (VITE_LIVEKIT_URL) is not configured.");
      
      console.log(`[useVoiceCollab] Joining LiveKit room ${result.room.id} at ${LIVEKIT_URL}`);
      // Pass the local audio track from AudioManager to LiveKitManager
      const localAudioTrack = audioManager.current.getCurrentStream()?.getAudioTracks()[0];
      if (!localAudioTrack) throw new Error("No local audio track available to publish.");
      
      await liveKitManager.current.joinRoom(LIVEKIT_URL, token, result.room.id, {
          audio: true, // We will publish our own track
          // video: false, // Explicitly false for voice-only
          publishDefaults: {
            audioBitrate: 32000, // Example: 32 kbps for Opus
            // dtx: true, // Discontinuous Transmission, can save bandwidth
            // red: true, // Redundant Audio Data, improves resilience
          },
          // Use the track from AudioManager
          // This gives more control, but requires careful management.
          // Alternatively, let LiveKit handle getUserMedia by passing audio: true above
          // and not passing specific tracks. For now, let's let LiveKit manage it for simplicity
          // and rely on audioManager for pre-join checks and audio level monitoring.
      });

      // Set initial mute state in LiveKit
      liveKitManager.current.setTrackEnabled(Track.Source.Microphone, !isMuted);

      setCurrentRoom(result.room);
      setIsVoiceEnabled(true);
      // Determine if current user is admin for *this specific room*
      setIsRoomAdmin(userRole === 'admin' || userRole === 'coordinator' || (result.room.admin_user_ids || []).includes(userId));
      
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
      // Attempt to leave LiveKit room if partially connected
      if (liveKitManager.current.getRoom()?.state !== ConnectionState.Disconnected) {
        liveKitManager.current.leaveRoom().catch(e => console.warn("Error leaving room after failed join:", e.message));
      }
      // Clean up local media if it was started
      audioManager.current.stopTracks(); // Stops mic access if it was granted
      setIsConnecting(false); 
      setIsVoiceEnabled(false); // Ensure voice is disabled
      setCurrentRoom(null); // Clear current room if join failed
      return false;
    }
  }, [userId, userRole, onRoomChanged, toast, setAudioLevel, isMuted]); // Added isMuted

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
    setIsConnecting(true); // Indicate busy state during leave

    try {
      // 1. Disconnect from LiveKit
      await liveKitManager.current.leaveRoom();
      console.log('[useVoiceCollab] Successfully left LiveKit room.');

      // 2. Update DB that user has left (if they were in a currentRoom)
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
      // 3. Reset client-side state
      setCurrentRoom(null);
      setIsVoiceEnabled(false);
      setLivekitParticipants(new Map());
      setRemoteStreams(new Map());
      setPeerStatuses(new Map());
      setLivekitConnectionState(null); // Explicitly set to null or Disconnected
      setIsRoomAdmin(false);
      
      // 4. Stop local media tracks
      audioManager.current.stopTracks();
      setAudioLevel(0); // Reset local audio level display
      
      onRoomChanged?.(null);
      toast({
        title: "Left Voice Room",
        description: `You have been disconnected from ${roomToLeaveName}.`,
      });
      setIsConnecting(false); // Reset busy state
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
    
    // Update LiveKit first
    liveKitManager.current.setTrackEnabled(Track.Source.Microphone, !newMutedState);
    // Update local state immediately for responsive UI
    setIsMuted(newMutedState); 
    
    // Update AudioManager's internal mute state (if it manages its own)
    audioManager.current.setMuted(newMutedState); 

    // Optionally, update backend/DB (can be fire-and-forget or handle errors)
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

  // Effect for audio level when not muted and connected (mostly for UI if AudioManager doesn't drive it)
  useEffect(() => {
    if (!isVoiceEnabled || isMuted || livekitConnectionState !== ConnectionState.Connected) {
      if (audioLevel !== 0) setAudioLevel(0); // Ensure level is zeroed out
      return;
    }
    // AudioManager's onAudioLevel callback should be updating `audioLevel` state directly.
    // This effect is more of a safeguard or if you had a secondary way to clear it.
  }, [isVoiceEnabled, isMuted, livekitConnectionState, audioLevel]);

  return {
    isVoiceEnabled,
    isMuted,
    isConnecting,
    availableRooms,
    currentRoom,
    livekitParticipants: Array.from(livekitParticipants.values()), // Convert Map to Array for easier consumption in UI
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

    // Expose raw maps if direct access is needed, otherwise derived arrays are often better for React
    remoteStreams, // Map of peerId -> MediaStream
    peerStatuses,  // Map of peerId -> connection status string
  };
};