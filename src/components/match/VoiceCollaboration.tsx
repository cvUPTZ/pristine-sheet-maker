
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useConnectionState,
  useTracks,
} from '@livekit/components-react';
import { ConnectionState, Track, LocalParticipant, RemoteParticipant } from 'livekit-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  Users, 
  Crown, 
  Shield, 
  Wifi, 
  WifiOff, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  Settings,
  ChevronDown,
  ChevronUp,
  Headphones
} from 'lucide-react';

// Mock hooks and services for demo
const useVoiceCollaboration = ({ userId, userRole }: { userId: string; userRole: string }) => ({
  token: 'demo-token',
  serverUrl: 'wss://demo.livekit.cloud',
  isConnecting: false,
  error: null,
  availableRooms: [
    { id: '1', name: 'Main Discussion', max_participants: 25 },
    { id: '2', name: 'Coordinators Only', max_participants: 10 },
    { id: '3', name: 'Technical Support', max_participants: 15 }
  ],
  currentRoom: null,
  fetchAvailableRooms: () => {},
  joinVoiceRoom: (room: any) => {},
  leaveVoiceRoom: () => {}
});

const useIsMobile = () => window.innerWidth < 768;

class AudioLevelMonitor {
  private callback: (level: number) => void;
  private interval: NodeJS.Timeout | null = null;

  constructor(callback: (level: number) => void) {
    this.callback = callback;
  }

  startMonitoring() {
    this.interval = setInterval(() => {
      this.callback(Math.random() * 0.8);
    }, 100);
  }

  stopMonitoring() {
    if (this.interval) clearInterval(this.interval);
  }
}

// Compact Audio Level Indicator
const CompactAudioLevel = ({ level, size = 'sm' }: { level: number; size?: string }) => {
  const barCount = size === 'xs' ? 4 : 6;
  const barHeight = size === 'xs' ? 'h-1' : 'h-1.5';
  const barWidth = size === 'xs' ? 'w-0.5' : 'w-0.5';
  
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(barCount)].map((_, i) => (
        <div
          key={i}
          className={`${barWidth} ${barHeight} rounded-full transition-all duration-150 ${
            level > (i + 1) * (1 / barCount) 
              ? 'bg-gradient-to-t from-green-400 to-green-500 shadow-sm' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
};

// Modern participant avatar
const ParticipantAvatar = ({ 
  participant, 
  userRole, 
  isLocal 
}: { 
  participant: LocalParticipant | RemoteParticipant; 
  userRole?: string; 
  isLocal: boolean;
}) => {
  const initials = participant.name?.slice(0, 2).toUpperCase() || participant.identity?.slice(0, 2).toUpperCase() || 'U';
  const isMuted = participant.isMicrophoneEnabled === false;
  const isSpeaking = participant.isSpeaking && !isMuted;
  
  return (
    <div className="relative group">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
        transition-all duration-200 cursor-pointer
        ${isSpeaking 
          ? 'bg-gradient-to-br from-green-400 to-green-500 text-white ring-2 ring-green-300 ring-offset-1' 
          : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
        }
        ${isLocal ? 'ring-2 ring-blue-300' : ''}
      `}>
        {initials}
        {isMuted && (
          <MicOff className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 text-white rounded-full p-0.5" />
        )}
        {userRole === 'admin' && (
          <Crown className="absolute -top-0.5 -right-0.5 w-3 h-3 text-yellow-500" />
        )}
        {userRole === 'coordinator' && (
          <Shield className="absolute -top-0.5 -right-0.5 w-3 h-3 text-blue-500" />
        )}
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {participant.name || participant.identity}
          {isLocal && ' (You)'}
        </div>
      </div>
    </div>
  );
};

// Main UI Component for Connected State
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
  currentRoom: { name: string } | null;
  networkStatus: string;
  audioOutputDevices: Array<{ deviceId: string; label: string }>;
  selectedAudioOutputDeviceId: string | null;
  onLeave: () => void;
  onSelectAudioOutputDevice: (deviceId: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const audioMonitor = useRef<AudioLevelMonitor | null>(null);

  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useParticipants();
  const localAudioTrack = useTracks([Track.Source.Microphone], { onlySubscribed: false })[0];

  useEffect(() => {
    // Simulate audio monitoring
    audioMonitor.current = new AudioLevelMonitor(setLocalAudioLevel);
    audioMonitor.current.startMonitoring();
    return () => audioMonitor.current?.stopMonitoring();
  }, []);

  const toggleMute = useCallback(() => {
    localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  }, [localParticipant]);

  const isMuted = localParticipant?.isMicrophoneEnabled === false;
  const participants = [localParticipant, ...remoteParticipants].filter(p => !!p);

  const getConnectionColor = () => {
    if (connectionState === ConnectionState.Connected) return 'from-green-500 to-emerald-600';
    if (connectionState === ConnectionState.Connecting) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-red-600';
  };

  const getNetworkIcon = () => {
    if (networkStatus === 'offline') return <WifiOff className="w-3 h-3 text-red-500" />;
    if (networkStatus === 'unstable') return <Wifi className="w-3 h-3 text-yellow-500" />;
    return <Wifi className="w-3 h-3 text-green-500" />;
  };

  return (
    <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <RoomAudioRenderer />
      
      {/* Compact Header */}
      <div className={`
        bg-gradient-to-r ${getConnectionColor()} p-3 text-white
        transition-all duration-300
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium truncate">{currentRoom?.name}</span>
              {getNetworkIcon()}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Participant Count */}
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-white/20 text-white border-0">
              {participants.length}
            </Badge>
            
            {/* Quick Controls */}
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="w-7 h-7 p-0 text-white hover:bg-white/20"
            >
              {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-7 h-7 p-0 text-white hover:bg-white/20"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onLeave}
              className="w-7 h-7 p-0 text-white hover:bg-red-500/30"
            >
              <PhoneOff className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Compact Participant Bar */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {participants.slice(0, 6).map((p) => (
              <ParticipantAvatar
                key={p.identity}
                participant={p}
                userRole={p.isLocal ? userRole : undefined}
                isLocal={p.isLocal}
              />
            ))}
            {participants.length > 6 && (
              <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-xs text-white">
                +{participants.length - 6}
              </div>
            )}
          </div>
          
          {/* Audio Level */}
          <div className="flex items-center gap-1.5 ml-2">
            <Volume2 className="w-3 h-3 text-white/80" />
            <CompactAudioLevel level={isMuted ? 0 : localAudioLevel} size="xs" />
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <CardContent className="p-3 space-y-3">
          {/* Detailed Participant List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Participants</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                className="w-6 h-6 p-0 text-gray-500"
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {participants.map((p) => (
                <div key={p.identity} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <ParticipantAvatar
                    participant={p}
                    userRole={p.isLocal ? userRole : undefined}
                    isLocal={p.isLocal}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-700 truncate">
                      {p.name || p.identity}
                    </div>
                    {p.isLocal && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">You</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="space-y-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Network</span>
                  <div className="font-medium capitalize">{networkStatus}</div>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <div className="font-medium">{connectionState}</div>
                </div>
              </div>
              
              {audioOutputDevices.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Audio Output</label>
                  <select
                    value={selectedAudioOutputDeviceId || ''}
                    onChange={(e) => onSelectAudioOutputDevice(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 rounded-md bg-white"
                  >
                    {audioOutputDevices.map((device: { deviceId: string; label: string }) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

// Main Component
const VoiceCollaboration = ({ matchId = 'demo', userId = 'demo-user', className = '' }: {
  matchId?: string;
  userId?: string;
  className?: string;
}) => {
  const [userRole, setUserRole] = useState('tracker');
  const [initialized, setInitialized] = useState(true); // Skip loading for demo
  const [uiError, setUiError] = useState<string | null>(null);
  
  const { 
    token, 
    serverUrl, 
    isConnecting, 
    error, 
    availableRooms, 
    currentRoom, 
    fetchAvailableRooms, 
    joinVoiceRoom, 
    leaveVoiceRoom 
  } = useVoiceCollaboration({ userId, userRole });
  
  const [networkStatus, setNetworkStatus] = useState('online');
  const [audioOutputDevices, setAudioOutputDevices] = useState([
    { deviceId: 'default', label: 'Default Speaker' },
    { deviceId: 'speaker1', label: 'Headphones' }
  ]);
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState('default');
  const [isConnected, setIsConnected] = useState(false); // Demo state

  const getRoomGradient = (roomName?: string) => {
    if (roomName?.includes('Main')) return 'from-blue-500 to-blue-600';
    if (roomName?.includes('Coordinators')) return 'from-purple-500 to-purple-600';
    if (roomName?.includes('Technical')) return 'from-gray-500 to-gray-600';
    if (roomName?.includes('Emergency')) return 'from-red-500 to-red-600';
    return 'from-blue-500 to-blue-600';
  };

  const handleJoinRoom = (room: any) => {
    setIsConnected(true);
    joinVoiceRoom(room);
  };

  const handleLeaveRoom = () => {
    setIsConnected(false);
    leaveVoiceRoom();
  };

  if (!initialized) {
    return (
      <Card className={`${className} bg-gradient-to-br from-blue-50 to-indigo-100`}>
        <CardContent className="p-4 text-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-gray-600">Connecting...</p>
        </CardContent>
      </Card>
    );
  }

  if (uiError && !token) {
    return (
      <Card className={`${className} bg-gradient-to-br from-red-50 to-red-100 border-red-200`}>
        <CardContent className="p-3">
          <Alert variant="destructive" className="mb-2 border-0 bg-transparent p-2">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs">{uiError}</AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()} size="sm" className="w-full h-7 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {isConnected ? (
        <LiveKitRoom
          video={false}
          audio={true}
          token={token}
          serverUrl={serverUrl}
          data-lk-theme="default"
          style={{ height: 'auto' }}
        >
          <VoiceCollaborationUI
            userRole={userRole}
            currentRoom={{ name: 'Main Discussion' }}
            onLeave={handleLeaveRoom}
            networkStatus={networkStatus}
            audioOutputDevices={audioOutputDevices}
            selectedAudioOutputDeviceId={selectedAudioOutputDeviceId}
            onSelectAudioOutputDevice={setSelectedAudioOutputDeviceId}
          />
        </LiveKitRoom>
      ) : (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          {/* Compact Header */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-3">
            <div className="flex items-center gap-2 text-white">
              <Headphones className="w-4 h-4" />
              <span className="text-sm font-medium">Voice Rooms</span>
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-white/20 text-white border-0">
                {availableRooms.length}
              </Badge>
            </div>
          </div>

          <CardContent className="p-3">
            {uiError && (
              <Alert variant="destructive" className="mb-3 border-0 bg-red-50 p-2">
                <AlertDescription className="text-xs">{uiError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {isConnecting ? (
                <div className="text-center py-6">
                  <Activity className="h-5 w-5 animate-spin mx-auto text-blue-500" />
                </div>
              ) : availableRooms.length > 0 ? (
                availableRooms.map((room) => (
                  <div
                    key={room.id}
                    className={`
                      group relative overflow-hidden rounded-lg p-3 cursor-pointer
                      bg-gradient-to-r ${getRoomGradient(room.name)}
                      hover:shadow-lg transform hover:-translate-y-0.5
                      transition-all duration-200
                    `}
                    onClick={() => handleJoinRoom(room)}
                  >
                    <div className="relative z-10">
                      <div className="flex items-center justify-between text-white">
                        <div>
                          <div className="text-sm font-medium">{room.name}</div>
                          <div className="text-xs opacity-80">Max: {room.max_participants}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No rooms available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoiceCollaboration;
