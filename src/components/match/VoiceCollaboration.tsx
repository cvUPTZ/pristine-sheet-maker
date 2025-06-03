
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
      <Volume2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-gray-500`} />
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`${isMobile ? 'w-0.5 h-2' : 'w-1 h-3'} rounded-sm transition-colors ${
              level > (i + 1) * 0.2 ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-mono ml-1`}>
        {(level * 100).toFixed(1)}%
      </span>
    </div>
  );

  const getRoleIcon = (role?: string) => {
    const iconSize = isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3';
    switch (role) {
      case 'admin': return <Crown className={`${iconSize} text-yellow-500`} />;
      case 'specialized': return <Shield className={`${iconSize} text-blue-500`} />;
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
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {/* Audio Test Component */}
      <AudioTest />
      
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-sm sm:text-base'}`}>
            <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />
            Voice Collaboration
            {isVoiceEnabled && (
              <Badge variant="secondary" className={`${isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'}`}>
                Live • {isMobile ? currentRoom?.name.split(' ')[0] : currentRoom?.name}
              </Badge>
            )}
            {isRecovering && (
              <Badge variant="destructive" className={`${isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'} animate-pulse`}>
                Recovering...
              </Badge>
            )}
            {retryAttempts > 0 && !isVoiceEnabled && (
              <Badge variant="outline" className={`${isMobile ? 'text-[10px] px-1 py-0.5' : 'text-xs'}`}>
                Retry {retryAttempts}/3
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} pt-0 space-y-2 sm:space-y-3`}>
          {/* Audio Playback Status */}
          {isVoiceEnabled && connectedTrackers.length > 0 && (
            <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded border bg-green-50 border-green-200`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-green-700`}>
                  🔊 Audio playback active for {connectedTrackers.length} participant(s)
                </span>
              </div>
              {!isMobile && (
                <div className="text-xs text-green-600 mt-1">
                  If you can't hear others, click anywhere to enable audio playback
                </div>
              )}
            </div>
          )}

          {/* Connection Status Banner */}
          {(isRecovering || retryAttempts > 0) && (
            <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded border bg-yellow-50 border-yellow-200`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-700`}>
                  {isRecovering ? 'Recovering connection...' : `Connection attempt ${retryAttempts}/3`}
                </span>
              </div>
            </div>
          )}

          {/* Current Room Status */}
          {isVoiceEnabled && currentRoom && (
            <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded border ${getRoomColorClass(currentRoom.name)}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'gap-1' : 'gap-2'}`}>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${isMobile ? 'text-xs truncate' : 'text-sm'}`}>
                    {isMobile ? currentRoom.name.split(' ')[0] : currentRoom.name}
                  </div>
                  <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>
                    {connectedTrackers.length + 1}/{currentRoom.maxParticipants} {isMobile ? '' : 'participants'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isRoomAdmin && <Crown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-yellow-500`} />}
                  <Button
                    onClick={toggleMute}
                    size={isMobile ? "sm" : "sm"}
                    variant={isMuted ? "destructive" : "secondary"}
                    disabled={isRecovering}
                    className={isMobile ? 'h-6 w-6 p-0' : ''}
                  >
                    {isMuted ? (
                      <MicOff className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                    ) : (
                      <Mic className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                    )}
                  </Button>
                  <Button
                    onClick={leaveVoiceRoom}
                    size={isMobile ? "sm" : "sm"}
                    variant="destructive"
                    disabled={isRecovering}
                    className={isMobile ? 'h-6 w-6 p-0' : ''}
                  >
                    <PhoneOff className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Audio Level Indicator */}
          {isVoiceEnabled && (
            <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>
                {isMobile ? 'Audio:' : 'Your audio:'}
              </span>
              <AudioLevelIndicator level={audioLevel} />
              {isRecovering && (
                <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-600`}>• Recovering</span>
              )}
            </div>
          )}

          {/* Available Rooms */}
          {!isVoiceEnabled && (
            <div className="space-y-2">
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-700`}>
                {isMobile ? 'Voice Rooms' : 'Available Voice Rooms'}
              </div>
              <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {availableRooms.map((room) => (
                  <div
                    key={room.id}
                    className={`${isMobile ? 'p-1.5' : 'p-2'} rounded border ${getRoomColorClass(room.name)} ${
                      room.currentParticipants >= room.maxParticipants ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${isMobile ? 'text-[10px] truncate' : 'text-xs'}`}>
                          {isMobile ? room.name.split(' ')[0] : room.name}
                        </div>
                        <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>
                          {room.currentParticipants}/{room.maxParticipants} • 
                          {room.isPrivate ? ' Private' : ' Open'}
                        </div>
                      </div>
                      <Button
                        onClick={() => joinVoiceRoom(room)}
                        disabled={isConnecting || room.currentParticipants >= room.maxParticipants || isRecovering}
                        size={isMobile ? "sm" : "sm"}
                        className={`bg-green-600 hover:bg-green-700 text-white ${isMobile ? 'h-6 px-2 text-[10px]' : ''}`}
                      >
                        <Phone className={`${isMobile ? 'h-2 w-2 mr-0.5' : 'h-3 w-3 mr-1'}`} />
                        {isConnecting ? (retryAttempts > 0 ? `Retry ${retryAttempts}` : 'Connecting...') : 'Join'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Trackers */}
          {isVoiceEnabled && connectedTrackers.length > 0 && (
            <div className="space-y-2">
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-700`}>
                {isMobile ? `Participants (${connectedTrackers.length})` : `Room Participants (${connectedTrackers.length})`}
              </div>
              <div className={`space-y-1 ${isMobile ? 'max-h-24' : 'max-h-32'} overflow-y-auto`}>
                {connectedTrackers.map((tracker) => {
                  const quality = connectionQualities.get(tracker.userId);
                  return (
                    <div
                      key={tracker.userId}
                      className={`flex items-center justify-between ${isMobile ? 'p-1.5' : 'p-2'} rounded bg-white border ${isMobile ? 'text-[10px]' : 'text-xs'}`}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            tracker.isConnected ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {getRoleIcon(tracker.role)}
                        <span className={`truncate ${isMobile ? 'max-w-[60px]' : 'max-w-[80px]'}`}>
                          {tracker.username || `Tracker ${tracker.userId.slice(-4)}`}
                        </span>
                        {quality && (
                          <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} ${getQualityColor(quality.quality)}`} title={`RTT: ${quality.rtt}ms`}>
                            {getQualityIcon(quality.quality)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {tracker.isMuted ? (
                          <MicOff className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-red-500`} />
                        ) : (
                          <Mic className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-green-500`} />
                        )}
                        {tracker.isSpeaking && (
                          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Connection Quality Summary */}
          {isVoiceEnabled && connectionQualities.size > 0 && !isMobile && (
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
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600 ${isMobile ? 'p-1.5' : 'p-2'} bg-blue-50 rounded border border-blue-200`}>
              🎤 <strong>{isMobile ? 'Test audio, then join!' : 'Test your audio first, then join a voice room!'}</strong>
              {!isMobile && (
                <>
                  <br/>Use the Audio Test above to verify your microphone works before joining.
                </>
              )}
              {retryAttempts > 0 && (
                <>
                  <br/>⚠️ <strong>Connection issues detected.</strong> {isMobile ? 'Auto-retry enabled.' : 'The system will automatically retry.'}
                </>
              )}
            </div>
          )}

          {/* Debug Information */}
          {debugInfo && debugInfo.length > 0 && !isMobile && (
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
