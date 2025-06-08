import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users, Crown, Shield, Wifi, WifiOff, Activity, AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { useVoiceCollaboration } from '@/hooks/useVoiceCollaboration';
import { useIsMobile } from '@/hooks/use-mobile';
import { VoiceRoomService, VoiceRoom as ServiceVoiceRoom } from '@/services/voiceRoomService';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCollaborationProps {
  matchId: string;
  userId: string;
  className?: string;
}

// Local interface that matches what useVoiceCollaboration expects
interface VoiceRoom {
  id: string;
  match_id: string;
  name: string;
  description: string | null;
  max_participants: number;
  priority: number;
  permissions: string[];
  is_private: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

type WebRTCConnectionStateType = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'authorizing' | 'disconnecting';

const VoiceCollaboration: React.FC<VoiceCollaborationProps> = ({
  matchId,
  userId,
  className = ''
}) => {
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState<string>('tracker');
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState<boolean>(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [roomToRejoin, setRoomToRejoin] = useState<VoiceRoom | null>(null);
  
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const voiceService = VoiceRoomService.getInstance();
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
        setUserRole('tracker');
      }
    };
    if (userId) fetchUserRole();
  }, [userId]);
  
  const {
    isVoiceEnabled,
    isMuted,
    isConnecting,
    participants,
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
    connectionState,
    adminSetParticipantMute,
    audioOutputDevices,
    selectedAudioOutputDeviceId,
    selectAudioOutputDevice,
    error: hookError
  } = useVoiceCollaboration({
    matchId,
    userId,
    userRole,
  });

  useEffect(() => {
    // Convert ServiceVoiceRoom to VoiceRoom for compatibility
    if (currentRoom) {
      const compatibleRoom: VoiceRoom = {
        id: currentRoom.id,
        match_id: currentRoom.match_id,
        name: currentRoom.name,
        description: currentRoom.description || null,
        max_participants: currentRoom.max_participants,
        priority: currentRoom.priority,
        permissions: currentRoom.permissions,
        is_private: currentRoom.is_private,
        is_active: currentRoom.is_active,
        created_at: currentRoom.created_at,
        updated_at: currentRoom.updated_at || new Date().toISOString(),
      };
      setRoomToRejoin(compatibleRoom);
    } else {
      setRoomToRejoin(null);
    }
  }, [currentRoom]);

  useEffect(() => {
    if (hookError) {
      setUiError(hookError);
    }
  }, [hookError]);

  const handleRejoin = async () => {
    if (isConnecting) return; 
    if (roomToRejoin && currentRoom) {
      const isCurrentlyConnected = connectionState === 'connected' || 
                                  connectionState === 'connecting';
      
      if (isVoiceEnabled || isCurrentlyConnected) {
        await leaveVoiceRoom(); 
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      // Convert back to ServiceVoiceRoom
      const serviceRoom: ServiceVoiceRoom = {
        ...currentRoom,
        description: currentRoom.description || undefined,
      };
      joinVoiceRoom(serviceRoom);
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

  const getWebRTCStatusIndicator = (state: WebRTCConnectionStateType | null) => {
    const baseClasses = "text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1";
    const iconSize = "h-2 w-2";

    if (state === 'connecting' || state === 'authorizing') return <Badge variant="outline" className={`${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-300`}><Activity className={`${iconSize} animate-spin`} />Connecting Voice...</Badge>;
    if (state === 'connected') return <Badge variant="outline" className={`${baseClasses} bg-green-100 text-green-800 border-green-300`}><Mic className={iconSize} />Voice Connected</Badge>;
    if (state === 'failed') return <Badge variant="destructive" className={`${baseClasses}`}><AlertTriangle className={iconSize} />Voice Failed</Badge>;
    if (state === 'disconnected' && roomToRejoin && !isConnecting) return <Badge variant="destructive" className={`${baseClasses}`}><WifiOff className={iconSize} />Voice Dropped</Badge>;
    if (state === 'disconnected' || state === 'disconnecting') return <Badge variant="outline" className={`${baseClasses} bg-gray-100 text-gray-800 border-gray-300`}><MicOff className={iconSize} />Voice Disconnected</Badge>;
    return null; 
  };

  const getPeerStatusIndicator = (status?: RTCPeerConnectionState) => {
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
      <audio key={peerId} autoPlay playsInline ref={(audioEl) => { if (audioEl && audioEl.srcObject !== stream) audioEl.srcObject = stream; }} style={{ display: 'none' }} data-voice-chat-participant="true" />
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

  if (uiError && !currentRoom) {
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
            <Button onClick={() => { setUiError(null); setInitialized(false); }} variant="outline" size="sm" className="w-full">
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry Init
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const isActuallyConnected = connectionState === 'connected';
  const isCurrentlyActive = isActuallyConnected || isConnecting;

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {audioElements}
      
      <Card className={`border-blue-200 ${isActuallyConnected ? 'bg-green-50/50' : 'bg-blue-50/50'}`}>
        <CardHeader className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
          <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-sm' : 'text-sm sm:text-base'}`}>
            <div className="flex items-center gap-2">
              <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />
              Voice Collaboration Center
              {getNetworkIcon()}
            </div>
            <div className="flex items-center gap-2">
              {getWebRTCStatusIndicator(connectionState)}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowConnectionDetails(!showConnectionDetails)}
                className="p-1"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} pt-0 space-y-3`}>
          {showConnectionDetails && (
            <Alert className="mb-3">
              <Activity className="h-4 w-4" />
              <AlertDescription>
                <div className="text-xs space-y-1">
                  <div>Network: {networkStatus}</div>
                  <div>Voice State: {connectionState || 'disconnected'}</div>
                  <div>Room: {currentRoom?.name || 'None'}</div>
                  <div>Participants: {participants.length}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!isCurrentlyActive && availableRooms.length > 0 && (
            <div className="space-y-2">
              <h3 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Available Voice Rooms</h3>
              <div className="grid gap-2">
                {availableRooms.map((room) => (
                  <Card key={room.id} className={`${getRoomColorClass(room.name)} transition-all hover:shadow-md`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{room.name}</div>
                          <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                            Max: {room.max_participants || 25} participants
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => joinVoiceRoom(room)}
                          disabled={isConnecting}
                          className={isMobile ? 'text-xs px-2 py-1' : ''}
                        >
                          {isConnecting ? <Activity className="h-3 w-3 animate-spin mr-1" /> : <Phone className="h-3 w-3 mr-1" />}
                          Join
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!isCurrentlyActive && availableRooms.length === 0 && (
            <div className="text-center py-4">
              <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                No voice rooms available for this match
              </div>
            </div>
          )}

          {isCurrentlyActive && currentRoom && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Connected to: {currentRoom.name}
                </h3>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={isMuted ? "default" : "outline"}
                    onClick={toggleMute}
                    className={isMobile ? 'text-xs px-2 py-1' : ''}
                  >
                    {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={leaveVoiceRoom}
                    className={isMobile ? 'text-xs px-2 py-1' : ''}
                  >
                    <PhoneOff className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span>Your Audio Level:</span>
                  <AudioLevelIndicator level={audioLevel} />
                </div>

                {participants.length > 0 && (
                  <div>
                    <h4 className={`font-medium mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      Participants ({participants.length})
                    </h4>
                    <div className="space-y-1">
                      {participants.map((participant) => (
                        <div key={participant.id} className={`flex items-center justify-between p-2 rounded ${isMobile ? 'text-xs' : 'text-sm'} bg-white/50`}>
                          <div className="flex items-center gap-2">
                            {getPeerStatusIndicator(peerStatuses.get(participant.id))}
                            <span>{participant.name}</span>
                            {getRoleIcon(participant.role)}
                            {participant.id === userId && <Badge variant="outline" className="text-[10px] px-1">You</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            {participant.isMuted && <MicOff className="h-3 w-3 text-red-500" />}
                            {participant.isSpeaking && !participant.isMuted && (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            )}
                            {isRoomAdmin && participant.id !== userId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => adminSetParticipantMute(participant.id, !participant.isMuted)}
                                className="p-1 h-6 w-6"
                              >
                                {participant.isMuted ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {connectionState === 'failed' && roomToRejoin && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Connection failed</span>
                <Button size="sm" onClick={handleRejoin} disabled={isConnecting}>
                  {isConnecting ? <Activity className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Rejoin
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {audioOutputDevices.length > 0 && showSettings && (
            <div className="space-y-2">
              <h4 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Audio Output Device</h4>
              <select 
                value={selectedAudioOutputDeviceId || ''} 
                onChange={(e) => selectAudioOutputDevice(e.target.value)}
                className={`w-full p-2 border rounded ${isMobile ? 'text-xs' : 'text-sm'}`}
              >
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

export default VoiceCollaboration;
