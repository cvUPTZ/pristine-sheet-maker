
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectionState } from 'livekit-client';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users, Crown, Shield, Wifi, WifiOff, Activity, AlertTriangle, RefreshCw, Database, Ban, Settings } from 'lucide-react';
import { useVoiceCollaboration } from '@/hooks/useVoiceCollaboration';
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
  className = ''
}) => {
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState<string>('tracker');
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [roomToRejoin, setRoomToRejoin] = useState<VoiceRoom | null>(null);
  
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const voiceService = VoiceRoomService.getInstance();
        const connected = await voiceService.testDatabaseConnection();
        setDatabaseConnected(connected);
        setError(null);
      } catch (e: any) {
        setDatabaseConnected(false);
        setError("Database connection test failed.");
      } finally {
        setInitialized(true);
      }
    };
    checkDatabase();
  }, []);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        if (roleError) throw roleError;
        setUserRole(data?.role || 'tracker');
      } catch (e) {
        console.error('Error fetching user role:', e);
        setUserRole('tracker');
      }
    };
    if (userId) fetchUserRole();
  }, [userId]);
  
  const {
    isVoiceEnabled,
    isMuted,
    isConnecting,
    livekitParticipants,
    audioLevel,
    toggleMute,
    availableRooms,
    currentRoom,
    isRoomAdmin,
    joinVoiceRoom,
    leaveVoiceRoom,
    networkStatus,
    remoteStreams, 
    peerStatuses,
    livekitConnectionState, 
    adminSetParticipantMute,
    audioOutputDevices,
    selectedAudioOutputDeviceId,
    selectAudioOutputDevice
  } = useVoiceCollaboration({
    matchId,
    userId,
    userRole,
  });

  useEffect(() => {
    setRoomToRejoin(currentRoom);
  }, [currentRoom]);

  const handleRejoin = async () => {
    if (isConnecting) return; 
    if (roomToRejoin) {
      const isCurrentlyConnected = livekitConnectionState === ConnectionState.Connected || 
                                  livekitConnectionState === ConnectionState.Connecting || 
                                  livekitConnectionState === ConnectionState.Reconnecting;
      
      if (isVoiceEnabled || isCurrentlyConnected) {
        await leaveVoiceRoom(); 
        await new Promise(resolve => setTimeout(resolve, 250)); 
      }
      joinVoiceRoom(roomToRejoin);
    }
  };

  const AudioLevelIndicator = ({ level }: { level: number }) => (
    <div className="flex items-center gap-1">
      <Volume2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-gray-500`} />
      <div className="flex gap-0.5">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`${isMobile ? 'w-0.5 h-2' : 'w-1 h-3'} rounded-sm transition-colors ${
              level > (i + 1) * 0.125 ? 'bg-green-500' : 'bg-gray-300'
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

  const getLiveKitStatusIndicator = (state: ConnectionState | null) => {
    const baseClasses = "text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1";
    const iconSize = "h-2 w-2";

    if (state === ConnectionState.Connecting) return <Badge variant="outline" className={`${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-300`}><Activity className={`${iconSize} animate-spin`} />Connecting Voice...</Badge>;
    if (state === ConnectionState.Connected) return <Badge variant="outline" className={`${baseClasses} bg-green-100 text-green-800 border-green-300`}><Mic className={iconSize} />Voice Connected</Badge>;
    if (state === ConnectionState.Reconnecting) return <Badge variant="outline" className={`${baseClasses} bg-orange-100 text-orange-800 border-orange-300`}><Activity className={`${iconSize} animate-pulse`} />Reconnecting Voice...</Badge>;
    if (state === ConnectionState.Disconnected && roomToRejoin) return <Badge variant="destructive" className={`${baseClasses}`}><WifiOff className={iconSize} />Voice Dropped</Badge>;
    if (state === ConnectionState.Disconnected) return <Badge variant="outline" className={`${baseClasses} bg-gray-100 text-gray-800 border-gray-300`}><MicOff className={iconSize} />Voice Disconnected</Badge>;
    return null; 
  };

  const getPeerStatusIndicator = (status?: string) => {
    const baseClasses = `w-2 h-2 rounded-full ${isMobile ? 'mr-0.5' : 'mr-1'}`;
    if (status === 'connected') return <div className={`${baseClasses} bg-green-500`} title="Connected" />;
    if (status === 'connecting') return <div className={`${baseClasses} bg-yellow-500 animate-pulse`} title="Connecting..." />;
    if (status === 'disconnected') return <div className={`${baseClasses} bg-red-500`} title="Failed" />;
    if (status === 'closed' || status === 'disconnected') return <div className={`${baseClasses} bg-gray-400`} title="Disconnected" />;
    return <div className={`${baseClasses} bg-gray-300`} title="Unknown status" />;
  };

  const [audioElements, setAudioElements] = useState<JSX.Element[]>([]);
  useEffect(() => {
    const elements = Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
      <audio key={peerId} autoPlay playsInline ref={(audioEl) => { if (audioEl && audioEl.srcObject !== stream) audioEl.srcObject = stream; }} style={{ display: 'none' }} />
    ));
    setAudioElements(elements);
  }, [remoteStreams]);

  if (!initialized) {
    return (
      <div className={`space-y-3 sm:space-y-4 ${className}`}>
        {audioElements}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-sm sm:text-base'}`}>
              <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />
              Voice Collaboration Center
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} pt-0`}>
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Initializing system...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 sm:space-y-4 ${className}`}>
        {audioElements}
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-sm sm:text-base'}`}>
              <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-red-600`} />
              Voice Collaboration Center
              <WifiOff className="h-3 w-3 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} pt-0`}>
            <Alert variant="destructive" className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => { setError(null); setInitialized(false); }} variant="outline" size="sm" className="w-full">
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry Init
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Check if currently connected, connecting, or reconnecting
  const isCurrentlyActive = livekitConnectionState === ConnectionState.Connected ||
                           livekitConnectionState === ConnectionState.Connecting ||
                           livekitConnectionState === ConnectionState.Reconnecting;
  
  // Check if disconnected and should show rejoin
  const shouldShowRejoin = livekitConnectionState === ConnectionState.Disconnected && roomToRejoin && !isConnecting;
  
  // Check if should show available rooms
  const shouldShowAvailableRooms = availableRooms.length > 0 && 
                                  !isCurrentlyActive && 
                                  !shouldShowRejoin;

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {audioElements}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-sm sm:text-base'}`}>
            <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />
            Voice Collaboration Center
            {isVoiceEnabled && currentRoom && livekitConnectionState === ConnectionState.Connected && (
              <Badge variant="secondary" className={`${isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'}`}>Live • {isMobile ? currentRoom.name.split(' ')[0] : currentRoom.name}</Badge>
            )}
            {getNetworkIcon()}
            <div title={databaseConnected ? "DB Connected" : "DB Offline Mode"}>
              {databaseConnected ? <Database className="h-3 w-3 text-green-500" /> : <Database className="h-3 w-3 text-orange-500" />}
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {getLiveKitStatusIndicator(livekitConnectionState)}
            {shouldShowAvailableRooms && (
              <Badge variant="outline" className="text-xs">{availableRooms.length} rooms available</Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} pt-0 space-y-3`}>
          {/* API Endpoint Diagnostics */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <h4 className="font-medium text-sm mb-2">🔧 API Diagnostics:</h4>
            <div className="text-xs space-y-1">
              <div>Expected: Supabase Edge Function at /api/generate-livekit-token</div>
              <div>Status: {error ? '❌ Failing' : '🟡 Not deployed/configured'}</div>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="font-medium text-xs mb-1">Deploy Instructions:</div>
                <div className="text-xs">1. supabase functions deploy generate-livekit-token</div>
                <div className="text-xs">2. Set environment variables in Supabase dashboard</div>
                <div className="text-xs">3. Required vars: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET</div>
              </div>
            </div>
          </div>

          {/* LiveKit Configuration Status */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <h4 className="font-medium text-sm mb-2">LiveKit Configuration Status:</h4>
            <div className="text-xs space-y-1">
              <div>VITE_LIVEKIT_URL: {import.meta.env.VITE_LIVEKIT_URL ? '✅ Set' : '❌ Missing'}</div>
              <div>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
              <div>Supabase Anon Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
              {import.meta.env.VITE_LIVEKIT_URL && (
                <div className="mt-1">LiveKit Server: {import.meta.env.VITE_LIVEKIT_URL}</div>
              )}
            </div>
          </div>

          {networkStatus !== 'online' && (
            <Alert variant={networkStatus === 'offline' ? 'destructive' : 'default'}>
              <AlertDescription className="text-sm">
                {networkStatus === 'offline' ? '🔴 Network offline - Voice features unavailable' : '🟡 Network unstable - Voice quality may be affected'}
              </AlertDescription>
            </Alert>
          )}

          {(currentRoom || roomToRejoin) && (
            <>
              {shouldShowRejoin && (
                <Alert variant="destructive" className="my-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <span>Voice connection issue.</span>
                    <Button onClick={handleRejoin} size="sm" className="mt-2 sm:mt-0 sm:ml-2" disabled={isConnecting}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {isConnecting && roomToRejoin?.id === currentRoom?.id ? 'Rejoining...' : 'Rejoin Room'}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {isVoiceEnabled && currentRoom && livekitConnectionState === ConnectionState.Connected && (
                <div className={`${isMobile ? 'p-2' : 'p-3'} rounded border ${getRoomColorClass(currentRoom.name)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-1`}>{getRoleIcon(userRole)}{isMobile ? currentRoom.name.split(' ')[0] : currentRoom.name}{isRoomAdmin && <Crown className="h-3 w-3 text-yellow-500" />}</div>
                      <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>{livekitParticipants.length + 1}/{currentRoom.max_participants} participants</div>
                      {currentRoom.description && !isMobile && (<div className="text-xs text-gray-500 mt-1">{currentRoom.description}</div>)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button onClick={toggleMute} size="sm" variant={isMuted ? "destructive" : "secondary"} disabled={livekitConnectionState !== ConnectionState.Connected} className={isMobile ? 'h-6 w-6 p-0' : ''}>{isMuted ? <MicOff className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} /> : <Mic className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />}</Button>
                      <Button onClick={leaveVoiceRoom} size="sm" variant="destructive" disabled={livekitConnectionState === ConnectionState.Connecting || livekitConnectionState === ConnectionState.Reconnecting} className={isMobile ? 'h-6 w-6 p-0' : ''}><PhoneOff className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} /></Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {isVoiceEnabled && livekitConnectionState === ConnectionState.Connected && (
            <div className={`flex items-center justify-between ${isMobile ? 'gap-1' : 'gap-2'}`}>
              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>Your audio:</span>
              <AudioLevelIndicator level={audioLevel} />
            </div>
          )}
          
          {shouldShowAvailableRooms && (
            <div className="space-y-2">
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 flex items-center justify-between`}>Available Voice Rooms <Badge variant="outline" className="text-xs">Role: {userRole}</Badge></div>
              <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {availableRooms.map((room) => (
                  <div key={room.id} className={`${isMobile ? 'p-2' : 'p-3'} rounded border ${getRoomColorClass(room.name)} ${(room.participant_count || 0) >= room.max_participants ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-1`}>{room.name}{room.is_private && <Shield className="h-3 w-3 text-blue-500" />}</div>
                        <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>{room.participant_count || 0}/{room.max_participants} • {room.is_private ? ' Private' : ' Open'}</div>
                        {!isMobile && room.description && (<div className="text-xs text-gray-500 mt-1 truncate">{room.description}</div>)}
                      </div>
                      <Button onClick={() => joinVoiceRoom(room)} disabled={isConnecting || (room.participant_count || 0) >= room.max_participants || networkStatus === 'offline' || isCurrentlyActive} size={isMobile ? "sm" : "sm"} className={`bg-green-600 hover:bg-green-700 text-white ${isMobile ? 'h-6 px-2 text-[10px]' : ''}`}><Phone className={`${isMobile ? 'h-2 w-2 mr-0.5' : 'h-3 w-3 mr-1'}`} />{isConnecting ? 'Joining...' : 'Join'}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isVoiceEnabled && livekitConnectionState === ConnectionState.Connected && livekitParticipants.length > 0 && (
            <div className="space-y-2">
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 flex items-center justify-between`}>Connected Participants ({livekitParticipants.length}){!isMobile && (<Button variant="ghost" size="sm" onClick={() => setShowConnectionDetails(!showConnectionDetails)} className="text-xs">{showConnectionDetails ? 'Hide Details' : 'Show Details'}</Button>)}</div>
              <div className={`space-y-1 ${isMobile ? 'max-h-24' : 'max-h-32'} overflow-y-auto`}>
                {livekitParticipants.map((participant) => {
                  const peerStatus = peerStatuses.get(participant.id); 
                  return (
                    <div key={participant.id} className={`flex items-center justify-between ${isMobile ? 'p-1.5' : 'p-2'} rounded bg-white border transition-colors ${participant.isSpeaking ? 'border-green-300 bg-green-50' : ''}`}>
                      <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                        {getPeerStatusIndicator(peerStatus)}
                        {getRoleIcon(participant.role)}
                        <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} truncate flex-1`}>{participant.name || `Participant ${participant.id.slice(-4)}`}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {participant.isMuted ? <MicOff className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'} text-red-500`} /> : <Mic className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'} text-green-500`} />}
                        {isRoomAdmin && participant.id !== userId && currentRoom && (<Button variant="ghost" size="icon" className={`ml-1 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} onClick={() => adminSetParticipantMute(currentRoom.id, participant.id, !participant.isMuted)} title={participant.isMuted ? "Admin Unmute" : "Admin Mute"}><Ban className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} ${participant.isMuted ? 'text-gray-500' : 'text-red-600' }`} /></Button>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showConnectionDetails && isVoiceEnabled && livekitConnectionState === ConnectionState.Connected && !isMobile && (
            <div className="text-xs p-2 bg-gray-50 rounded border">
              <div className="font-medium mb-1">Connection Metrics & Statuses</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Total Participants in DB Room: {currentRoom?.participant_count ?? 'N/A'}</div> 
                <div>LiveKit Participants: {livekitParticipants.length}</div>
                <div>Network Status: {networkStatus}</div>
                {livekitConnectionState && <div>LiveKit State: {ConnectionState[livekitConnectionState]}</div>}
                 {import.meta.env.VITE_LIVEKIT_URL && <div>Server: {import.meta.env.VITE_LIVEKIT_URL.slice(0,30)}...</div>}
              </div>
              {livekitParticipants.length > 0 && (
                <div className="mt-2"><div className="font-medium mb-1">LiveKit Participants List</div><div className="flex flex-wrap gap-x-2 gap-y-1">
                    {livekitParticipants.map((p) => (<div key={p.id} className="flex items-center">{getPeerStatusIndicator(peerStatuses.get(p.id))}<span className="text-xs">{p.name || p.id.slice(-4)}: {peerStatuses.get(p.id)}{p.isMuted ? " (Muted)" : ""}</span></div>))}
                </div></div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            {!isCurrentlyActive && !isConnecting && shouldShowAvailableRooms && (
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600 p-1 ${databaseConnected ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} rounded border flex-grow mr-2`}>
                🎤 Voice System Ready ({databaseConnected ? "Online" : "Offline"})
              </div>
            )}
            {isCurrentlyActive && (
                 <Button variant="ghost" size={isMobile ? "icon" : "sm"} onClick={() => setShowSettings(prev => !prev)} className="ml-auto">
                    <Settings className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
                    {!isMobile && <span className="ml-1 text-xs">Settings</span>}
                </Button>
            )}
          </div>
          
          {showSettings && isCurrentlyActive && (
            <div className={`mt-2 p-3 border rounded ${isMobile ? 'text-xs' : ''} bg-slate-50`}>
                <label htmlFor="audioOutputSelect" className="block text-sm font-medium text-gray-800 mb-1">Audio Output (Speaker)</label>
                {audioOutputDevices.length > 0 ? (
                    <select id="audioOutputSelect" value={selectedAudioOutputDeviceId || ''} onChange={(e) => selectAudioOutputDevice(e.target.value)} className={`block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isMobile ? 'text-xs' : 'sm:text-sm'}`} disabled={audioOutputDevices.length === 0}>
                        {audioOutputDevices.map((device, index) => (<option key={device.deviceId} value={device.deviceId}>{device.label || `Speaker ${index + 1}`}</option>))}
                    </select>
                ) : (<p className="text-xs text-gray-500">No audio output devices found. Ensure microphone permission is granted.</p>)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCollaboration;
