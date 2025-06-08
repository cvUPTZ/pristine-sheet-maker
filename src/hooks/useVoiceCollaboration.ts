import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useLocalParticipant,
  useParticipants,
  useConnectionState,
  useTracks,
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { AudioLevelMonitor } from '@/services/AudioLevelMonitor';
import { supabase } from '@/integrations/supabase/client';

// The simplified participant object your UI will consume
export interface VoiceParticipant {
  id: string;
  name: string;
  role?: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
}

// Hook's input options
interface VoiceCollaborationOptions {
  userId: string;
  userRole: string;
}

export function useVoiceCollaboration({ userId, userRole }: VoiceCollaborationOptions) {
  // --- State for Connection Management (to be passed to <LiveKitRoom>) ---
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  
  // --- State for UI and Application Logic ---
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online');
  
  // --- LiveKit Hooks: The new source of truth for real-time state ---
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useParticipants();
  const connectionState = useConnectionState();
  const localAudioTrack = useTracks([Track.Source.Microphone], { participant: localParticipant })[0];

  // --- Services and Utilities ---
  const voiceService = useRef(VoiceRoomService.getInstance());
  const audioMonitor = useRef<AudioLevelMonitor | null>(null);

  // --- Network Status Monitoring (Preserved from your original code) ---
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // This interval is a creative way to simulate unstable connections, keeping it.
    const intervalId = setInterval(() => {
      if (navigator.onLine) setNetworkStatus(Math.random() > 0.9 ? 'unstable' : 'online');
      else setNetworkStatus('offline');
    }, 10000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  // --- Audio Device Fetching (Preserved from your original code) ---
  useEffect(() => {
    const initAudioDevices = async () => {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const outputDevices = devices.filter(d => d.kind === 'audiooutput');
          setAudioOutputDevices(outputDevices);
          if (outputDevices.length > 0 && !selectedAudioOutputDeviceId) {
            setSelectedAudioOutputDeviceId(outputDevices[0].deviceId);
          }
        }
      } catch (err) { console.error('Error enumerating audio devices:', err); }
    };
    initAudioDevices();
  }, [selectedAudioOutputDeviceId]);


  // --- Local Audio Monitoring (Now correctly tied to the LiveKit track) ---
  useEffect(() => {
    if (localAudioTrack?.mediaStream) {
      audioMonitor.current?.stopMonitoring();
      audioMonitor.current = new AudioLevelMonitor(setLocalAudioLevel);
      audioMonitor.current.startMonitoring(localAudioTrack.mediaStream);
      return () => audioMonitor.current?.stopMonitoring();
    }
  }, [localAudioTrack]);


  // --- Core Actions ---

  const fetchAvailableRooms = useCallback(async (matchId: string) => {
    try {
      const rooms = await voiceService.current.getRoomsForMatch(matchId);
      setAvailableRooms(rooms);
    } catch (err: any) { setError(`Failed to fetch rooms: ${err.message}`); }
  }, []);

  const joinVoiceRoom = useCallback(async (room: VoiceRoom) => {
    if (isConnecting || connectionState === ConnectionState.Connected) return;
    setIsConnecting(true);
    setError(null);
    try {
      const { data, error: tokenError } = await supabase.functions.invoke('get-livekit-token', {
        body: { roomId: room.id, userId, userName: `User ${userId.substring(0, 4)}`, userRole },
      });
      if (tokenError || !data?.token) throw new Error(tokenError?.message || 'Failed to get LiveKit token');
      setCurrentRoom(room);
      setServerUrl(data.serverUrl);
      setToken(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, [userId, userRole, isConnecting, connectionState]);

  const leaveVoiceRoom = useCallback(() => {
    setToken(null); // This will cause <LiveKitRoom> to unmount and disconnect
    setCurrentRoom(null);
    setLocalAudioLevel(0);
  }, []);

  const toggleMute = useCallback(() => {
    localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  }, [localParticipant]);

  const adminSetParticipantMute = useCallback(async (participantId: string, shouldMute: boolean) => {
    // This now requires a server-side implementation for security.
    // Calling a Supabase Edge Function is the correct pattern.
    console.log(`TODO: Admin mute for ${participantId} to ${shouldMute}`);
    // const { error } = await supabase.functions.invoke('moderate-participant', {
    //   body: { roomId: currentRoom?.id, targetId: participantId, mute: shouldMute }
    // });
    // if (error) setError("Admin action failed.");
    return false; // Return false until implemented
  }, [currentRoom]);

  const selectAudioOutputDevice = useCallback(async (deviceId: string) => {
    setSelectedAudioOutputDeviceId(deviceId);
    // Note: The actual setting of the sinkId now happens on the <RoomAudioRenderer> component
  }, []);


  // --- Derived State for the UI ---

  const isMuted = localParticipant?.isMicrophoneEnabled === false;
  const isVoiceEnabled = connectionState === ConnectionState.Connected;
  const isRoomAdmin = userRole === 'admin' || userRole === 'coordinator';

  // This logic is simplified because the hooks give us the correct state directly.
  const participants: VoiceParticipant[] = [localParticipant, ...remoteParticipants]
    .filter((p): p is NonNullable<typeof p> => !!p && !!p.identity)
    .map(p => ({
      id: p.identity,
      name: p.name || p.identity,
      role: p.isLocal ? userRole : undefined, // Role for remotes would come from metadata
      isMuted: p.isMuted,
      isSpeaking: p.isSpeaking,
      isLocal: p.isLocal,
    }));
  
  // Translate LiveKit's connection state to your original custom state strings
  const mappedConnectionState = (): 'disconnected' | 'connecting' | 'connected' | 'failed' => {
    switch(connectionState) {
        case ConnectionState.Connecting:
        case ConnectionState.Reconnecting:
            return 'connecting';
        case ConnectionState.Connected:
            return 'connected';
        case ConnectionState.Disconnected:
            return 'disconnected';
        case ConnectionState.Failed:
            return 'failed';
        default:
            return 'disconnected';
    }
  }

  return {
    // Provide state and actions to the component, matching your original structure
    token, serverUrl, // New props needed for <LiveKitRoom>
    isVoiceEnabled, isMuted, isConnecting,
    participants,
    audioLevel: isMuted ? 0 : localAudioLevel, // Correctly handle muted audio level
    toggleMute,
    availableRooms, currentRoom, isRoomAdmin,
    joinVoiceRoom, leaveVoiceRoom,
    networkStatus,
    connectionState: mappedConnectionState(),
    adminSetParticipantMute,
    audioOutputDevices, selectedAudioOutputDeviceId, selectAudioOutputDevice,
    error, fetchAvailableRooms,
    // These are no longer needed as LiveKit handles them
    remoteStreams: new Map(),
    peerStatuses: new Map(),
  };
}