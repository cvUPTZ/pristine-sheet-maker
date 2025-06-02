import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users, Crown, Shield, Bug } from 'lucide-react';
import { useVoiceCollaboration } from '@/hooks/useVoiceCollaboration';
import { useIsMobile } from '@/hooks/use-mobile';
import AudioTest from '@/components/AudioTest';

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
  
  const {
    isVoiceEnabled,
    isMuted,
    isConnecting,
    connectedTrackers,
    audioLevel,
    toggleMute,
    availableRooms,
    currentRoom,
    isRoomAdmin,
    joinVoiceRoom,
    leaveVoiceRoom,
    connectionQualities,
    retryAttempts,
    isRecovering,
    debugInfo
  } = useVoiceCollaboration({
    matchId,
    userId,
    onUserJoined: (userId) => console.log('User joined voice:', userId),
    onUserLeft: (userId) => console.log('User left voice:', userId)
  });

  const AudioLevelIndicator = ({ level }: { level: number }) => (
    <div className="flex items-center gap-1">
      <Volume2 className="h-3 w-3 text-gray-500" />
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1 h-3 rounded-sm transition-colors ${
              level > (i + 1) * 0.2 ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-mono ml-1">
        {(level * 100).toFixed(1)}%
      </span>
    </div>
  );

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'specialized': return <Shield className="h-3 w-3 text-blue-500" />;
      default: return null;
    }
  };

  const getRoomColorClass = (roomName: string) => {
    if (roomName.includes('Main')) return 'bg-blue-100 border-blue-300';
    if (roomName.includes('Coordinators')) return 'bg-purple-100 border-purple-300';
    if (roomName.includes('Team A')) return 'bg-green-100 border-green-300';
    if (roomName.includes('Team B')) return 'bg-orange-100 border-orange-300';
    if (roomName.includes('Events')) return 'bg-red-100 border-red-300';
    if (roomName.includes('Technical')) return 'bg-gray-100 border-gray-300';
    return 'bg-gray-100 border-gray-300';
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'fair': return '🟠';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Audio Test Component */}
      <AudioTest />
      
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Users className="h-4 w-4 text-blue-600" />
            Voice Collaboration
            {isVoiceEnabled && (
              <Badge variant="secondary" className="text-xs">
                Live • {currentRoom?.name}
              </Badge>
            )}
            {isRecovering && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                Recovering...
              </Badge>
            )}
            {retryAttempts > 0 && !isVoiceEnabled && (
              <Badge variant="outline" className="text-xs">
                Retry {retryAttempts}/3
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
          {/* Connection Status Banner */}
          {(isRecovering || retryAttempts > 0) && (
            <div className="p-2 rounded border bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-xs text-yellow-700">
                  {isRecovering ? 'Recovering connection...' : `Connection attempt ${retryAttempts}/3`}
                </span>
              </div>
            </div>
          )}

          {/* Current Room Status */}
          {isVoiceEnabled && currentRoom && (
            <div className={`p-2 rounded border ${getRoomColorClass(currentRoom.name)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{currentRoom.name}</div>
                  <div className="text-xs text-gray-600">
                    {connectedTrackers.length + 1}/{currentRoom.maxParticipants} participants
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isRoomAdmin && <Crown className="h-4 w-4 text-yellow-500" />}
                  <Button
                    onClick={toggleMute}
                    size="sm"
                    variant={isMuted ? "destructive" : "secondary"}
                    disabled={isRecovering}
                  >
                    {isMuted ? (
                      <MicOff className="h-3 w-3" />
                    ) : (
                      <Mic className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    onClick={leaveVoiceRoom}
                    size="sm"
                    variant="destructive"
                    disabled={isRecovering}
                  >
                    <PhoneOff className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Audio Level Indicator - Always show when enabled */}
          {isVoiceEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Your audio:</span>
              <AudioLevelIndicator level={audioLevel} />
              <span className="text-xs text-gray-500">
                ({isMuted ? 'Muted' : 'Unmuted'})
              </span>
              {isRecovering && (
                <span className="text-xs text-yellow-600">• Recovering</span>
              )}
            </div>
          )}

          {/* Available Rooms - Show when NOT in a voice room */}
          {!isVoiceEnabled && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">
                Available Voice Rooms
              </div>
              <div className="grid gap-2">
                {availableRooms.map((room) => (
                  <div
                    key={room.id}
                    className={`p-2 rounded border ${getRoomColorClass(room.name)} ${
                      room.currentParticipants >= room.maxParticipants ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-xs">{room.name}</div>
                        <div className="text-xs text-gray-600">
                          {room.currentParticipants}/{room.maxParticipants} • 
                          {room.isPrivate ? ' Private' : ' Open'}
                        </div>
                      </div>
                      <Button
                        onClick={() => joinVoiceRoom(room)}
                        disabled={isConnecting || room.currentParticipants >= room.maxParticipants || isRecovering}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        {isConnecting ? (retryAttempts > 0 ? `Retry ${retryAttempts}` : 'Connecting...') : 'Join'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Trackers with Connection Quality */}
          {isVoiceEnabled && connectedTrackers.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">
                Room Participants ({connectedTrackers.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {connectedTrackers.map((tracker) => {
                  const quality = connectionQualities.get(tracker.userId);
                  return (
                    <div
                      key={tracker.userId}
                      className="flex items-center justify-between p-2 rounded bg-white border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            tracker.isConnected ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {getRoleIcon(tracker.role)}
                        <span className="truncate max-w-[80px]">
                          {tracker.username || `Tracker ${tracker.userId.slice(-4)}`}
                        </span>
                        {quality && (
                          <span className={`text-xs ${getQualityColor(quality.quality)}`} title={`RTT: ${quality.rtt}ms`}>
                            {getQualityIcon(quality.quality)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {tracker.isMuted ? (
                          <MicOff className="h-3 w-3 text-red-500" />
                        ) : (
                          <Mic className="h-3 w-3 text-green-500" />
                        )}
                        {tracker.isSpeaking && (
                          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                        )}
                        {tracker.audioLevel && tracker.audioLevel > 0.1 && (
                          <AudioLevelIndicator level={tracker.audioLevel} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Connection Quality Summary */}
          {isVoiceEnabled && connectionQualities.size > 0 && (
            <div className="text-xs p-2 bg-gray-50 rounded border">
              <div className="font-medium mb-1">Connection Quality</div>
              <div className="flex flex-wrap gap-2">
                {Array.from(connectionQualities.entries()).map(([userId, quality]) => (
                  <span key={userId} className={`${getQualityColor(quality.quality)}`}>
                    {getQualityIcon(quality.quality)} {userId.slice(-4)} ({quality.rtt}ms)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!isVoiceEnabled && !isConnecting && (
            <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded border border-blue-200">
              🎤 <strong>Test your audio first, then join a voice room!</strong><br/>
              Use the Audio Test above to verify your microphone works before joining.
              {retryAttempts > 0 && (
                <>
                  <br/>⚠️ <strong>Connection issues detected.</strong> The system will automatically retry.
                </>
              )}
            </div>
          )}

          {/* Debug Information - Show last few entries only */}
          {debugInfo && debugInfo.length > 0 && (
            <details className="bg-gray-900 text-green-400 text-xs p-2 rounded font-mono">
              <summary className="cursor-pointer text-yellow-400 mb-1">
                <Bug className="h-3 w-3 inline mr-1" />
                Debug Log ({debugInfo.length} entries)
                {retryAttempts > 0 && (
                  <span className="text-orange-400 ml-2">• Retry {retryAttempts}/3</span>
                )}
              </summary>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {debugInfo.slice(-10).map((info, index) => (
                  <div key={index} className="break-all text-xs">{info}</div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCollaboration;
