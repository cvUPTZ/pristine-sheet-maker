import React, { useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users, Crown, Shield, Wifi, WifiOff, Activity, AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { useVoiceCollaboration, VoiceParticipant } from '@/hooks/useVoiceCollaboration'; // Import the hook and new type
import { useIsMobile } from '@/hooks/use-mobile';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCollaborationProps {
  matchId: string;
  userId: string;
  className?: string;
}

const VoiceCollaboration: React.FC<VoiceCollaborationProps> = ({
  matchId,
  userId,
  className = '',
}) => {
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState<string>('tracker');
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // The hook call is now simpler, but the returned values match your original needs.
  const {
    token, serverUrl, isConnecting, isMuted, participants, audioLevel,
    toggleMute, availableRooms, currentRoom, isRoomAdmin,
    joinVoiceRoom, leaveVoiceRoom, networkStatus, connectionState,
    adminSetParticipantMute, audioOutputDevices, selectedAudioOutputDeviceId,
    selectAudioOutputDevice, error: hookError, fetchAvailableRooms,
  } = useVoiceCollaboration({ userId, userRole });

  // Combined initialization effect from your original code
  useEffect(() => {
    const initializeSystem = async () => {
      setInitialized(false);
      setUiError(null);
      try {
        const voiceService = VoiceRoomService.getInstance();
        const connected = await voiceService.testDatabaseConnection();
        if (!connected) throw new Error("Database connection test failed.");

        const { data, error: roleError } = await supabase.from('profiles').select('role').eq('id', userId).single();
        if (roleError) throw roleError;
        setUserRole(data?.role || 'tracker');

        if (matchId) await fetchAvailableRooms(matchId);
      } catch (e: any) {
        setUiError(e.message);
      } finally {
        setInitialized(true);
      }
    };
    initializeSystem();
  }, [userId, matchId, fetchAvailableRooms]);

  // Preserve your error handling logic
  useEffect(() => {
    if (hookError) setUiError(hookError);
  }, [hookError]);

  const handleRejoin = () => {
    if (isConnecting || !currentRoom) return;
    leaveVoiceRoom();
    // A small delay allows the disconnection to complete cleanly before rejoining.
    setTimeout(() => joinVoiceRoom(currentRoom), 250);
  };

  // --- All your original UI helper functions are preserved ---

  const AudioLevelIndicator = ({ level }: { level: number }) => (
    <div className="flex items-center gap-1">
      <Volume2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-gray-500`} />
      <div className="flex gap-0.5">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`${isMobile ? 'w-0.5 h-2' : 'w-1 h-3'} rounded-sm transition-colors ${
              level > (i + 1) * 0.08 ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-mono ml-1`}>
        {Math.round(level * 100)}%
      </span>
    </div>
  );

  const getRoleIcon = (role?: string) => {
    const iconSize = isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3';
    if (role === 'admin') return <Crown className={`${iconSize} text-yellow-500`} />;
    if (role === 'coordinator') return <Shield className={`${iconSize} text-blue-500`} />;
    return null;
  };

  const getRoomColorClass = (roomName?: string) => {
    if (!roomName) return 'bg-gray-100 border-gray-300';
    if (roomName.includes('Main')) return 'bg-blue-100 border-blue-300';
    if (roomName.includes('Coordinators')) return 'bg-purple-100 border-purple-300';
    if (roomName.includes('Technical')) return 'bg-gray-100 border-gray-300';
    if (roomName.includes('Emergency')) return 'bg-red-100 border-red-300';
    return 'bg-gray-100 border-gray-300';
  };

  const getNetworkIcon = () => {
    if (networkStatus === 'offline') return <WifiOff className="h-3 w-3 text-red-500" />;
    if (networkStatus === 'unstable') return <Wifi className="h-3 w-3 text-yellow-500" />;
    return <Wifi className="h-3 w-3 text-green-500" />;
  };

  const getWebRTCStatusIndicator = (state: string | null) => {
    const baseClasses = "text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1";
    const iconSize = "h-2 w-2";
    if (state === 'connecting') return <Badge variant="outline" className={`${baseClasses} bg-yellow-100 text-yellow-800`}><Activity className={`${iconSize} animate-spin`} />Connecting...</Badge>;
    if (state === 'connected') return <Badge variant="outline" className={`${baseClasses} bg-green-100 text-green-800`}><Mic className={iconSize} />Connected</Badge>;
    if (state === 'failed') return <Badge variant="destructive" className={`${baseClasses}`}><AlertTriangle className={iconSize} />Failed</Badge>;
    if (state === 'disconnected' && currentRoom && !isConnecting) return <Badge variant="destructive" className={`${baseClasses}`}><WifiOff className={iconSize} />Dropped</Badge>;
    if (state === 'disconnected') return <Badge variant="outline" className={`${baseClasses} bg-gray-100 text-gray-800`}><MicOff className={iconSize} />Disconnected</Badge>;
    return null;
  };

  // --- Loading and Error States (Preserved) ---

  if (!initialized) {
    return (
      <Card className={className}><CardContent className="p-4 text-center"><Activity className="h-6 w-6 animate-spin mx-auto" /><p className="text-sm text-muted-foreground mt-2">Initializing System...</p></CardContent></Card>
    );
  }

  if (uiError && !token) {
    return (
      <Card className={`${className} border-red-200 bg-red-50/50`}>
        <CardHeader><CardTitle className="text-base text-red-700">System Error</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-3"><AlertTriangle className="h-4 w-4" /><AlertDescription>{uiError}</AlertDescription></Alert>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="w-full"><RefreshCw className="h-3 w-3 mr-2" />Retry</Button>
        </CardContent>
      </Card>
    );
  }
  
  // --- Main Render Logic (Refactored) ---

  const ConnectedView = () => (
    <>
      <RoomAudioRenderer sinkId={selectedAudioOutputDeviceId ?? undefined} />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`font-medium truncate pr-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>Connected to: {currentRoom?.name}</h3>
          <div className="flex gap-2">
            <Button size="sm" variant={isMuted ? "default" : "outline"} onClick={toggleMute} className={isMobile ? 'text-xs px-2 py-1' : ''}>{isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}</Button>
            <Button size="sm" variant="destructive" onClick={leaveVoiceRoom} className={isMobile ? 'text-xs px-2 py-1' : ''}><PhoneOff className="h-3 w-3" /></Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}><span>Your Audio Level:</span><AudioLevelIndicator level={audioLevel} /></div>
          {participants.length > 0 && (
            <div>
              <h4 className={`font-medium mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>Participants ({participants.length})</h4>
              <div className="space-y-1">
                {participants.map((p: VoiceParticipant) => (
                  <div key={p.id} className={`flex items-center justify-between p-2 rounded ${isMobile ? 'text-xs' : 'text-sm'} bg-white/50`}>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" title="Connected" /><span>{p.name}</span>{getRoleIcon(p.role)}{p.isLocal && <Badge variant="outline" className="text-[10px] px-1">You</Badge>}</div>
                    <div className="flex items-center gap-2">{p.isMuted && <MicOff className="h-3 w-3 text-red-500" />}{p.isSpeaking && !p.isMuted && (<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />)}{isRoomAdmin && !p.isLocal && (<Button size="sm" variant="ghost" onClick={() => adminSetParticipantMute(p.id, !p.isMuted)} className="p-1 h-6 w-6">{p.isMuted ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}</Button>)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <Card className={`${className} border-blue-200 ${connectionState === 'connected' ? 'bg-green-50/50' : 'bg-blue-50/50'}`}>
      <CardHeader className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
        <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-sm' : 'text-sm sm:text-base'}`}>
          <div className="flex items-center gap-2"><Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />Voice Collaboration Center{getNetworkIcon()}</div>
          <div className="flex items-center gap-2">{getWebRTCStatusIndicator(connectionState)}<Button variant="ghost" size="sm" onClick={() => setShowConnectionDetails(!showConnectionDetails)} className="p-1"><Settings className="h-3 w-3" /></Button></div>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} pt-0 space-y-3`}>
        {showConnectionDetails && (<Alert className="mb-3"><Activity className="h-4 w-4" /><AlertDescription><div className="text-xs space-y-1"><div>Network: {networkStatus}</div><div>Voice State: {connectionState}</div><div>Room: {currentRoom?.name || 'None'}</div><div>Participants: {participants.length}</div></div></AlertDescription></Alert>)}

        {token && serverUrl ? (
          <LiveKitRoom serverUrl={serverUrl} token={token} connect={true} audio={true} onDisconnected={leaveVoiceRoom}>
            <ConnectedView />
          </LiveKitRoom>
        ) : (
          <div className="space-y-2">
            <h3 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Available Voice Rooms</h3>
            {availableRooms.length > 0 ? (
              availableRooms.map((room) => (
                <Card key={room.id} className={`${getRoomColorClass(room.name)} transition-all hover:shadow-md`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div><div className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{room.name}</div><div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Max: {room.max_participants || 25} participants</div></div>
                      <Button size="sm" onClick={() => joinVoiceRoom(room)} disabled={isConnecting} className={isMobile ? 'text-xs px-2 py-1' : ''}>{isConnecting ? <Activity className="h-3 w-3 animate-spin mr-1" /> : <Phone className="h-3 w-3 mr-1" />}Join</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (<div className="text-center py-4"><div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>No voice rooms available for this match</div></div>)}
          </div>
        )}

        {connectionState === 'failed' && currentRoom && (<Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription className="flex items-center justify-between"><span>Connection failed</span><Button size="sm" onClick={handleRejoin} disabled={isConnecting}>{isConnecting ? <Activity className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}Rejoin</Button></AlertDescription></Alert>)}
        {audioOutputDevices.length > 0 && showSettings && (
          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Audio Output Device</h4>
            <select value={selectedAudioOutputDeviceId || ''} onChange={(e) => selectAudioOutputDevice(e.target.value)} className={`w-full p-2 border rounded ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {audioOutputDevices.map(device => (<option key={device.deviceId} value={device.deviceId}>{device.label || `Speaker ${device.deviceId.slice(0, 8)}`}</option>))}
            </select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceCollaboration;