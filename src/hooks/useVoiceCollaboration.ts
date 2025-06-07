import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Supabase client
// --- FIX: Use path alias for robust imports ---
import { WebRTCManager } from '@/services/WebRTCManager';
import { AudioManager } from '@/services/AudioManager';
import { toast } from 'sonner';
// --- FIX: Use path alias for type imports as well ---
import type { Database } from '@/lib/database.types';

// Types for props and return values
interface VoiceCollaborationProps {
  matchId: string;
  userId: string;
  userRole: string; // To determine admin capabilities, though not fully used yet
  userName?: string;
  // Callbacks for external components to react to events
  onParticipantJoined?: (participantId: string, participantName?: string) => void;
  onParticipantLeft?: (participantId: string) => void;
  onError?: (errorType: string, errorDetails: any) => void; // More detailed error
}

interface Participant {
  id: string;
  name: string;
  isSpeaking: boolean; // Placeholder - harder with raw WebRTC without audio analysis
  isMuted: boolean;    // True if the participant's audio is muted by themselves or admin
  joinedAt: Date;
  role?: string;       // User's role, if available
  stream?: MediaStream; // Store remote stream for this participant
}

type VoiceRoomRow = Database['public']['Tables']['voice_rooms']['Row'];
type VoiceRoom = VoiceRoomRow & {
  participant_count?: number;
};

// Connection state strings for WebRTC
type WebRTCConnectionStateType = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'authorizing' | 'disconnecting';


interface UseVoiceCollaborationReturn {
  isConnected: boolean;
  isConnecting: boolean; // True if in process of joining a room
  participants: Participant[]; // List of remote participants
  currentUser: Participant | null; // Details of the local user
  error: string | null; // General error messages
  joinVoiceRoom: (room: VoiceRoom) => Promise<void>;
  leaveVoiceRoom: () => Promise<void>;
  toggleMute: () => Promise<void>;
  isMuted: boolean; // Local user's mute state
  connectionState: WebRTCConnectionStateType; // Overall connection state
  roomName: string; // Current room name
  
  // Additional properties for UI
  isVoiceEnabled: boolean; // True if voice features are active (connected to a room)
  audioLevel: number; // Local user's mic audio level (placeholder)
  availableRooms: VoiceRoom[]; // Rooms fetched for the match
  currentRoom: VoiceRoom | null; // The room currently joined or attempting to join
  isRoomAdmin: boolean; // If current user has admin rights in the room (placeholder)
  networkStatus: 'online' | 'offline' | 'unstable'; // Browser network status
  remoteStreams: Map<string, MediaStream>; // Map of participantId to their MediaStream
  peerStatuses: Map<string, RTCPeerConnectionState>; // Map of participantId to their RTCPeerConnectionState
  adminSetParticipantMute: (participantId: string, muted: boolean) => Promise<void>; // Admin action
  audioOutputDevices: MediaDeviceInfo[]; // Available audio output devices
  selectedAudioOutputDeviceId: string | null; // Currently selected output device
  selectAudioOutputDevice: (deviceId: string) => Promise<void>; // Action to select output device
}

export const useVoiceCollaboration = ({
  matchId,
  userId,
  userRole, // Used to set isRoomAdmin, potentially for other features
  userName = 'Unknown User',
  onParticipantJoined: externalOnParticipantJoined, // Renaming to avoid conflict
  onParticipantLeft: externalOnParticipantLeft,
  onError: externalOnError
}: VoiceCollaborationProps): UseVoiceCollaborationReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false); // Local user's mute state
  const [connectionState, setConnectionState] = useState<WebRTCConnectionStateType>('disconnected');
  const [roomName, setRoomName] = useState('');
  
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // Placeholder
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [isRoomAdmin, setIsRoomAdmin] = useState(userRole === 'admin' || userRole === 'coordinator'); // Example admin logic

  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online');
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerStatuses, setPeerStatuses] = useState<Map<string, RTCPeerConnectionState>>(new Map());

  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState<string | null>(null);

  const webRTCManagerRef = useRef<WebRTCManager | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);


  // Initialize AudioManager
  useEffect(() => {
    audioManagerRef.current = AudioManager.getInstance();
  }, []);
  
  // Initialize WebRTCManager and set up callbacks
  useEffect(() => {
    if (!userId || !supabase || !audioManagerRef.current) return;

    // Default STUN server, consider making this configurable
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

    const manager = new WebRTCManager(supabase, userId, userName, iceServers, {
      onConnectionStateChanged: (pId, state) => {
        setPeerStatuses(prev => new Map(prev).set(pId, state));
        if (state === 'connected' && pId === userId) { // Assuming self-connection indicates overall readiness
            // This might need refinement; WebRTCManager doesn't have an "overall" room connection state event yet.
            // For now, if local user's "peer connection" to self (if that's a concept) or signaling channel is up.
        }
      },
      onParticipantJoined: (pId, pName) => {
        console.log(`[Hook] Participant joined: ${pName} (${pId})`);
        setParticipants(prev => {
          if (prev.find(p => p.id === pId)) return prev;
          return [...prev, { id: pId, name: pName || pId, isMuted: false, isSpeaking: false, joinedAt: new Date() }];
        });
        externalOnParticipantJoined?.(pId, pName);
        toast.info(`${pName || pId} joined the voice room.`);
      },
      onParticipantLeft: (pId) => {
        console.log(`[Hook] Participant left: ${pId}`);
        setParticipants(prev => prev.filter(p => p.id !== pId));
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(pId);
          return newMap;
        });
        setPeerStatuses(prev => {
            const newMap = new Map(prev);
            newMap.delete(pId);
            return newMap;
        });
        externalOnParticipantLeft?.(pId);
        toast.info(`A participant left the voice room.`); // Name might be lost here
      },
      onRemoteTrackAdded: (pId, stream) => {
        console.log(`[Hook] Remote track added for ${pId}`);
        setRemoteStreams(prev => new Map(prev).set(pId, stream));
         // Update participant with stream
        setParticipants(prev => prev.map(p => p.id === pId ? { ...p, stream } : p));
      },
      onRemoteTrackRemoved: (pId) => {
        console.log(`[Hook] Remote track removed for ${pId}`);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(pId);
          return newMap;
        });
         // Remove stream from participant
        setParticipants(prev => prev.map(p => p.id === pId ? { ...p, stream: undefined } : p));
      },
      onParticipantMuteChanged: (pId, mutedState) => {
        console.log(`[Hook] Participant mute changed: ${pId}, muted: ${mutedState}`);
        setParticipants(prev => prev.map(p => (p.id === pId ? { ...p, isMuted: mutedState } : p)));
        if (pId === userId) {
          setIsMuted(mutedState);
        }
      },
      onError: (errorType, errorDetails) => {
        console.error(`[Hook] WebRTC Error - Type: ${errorType}`, errorDetails);
        setError(`WebRTC Error: ${errorType} - ${errorDetails?.message || JSON.stringify(errorDetails)}`);
        externalOnError?.(errorType, errorDetails);
        toast.error(`Voice collaboration error: ${errorType}`);
        if (errorType === 'authorization' || errorType === 'join_room_error') {
            setConnectionState('failed');
            setIsConnected(false);
            setIsConnecting(false);
            setIsVoiceEnabled(false);
        }
      },
      onLocalStreamReady: (stream) => {
        console.log('[Hook] Local stream ready.');
        // You might want to do something with the local stream here, e.g., display it or attach to an audio element for local feedback (already done by AM)
      }
    });
    webRTCManagerRef.current = manager;

    // Cleanup when component unmounts or dependencies change
    return () => {
      console.log('[Hook] Cleaning up WebRTCManager.');
      manager.leaveRoom();
      webRTCManagerRef.current = null;
    };
  }, [userId, userName, supabase, externalOnParticipantJoined, externalOnParticipantLeft, externalOnError]);


  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      if (!matchId) return;
      try {
        const { data, error: fetchError } = await supabase
          .from('voice_rooms')
          .select('*')
          .eq('match_id', matchId)
          .eq('is_active', true);
        
        if (fetchError) throw fetchError;
        setAvailableRooms(data || []);
      } catch (err) {
        console.error('Failed to fetch voice rooms:', err);
        toast.error('Failed to fetch voice rooms.');
      }
    };
    fetchRooms();
  }, [matchId, supabase]);

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatusHandler = () => {
      setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    };
    window.addEventListener('online', updateNetworkStatusHandler);
    window.addEventListener('offline', updateNetworkStatusHandler);
    updateNetworkStatusHandler();
    return () => {
      window.removeEventListener('online', updateNetworkStatusHandler);
      window.removeEventListener('offline', updateNetworkStatusHandler);
    };
  }, []);

  // Get audio output devices
  useEffect(() => {
    const getAudioDevices = async () => {
      if (!audioManagerRef.current) return;
      try {
        const devices = await audioManagerRef.current.getAudioOutputDevices();
        setAudioOutputDevices(devices);
        if (devices.length > 0 && !selectedAudioOutputDeviceId) {
          setSelectedAudioOutputDeviceId(devices[0].deviceId); // Select first device by default
        }
      } catch (err) {
        console.error('Failed to get audio output devices:', err);
        toast.error('Failed to list audio output devices.');
      }
    };
    getAudioDevices();
  }, [selectedAudioOutputDeviceId]);


  const joinVoiceRoom = useCallback(async (roomToJoin: VoiceRoom): Promise<void> => {
    if (!webRTCManagerRef.current) {
      setError('WebRTC Manager not initialized.');
      toast.error('Voice system not ready.');
      return;
    }
    if (isConnecting || (isConnected && currentRoom?.id === roomToJoin.id)) {
      console.warn(`Already connecting to or connected to room ${roomToJoin.name}`);
      return;
    }

    console.log(`[Hook] Attempting to join room: ${roomToJoin.name} (${roomToJoin.id})`);
    setIsConnecting(true);
    setConnectionState('authorizing'); // Or 'connecting'
    setCurrentRoom(roomToJoin);
    setRoomName(roomToJoin.name);
    setError(null);

    try {
      await webRTCManagerRef.current.joinRoom(roomToJoin.id);
      // Success part of joinRoom is mostly handled by callbacks from WebRTCManager
      // (e.g., presence join, signaling channel subscription success)
      // We can assume if joinRoom doesn't throw, it's in progress.
      // Actual "connected" state might be set when presence sync is complete or first peer joins.
      console.log(`[Hook] joinRoom call for ${roomToJoin.name} completed. Waiting for WebRTCManager events.`);
      // For now, let's set some optimistic states, actual connection confirmed by events
      setConnectionState('connecting'); 
      // isConnected and isVoiceEnabled will be set based on WebRTCManager's events
      // For instance, when presence channel subscription is 'SUBSCRIBED'
      // This part needs refinement based on WebRTCManager's successful subscription indication.
      // For now, let's assume joinRoom in WebRTCManager will trigger some state to indicate it's "connected" to signaling.
      setIsConnected(true); // Optimistic, actual connection state is more nuanced
      setIsVoiceEnabled(true); // Optimistic
      
      // Set local user details
      setCurrentUser({
        id: userId,
        name: userName,
        isMuted: webRTCManagerRef.current.getLocalMuteState() || false,
        isSpeaking: false,
        joinedAt: new Date(),
        role: userRole,
      });
      toast.success(`Joining voice room: ${roomToJoin.name}`);

    } catch (err) {
      console.error(`[Hook] Failed to join room ${roomToJoin.name}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error joining room';
      setError(errorMessage);
      externalOnError?.('join_room_error', err);
      toast.error(`Failed to join room: ${errorMessage.substring(0,100)}`);
      
      setIsConnecting(false);
      setIsConnected(false);
      setIsVoiceEnabled(false);
      setConnectionState('failed');
      setCurrentRoom(null);
    }
  }, [userId, userName, userRole, isConnecting, isConnected, currentRoom?.id, externalOnError]);


  const leaveVoiceRoom = useCallback(async (): Promise<void> => {
    console.log('[Hook] Leaving voice room.');
    setConnectionState('disconnecting');
    if (webRTCManagerRef.current) {
      await webRTCManagerRef.current.leaveRoom();
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsVoiceEnabled(false);
    setParticipants([]);
    setCurrentUser(null);
    // setError(null); // Keep last error for inspection? Or clear.
    setIsMuted(false); // Reset local mute state on leave
    setConnectionState('disconnected');
    setRoomName('');
    setCurrentRoom(null);
    setRemoteStreams(new Map());
    setPeerStatuses(new Map());
    toast.info('Disconnected from voice room');
  }, []);

  const toggleMute = useCallback(async (): Promise<void> => {
    if (!webRTCManagerRef.current || !isConnected) {
      console.warn('Cannot toggle mute: Not connected or WebRTCManager not available.');
      return;
    }
    try {
      const newMutedState = await webRTCManagerRef.current.toggleMute();
      if (typeof newMutedState === 'boolean') {
        setIsMuted(newMutedState); // Local state updated by callback, but direct set is fine
        toast.info(`Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
      }
    } catch (err) {
      console.error('[Hook] Failed to toggle mute:', err);
      toast.error('Failed to toggle mute state.');
    }
  }, [isConnected]);

  const adminSetParticipantMute = useCallback(async (participantId: string, mutedState: boolean): Promise<void> => {
    if (!webRTCManagerRef.current || !currentRoom) {
      console.warn('Cannot set participant mute: Not in a room or WebRTCManager not available.');
      return;
    }
    if (!isRoomAdmin) {
        toast.error("You don't have permission to mute others.");
        return;
    }
    console.log(`[Hook] Admin ${mutedState ? 'muting' : 'unmuting'} participant ${participantId}`);
    
    // This requires WebRTCManager to have a method for sending admin commands.
    // Let's assume webRTCManagerRef.current.adminSetRemoteMute(participantId, mutedState);
    // which would then send a specific signaling message.
    // For now, this is a placeholder for the actual implementation within WebRTCManager.
    // await webRTCManagerRef.current.sendAdminMuteCommand(participantId, mutedState); 
    toast.info(`Admin command sent to ${mutedState ? 'mute' : 'unmute'} ${participantId}. (Feature WIP)`);
    
    // Temporary client-side update for visual feedback, real update via signaling.
    // setParticipants(prev => 
    //   prev.map(p => (p.id === participantId ? { ...p, isMuted: mutedState } : p))
    // );

  }, [currentRoom, isRoomAdmin]);

  const selectAudioOutputDevice = useCallback(async (deviceId: string): Promise<void> => {
    if (!audioManagerRef.current) return;
    try {
      await audioManagerRef.current.setAudioOutputDevice(deviceId);
      setSelectedAudioOutputDeviceId(deviceId);
      toast.success('Audio output device changed.');
    } catch (err) {
      console.error('[Hook] Failed to set audio output device:', err);
      toast.error('Failed to change audio output device.');
    }
  }, []);

  // Main cleanup effect
  useEffect(() => {
    return () => {
      console.log('[Hook] Unmounting, ensuring WebRTCManager is cleaned up.');
      webRTCManagerRef.current?.leaveRoom();
    };
  }, []);

   return {
    isConnected,
    isConnecting,
    participants,
    currentUser,
    error,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    isMuted,
    connectionState,
    roomName,
    isVoiceEnabled,
    audioLevel, // Placeholder
    availableRooms,
    currentRoom,
    isRoomAdmin,
    networkStatus,
    remoteStreams,
    peerStatuses,
    adminSetParticipantMute,
    audioOutputDevices,
    selectedAudioOutputDeviceId,
    selectAudioOutputDevice,
  };
};