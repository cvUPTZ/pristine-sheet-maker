
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users, Crown, Shield, Bug } from 'lucide-react';
import { useVoiceCollaboration } from '@/hooks/useVoiceCollaboration';
import { useIsMobile } from '@/hooks/use-mobile';

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

  return (
    <Card className={`${className} border-blue-200 bg-blue-50/50`}>
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Users className="h-4 w-4 text-blue-600" />
          Voice Collaboration
          {isVoiceEnabled && (
            <Badge variant="secondary" className="text-xs">
              Live • {currentRoom?.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
        {/* Debug Information */}
        {debugInfo && debugInfo.length > 0 && (
          <div className="bg-gray-900 text-green-400 text-xs p-2 rounded font-mono max-h-96 overflow-y-auto">
            <div className="flex items-center gap-1 mb-1">
              <Bug className="h-3 w-3" />
              <span className="text-yellow-400">Debug Log:</span>
            </div>
            {debugInfo.slice(-5).map((info, index) => (
              <div key={index} className="break-all">{info}</div>
            ))}
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
                >
                  <PhoneOff className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Available Rooms */}
        {!isVoiceEnabled && availableRooms.length > 0 && (
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
                      disabled={isConnecting || room.currentParticipants >= room.maxParticipants}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      {isConnecting ? 'Connecting...' : 'Join'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio Level Indicator */}
        {isVoiceEnabled && !isMuted && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Your voice:</span>
            <AudioLevelIndicator level={audioLevel} />
          </div>
        )}

        {/* Connected Trackers in Current Room */}
        {isVoiceEnabled && connectedTrackers.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">
              Room Participants ({connectedTrackers.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {connectedTrackers.map((tracker) => (
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
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isVoiceEnabled && (
          <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded border border-blue-200">
            📞 <strong>Voice Room Guide:</strong><br/>
            • <strong>Main Communication:</strong> General coordination (20 max)<br/>
            • <strong>Team Trackers:</strong> Team-specific tracking (25 each)<br/>
            • <strong>Event Specialists:</strong> Key events focus (15 max)<br/>
            • <strong>Technical Support:</strong> Technical issues (10 max)<br/>
            • <strong>Coordinators:</strong> Admin coordination (8 max, private)
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceCollaboration;
