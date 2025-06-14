import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useConnectionState,
  useTracks,
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users, Crown, Shield, Wifi, WifiOff, Activity, AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { useVoiceCollaboration } from '@/hooks/useVoiceCollaboration';
import { useIsMobile } from '@/hooks/use-mobile';
import { VoiceRoom } from '@/services/voiceRoomService';
import { supabase } from '@/integrations/supabase/client';
import { AudioLevelMonitor } from '@/services/AudioLevelMonitor';

interface VoiceCollaborationProps {
  matchId: string;
  userId: string;
  className?: string;
}

// ============================================================================
// INTERNAL UI COMPONENT: Renders the UI for the CONNECTED state.
// It's a child of <LiveKitRoom> and can safely use LiveKit hooks.
// ============================================================================
const VoiceCollaborationUI = ({
  userRole,
  currentRoom,
  networkStatus,
  audioOutputDevices,
  selectedAudioOutputDeviceId,
  onLeave,
  onSelectAudioOutputDevice,
}: {
  userRole: string;
  currentRoom: VoiceRoom;
  networkStatus: 'online' | 'offline' | 'unstable';
  audioOutputDevices: MediaDeviceInfo[];
  selectedAudioOutputDeviceId: string | null;
  onLeave: () => void;
  onSelectAudioOutputDevice: (deviceId: string) => void;
}) => {
  const isMobile = useIsMobile();
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const audioMonitor = useRef<AudioLevelMonitor | null>(null);

  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useParticipants();
  const localAudioTrack = useTracks([Track.Source.Microphone], { onlySubscribed: false })[0];

  useEffect(() => {
    if (localAudioTrack?.publication?.track) {
      const mediaStreamTrack = localAudioTrack.publication.track.mediaStreamTrack;
      if (mediaStreamTrack) {
        audioMonitor.current?.stopMonitoring();
        const mediaStream = new MediaStream([mediaStreamTrack]);
        audioMonitor.current = new AudioLevelMonitor(setLocalAudioLevel);
        audioMonitor.current.startMonitoring(mediaStream);
        return () => audioMonitor.current?.stopMonitoring();
      }
    }
  }, [localAudioTrack]);

  const toggleMute = useCallback(() => {
    localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  }, [localParticipant]);

  const isMuted = localParticipant?.isMicrophoneEnabled === false;
  const participants = [localParticipant, ...remoteParticipants].filter(p => !!p);
  const isRoomAdmin = userRole === 'admin' || userRole === 'coordinator';

  const adminSetParticipantMute = (participantId: string, shouldMute: boolean) => {
    console.warn(`Admin mute for ${participantId} to ${shouldMute} must be implemented via a secure server call.`);
  };

  const AudioLevelIndicator = ({ level }: { level: number }) => (
    <div className="flex items-center gap-1">
      <Volume2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-gray-500`} />
      <div className="flex gap-0.5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`${isMobile ? 'w-0.5 h-2' : 'w-1 h-3'} rounded-sm transition-colors ${level > (i + 1) * 0.08 ? 'bg-green-500' : 'bg-gray-300'}`} />
        ))}
      </div>
      <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-mono ml-1`}>{Math.round(level * 100)}%</span>
    </div>
  );

  const getRoleIcon = (role?: string) => {
    const iconSize = isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3';
    if (role === 'admin') return <Crown className={`${iconSize} text-yellow-500`} />;
    if (role === 'coordinator') return <Shield className={`${iconSize} text-blue-500`} />;
    return null;
  };

  const getNetworkIcon = () => {
    if (networkStatus === 'offline') return <WifiOff className="h-3 w-3 text-red-500" />;
    if (networkStatus === 'unstable') return <Wifi className="h-3 w-3 text-yellow-500" />;
    return <Wifi className="h-3 w-3 text-green-500" />;
  };

  const getWebRTCStatusIndicator = (state: ConnectionState) => {
    const baseClasses = "text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1";
    const iconSize = "h-2 w-2";
    if (state === ConnectionState.Connecting || state === ConnectionState.Reconnecting) return <Badge variant="outline" className={`${baseClasses} bg-yellow-100 text-yellow-800`}><Activity className={`${iconSize} animate-spin`} />Connecting...</Badge>;
    if (state === ConnectionState.Connected) return <Badge variant="outline" className={`${baseClasses} bg-green-100 text-green-800`}><Mic className={iconSize} />Connected</Badge>;
    if (state === ConnectionState.Disconnected) return <Badge variant="destructive" className={`${baseClasses}`}><WifiOff className={iconSize} />Dropped</Badge>;
    return null;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className={`border-blue-200 ${connectionState === ConnectionState.Connected ? 'bg-green-50/50' : 'bg-blue-50/50'}`}>
        <RoomAudioRenderer />
        <CardHeader className="p-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Voice Collaboration
              {getNetworkIcon()}
            </div>
            <div className="flex items-center gap-2">
              {getWebRTCStatusIndicator(connectionState)}
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="p-1">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          {showSettings && (
            <Alert className="mb-3">
              <Activity className="h-4 w-4" />
              <AlertDescription>
                <div className="text-xs space-y-1">
                  <div>Network: {networkStatus}</div>
                  <div>Voice State: {connectionState}</div>
                  <div>Room: {currentRoom?.name || 'None'}</div>
                  <div>Participants: {participants.length}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center justify-between bg-white/70 rounded-lg p-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate text-sm">Connected to: {currentRoom.name}</h3>
            </div>
            <div className="flex gap-2 ml-2">
              <Button size="sm" variant={isMuted ? "default" : "outline"} onClick={toggleMute}>
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
              <Button size="sm" variant="destructive" onClick={onLeave}>
                <PhoneOff className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm bg-white/50 rounded-lg p-2">
              <span>Your Audio Level:</span>
              <AudioLevelIndicator level={isMuted ? 0 : localAudioLevel} />
            </div>
            
            {participants.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Participants ({participants.length})</h4>
                <div className="grid gap-2">
                  {participants.map((p) => (
                    <div key={p.identity} className="flex items-center justify-between p-2 rounded-lg text-sm bg-white/50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
                        <span className="truncate">{p.name || p.identity}</span>
                        {getRoleIcon(p.isLocal ? userRole : undefined)}
                        {p.isLocal && <Badge variant="outline" className="text-[10px] px-1">You</Badge>}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {p.isMicrophoneEnabled === false && <MicOff className="h-3 w-3 text-red-500" />}
                        {p.isSpeaking && p.isMicrophoneEnabled !== false && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                        {isRoomAdmin && !p.isLocal && (
                          <Button size="sm" variant="ghost" onClick={() => adminSetParticipantMute(p.identity, p.isMicrophoneEnabled !== false)} className="p-1 h-6 w-6">
                            {p.isMicrophoneEnabled === false ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {audioOutputDevices.length > 0 && showSettings && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Audio Output Device</h4>
              <select value={selectedAudioOutputDeviceId || ''} onChange={(e) => onSelectAudioOutputDevice(e.target.value)} className="w-full p-2 border rounded text-sm">
                {audioOutputDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: Manages the disconnected state and decides when to connect.
// ============================================================================
const VoiceCollaboration: React.FC<VoiceCollaborationProps> = ({ matchId, userId, className = '' }) => {
  const [userRole, setUserRole] = useState('tracker');
  const [initialized, setInitialized] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const { token, serverUrl, isConnecting, error, availableRooms, currentRoom, fetchAvailableRooms, joinVoiceRoom, leaveVoiceRoom } = useVoiceCollaboration({ userId, userRole });
  
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online');
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setInitialized(false);
      try {
        const { data, error: roleError } = await supabase.from('profiles').select('role').eq('id', userId).single();
        if (roleError) throw roleError;
        setUserRole(data?.role || 'tracker');
        if (matchId) await fetchAvailableRooms(matchId);
      } catch (e: any) { setUiError(e.message); } finally { setInitialized(true); }
    };
    init();
  }, [matchId, userId, fetchAvailableRooms]);
  
  useEffect(() => { if (error) setUiError(error); }, [error]);

  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const intervalId = setInterval(() => { if (navigator.onLine) setNetworkStatus(Math.random() > 0.9 ? 'unstable' : 'online'); else setNetworkStatus('offline'); }, 10000);
    const initAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputDevices = devices.filter(d => d.kind === 'audiooutput');
        setAudioOutputDevices(outputDevices);
        if (outputDevices.length > 0 && !selectedAudioOutputDeviceId) {
          setSelectedAudioOutputDeviceId(outputDevices[0].deviceId);
        }
      } catch (err) { console.error('Error enumerating audio devices:', err); }
    };
    initAudioDevices();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [selectedAudioOutputDeviceId]);
  
  const getRoomColorClass = (roomName?: string) => {
    if (!roomName) return 'bg-gray-100 border-gray-300';
    if (roomName.includes('Main')) return 'bg-blue-100 border-blue-300';
    if (roomName.includes('Coordinators')) return 'bg-purple-100 border-purple-300';
    if (roomName.includes('Technical')) return 'bg-gray-100 border-gray-300';
    if (roomName.includes('Emergency')) return 'bg-red-100 border-red-300';
    return 'bg-gray-100 border-gray-300';
  };

  if (!initialized) {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Initializing system...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (uiError && !token) {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-base text-red-700">System Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{uiError}</AlertDescription>
            </Alert>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="w-full">
              <RefreshCw className="h-3 w-3 mr-2" />Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {token && serverUrl && currentRoom ? (
        <LiveKitRoom serverUrl={serverUrl} token={token} connect={true} audio={true} onDisconnected={leaveVoiceRoom}>
          <VoiceCollaborationUI
            userRole={userRole}
            currentRoom={currentRoom}
            onLeave={leaveVoiceRoom}
            networkStatus={networkStatus}
            audioOutputDevices={audioOutputDevices}
            selectedAudioOutputDeviceId={selectedAudioOutputDeviceId}
            onSelectAudioOutputDevice={setSelectedAudioOutputDeviceId}
          />
        </LiveKitRoom>
      ) : (
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-600" />
                Voice Collaboration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              {uiError && (
                <Alert variant="destructive" className="mb-2">
                  <AlertDescription>{uiError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Available Voice Rooms</h3>
                {isConnecting ? (
                  <div className="text-center py-4">
                    <Activity className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : availableRooms.length > 0 ? (
                  <div className="grid gap-2">
                    {availableRooms.map((room) => (
                      <div key={room.id} className={`${getRoomColorClass(room.name)} transition-all hover:shadow-md rounded-lg p-3 border`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{room.name}</div>
                            <div className="text-muted-foreground text-xs">Max: {room.max_participants || 25}</div>
                          </div>
                          <Button size="sm" onClick={() => joinVoiceRoom(room)} className="ml-2">
                            <Phone className="h-3 w-3 mr-1" />Join
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No voice rooms available for this match.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VoiceCollaboration;
