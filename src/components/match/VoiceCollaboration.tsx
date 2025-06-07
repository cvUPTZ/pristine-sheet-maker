import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users, Crown, Shield, Wifi, WifiOff, Activity, AlertTriangle, RefreshCw, Database, Ban, Settings } from 'lucide-react';
import { useVoiceCollaboration } from '@/hooks/useVoiceCollaboration';
import { useIsMobile } from '@/hooks/use-mobile';
import { VoiceRoomService, VoiceRoom } from '@/services/voiceRoomService'; // Assuming this service is still used for fetching room list
import { supabase } from '@/integrations/supabase/client';

interface VoiceCollaborationProps {
  matchId: string;
  userId: string;
  className?: string;
}

// Define connection state strings based on useVoiceCollaboration hook
type WebRTCConnectionStateType = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'authorizing' | 'disconnecting';


const VoiceCollaboration: React.FC<VoiceCollaborationProps> = ({
  matchId,
  userId,
  className = ''
}) => {
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState<string>('tracker');
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState<boolean>(false); // This can remain as a general health check
  const [uiError, setUiError] = useState<string | null>(null); // Renamed from 'error' to avoid conflict with hook's error
  const [initialized, setInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [roomToRejoin, setRoomToRejoin] = useState<VoiceRoom | null>(null);
  
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const voiceService = VoiceRoomService.getInstance(); // Assuming this service might still be used for room listing or other DB interactions
        const connected = await voiceService.testDatabaseConnection();
        setDatabaseConnected(connected);
        setUiError(null);
      } catch (e: any) {
        setDatabaseConnected(false);
        setUiError("Database connection test failed.");
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
        setUserRole('tracker'); // Default role
      }
    };
    if (userId) fetchUserRole();
  }, [userId]);
  
  const {
    isVoiceEnabled, // This is now derived from connectionState === 'connected' or similar
    isMuted,
    isConnecting, // From the hook
    participants, // Changed from livekitParticipants
    audioLevel, // Now 0 from the hook
    toggleMute,
    availableRooms,
    currentRoom,
    isRoomAdmin, // From the hook
    joinVoiceRoom,
    leaveVoiceRoom,
    networkStatus,
    remoteStreams, 
    peerStatuses, // Map of peerId to their RTCPeerConnectionState
    connectionState, // Changed from livekitConnectionState (string, not enum)
    adminSetParticipantMute,
    audioOutputDevices,
    selectedAudioOutputDeviceId,
    selectAudioOutputDevice,
    error: hookError // error from the hook
  } = useVoiceCollaboration({
    matchId,
    userId,
    userRole, // Pass userRole to the hook
  });

  useEffect(() => {
    setRoomToRejoin(currentRoom);
  }, [currentRoom]);

  // Update UI error if hook reports an error
  useEffect(() => {
    if (hookError) {
      setUiError(hookError);
    }
  }, [hookError]);

  const handleRejoin = async () => {
    if (isConnecting) return; 
    if (roomToRejoin) {
      const isCurrentlyConnected = connectionState === 'connected' ||
                                  connectionState === 'connecting';
      
      if (isVoiceEnabled || isCurrentlyConnected) { // isVoiceEnabled might be true if previously connected
        await leaveVoiceRoom(); 
        await new Promise(resolve => setTimeout(resolve, 250)); // Give time for cleanup
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
              level > (i + 1) * 0.125 ? 'bg-green-500' : 'bg-gray-300' // Will be gray as level is 0
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
    if (networkStatus === 'unstable') return <Wifi className="h-3 w-3 text-yellow-500" />; // Assuming 'unstable' is a possible state
    return <Wifi className="h-3 w-3 text-green-500" />;
  };

  const getWebRTCStatusIndicator = (state: WebRTCConnectionStateType | null) => {
    const baseClasses = "text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1";
    const iconSize = "h-2 w-2";

    if (state === 'connecting' || state === 'authorizing') return <Badge variant="outline" className={`${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-300`}><Activity className={`${iconSize} animate-spin`} />Connecting Voice...</Badge>;
    if (state === 'connected') return <Badge variant="outline" className={`${baseClasses} bg-green-100 text-green-800 border-green-300`}><Mic className={iconSize} />Voice Connected</Badge>;
    // Reconnecting state might need to be inferred or added to WebRTCManager if desired
    // if (state === 'reconnecting') return <Badge variant="outline" className={`${baseClasses} bg-orange-100 text-orange-800 border-orange-300`}><Activity className={`${iconSize} animate-pulse`} />Reconnecting Voice...</Badge>;
    if (state === 'failed') return <Badge variant="destructive" className={`${baseClasses}`}><AlertTriangle className={iconSize} />Voice Failed</Badge>;
    if (state === 'disconnected' && roomToRejoin && !isConnecting) return <Badge variant="destructive" className={`${baseClasses}`}><WifiOff className={iconSize} />Voice Dropped</Badge>;
    if (state === 'disconnected' || state === 'disconnecting') return <Badge variant="outline" className={`${baseClasses} bg-gray-100 text-gray-800 border-gray-300`}><MicOff className={iconSize} />Voice Disconnected</Badge>;
    return null; 
  };

  const getPeerStatusIndicator = (status?: RTCPeerConnectionState) => { // Use RTCPeerConnectionState
    const baseClasses = `w-2 h-2 rounded-full ${isMobile ? 'mr-0.5' : 'mr-1'}`;
    if (status === 'connected') return <div className={`${baseClasses} bg-green-500`} title="Connected" />;
    if (status === 'connecting') return <div className={`${baseClasses} bg-yellow-500 animate-pulse`} title="Connecting..." />;
    if (status === 'failed') return <div className={`${baseClasses} bg-red-500`} title="Failed" />;
    if (status === 'closed' || status === 'disconnected') return <div className={`${baseClasses} bg-gray-400`} title="Disconnected" />;
    return <div className={`${baseClasses} bg-gray-300`} title={`Status: ${status || 'Unknown'}`} />;
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
        {audioElements} {/* Keep audio elements for potential early stream handling */}
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

  if (uiError && !currentRoom) { // Show general error if not in a room context
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
              <AlertDescription>{uiError}</AlertDescription>
            </Alert>
            <Button onClick={() => { setUiError(null); setInitialized(false); const checkDatabase = async () => { try { const voiceService = VoiceRoomService.getInstance(); const connected = await voiceService.testDatabaseConnection(); setDatabaseConnected(connected); setUiError(null); } catch (e: any) { setDatabaseConnected(false); setUiError("Database connection test failed."); } finally { setInitialized(true); } }; checkDatabase(); }} variant="outline" size="sm" className="w-full">
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry Init
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const isActuallyConnected = connectionState === 'connected';
  // Check if currently active (connected or in the process of connecting/authorizing)
  const isCurrentlyActive = isActuallyConnected || connectionState === 'connecting' || connectionState === 'authorizing';
  
  // Check if disconnected and should show rejoin
  const shouldShowRejoin = connectionState === 'failed' || (connectionState === 'disconnected' && roomToRejoin && !isConnecting);
  
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
            {isActuallyConnected && currentRoom && (
              <Badge variant="secondary" className={`${isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'}`}>Live • {isMobile ? currentRoom.name.split(' ')[0] : currentRoom.name}</Badge>
            )}
            {getNetworkIcon()}
            <div title={databaseConnected ? "DB Connected" : "DB Offline Mode"}>
              {databaseConnected ? <Database className="h-3 w-3 text-green-500" /> : <Database className="h-3 w-3 text-orange-500" />}
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {getWebRTCStatusIndicator(connectionState)}
            {shouldShowAvailableRooms && (
              <Badge variant="outline" className="text-xs">{availableRooms.length} rooms available</Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} pt-0 space-y-3`}>
          {/* Removed LiveKit specific configuration messages */}
          {isActuallyConnected && (
             <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                <h4 className="font-medium text-sm mb-1 text-green-800">Voice System Active</h4>
                <p className="text-xs text-green-700">Real-time voice collaboration is enabled using WebRTC.</p>
             </div>
          )}

          {networkStatus !== 'online' && (
            <Alert variant={networkStatus === 'offline' ? 'destructive' : 'default'}>
              <AlertDescription className="text-sm">
                {networkStatus === 'offline' ? '🔴 Network offline - Voice features unavailable' : '🟡 Network unstable - Voice quality may be affected'}
              </AlertDescription>
            </Alert>
          )}

          {(currentRoom || roomToRejoin) && ( // Show rejoin/current room info if applicable
            <>
              {shouldShowRejoin && (
                <Alert variant="destructive" className="my-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <span>Voice connection issue. {uiError && `Error: ${uiError.substring(0,50)}...`}</span>
                    <Button onClick={handleRejoin} size="sm" className="mt-2 sm:mt-0 sm:ml-2" disabled={isConnecting}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {isConnecting && roomToRejoin?.id === currentRoom?.id ? 'Rejoining...' : 'Rejoin Room'}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {isActuallyConnected && currentRoom && (
                <div className={`${isMobile ? 'p-2' : 'p-3'} rounded border ${getRoomColorClass(currentRoom.name)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-1`}>{getRoleIcon(userRole)}{isMobile ? currentRoom.name.split(' ')[0] : currentRoom.name}{isRoomAdmin && <Crown className="h-3 w-3 text-yellow-500" />}</div>
                      {/* Participant count includes local user, so participants.length + 1 */}
                      <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>{participants.length + 1}/{currentRoom.max_participants} participants</div>
                      {currentRoom.description && !isMobile && (<div className="text-xs text-gray-500 mt-1">{currentRoom.description}</div>)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button onClick={toggleMute} size="sm" variant={isMuted ? "destructive" : "secondary"} disabled={!isActuallyConnected} className={isMobile ? 'h-6 w-6 p-0' : ''}>{isMuted ? <MicOff className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} /> : <Mic className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />}</Button>
                      <Button onClick={leaveVoiceRoom} size="sm" variant="destructive" disabled={connectionState === 'connecting' || connectionState === 'disconnecting'} className={isMobile ? 'h-6 w-6 p-0' : ''}><PhoneOff className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} /></Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {isActuallyConnected && (
            <div className={`flex items-center justify-between ${isMobile ? 'gap-1' : 'gap-2'}`}>
              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>Your audio:</span>
              <AudioLevelIndicator level={audioLevel} /> {/* Will show 0% or be removed if audioLevel is always 0 */}
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

          {isActuallyConnected && participants.length > 0 && (
            <div className="space-y-2">
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700 flex items-center justify-between`}>Connected Participants ({participants.length}){!isMobile && (<Button variant="ghost" size="sm" onClick={() => setShowConnectionDetails(!showConnectionDetails)} className="text-xs">{showConnectionDetails ? 'Hide Details' : 'Show Details'}</Button>)}</div>
              <div className={`space-y-1 ${isMobile ? 'max-h-24' : 'max-h-32'} overflow-y-auto`}>
                {participants.map((participant) => {
                  const peerStatus = peerStatuses.get(participant.id); 
                  return (
                    <div key={participant.id} className={`flex items-center justify-between ${isMobile ? 'p-1.5' : 'p-2'} rounded bg-white border transition-colors ${participant.isSpeaking ? 'border-green-300 bg-green-50' : ''}`}> {/* isSpeaking will be false */}
                      <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                        {getPeerStatusIndicator(peerStatus)}
                        {getRoleIcon(participant.role)}
                        <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} truncate flex-1`}>{participant.name || `Participant ${participant.id.slice(-4)}`}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {participant.isMuted ? <MicOff className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'} text-red-500`} /> : <Mic className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'} text-green-500`} />}
                        {isRoomAdmin && participant.id !== userId && currentRoom && (<Button variant="ghost" size="icon" className={`ml-1 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} onClick={() => adminSetParticipantMute(participant.id, !participant.isMuted)} title={participant.isMuted ? "Admin Unmute" : "Admin Mute"}><Ban className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} ${participant.isMuted ? 'text-gray-500' : 'text-red-600' }`} /></Button>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showConnectionDetails && isActuallyConnected && !isMobile && (
            <div className="text-xs p-2 bg-gray-50 rounded border">
              <div className="font-medium mb-1">Connection Metrics & Statuses</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Total Participants in DB Room: {currentRoom?.participant_count ?? 'N/A'}</div> 
                <div>WebRTC Participants (Remote): {participants.length}</div>
                <div>Network Status: {networkStatus}</div>
                {connectionState && <div>WebRTC State: {connectionState}</div>}
              </div>
              {participants.length > 0 && (
                <div className="mt-2"><div className="font-medium mb-1">Participant Connection States</div><div className="flex flex-wrap gap-x-2 gap-y-1">
                    {participants.map((p) => (<div key={p.id} className="flex items-center">{getPeerStatusIndicator(peerStatuses.get(p.id))}<span className="text-xs">{p.name || p.id.slice(-4)}: {peerStatuses.get(p.id)}{p.isMuted ? " (Muted)" : ""}</span></div>))}
                </div></div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            {!isCurrentlyActive && !isConnecting && shouldShowAvailableRooms && (
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600 p-1 ${databaseConnected ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} rounded border flex-grow mr-2`}>
                🎤 Voice System Ready ({databaseConnected ? "Online" : "Offline Mode"})
              </div>
            )}
            {isCurrentlyActive && ( // Show settings only if trying to connect or connected
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
                ) : (<p className="text-xs text-gray-500">No audio output devices found. Ensure microphone permission is granted if applicable.</p>)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCollaboration;