
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users } from 'lucide-react';
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
    startVoiceCollaboration,
    stopVoiceCollaboration,
    toggleMute
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

  return (
    <Card className={`${className} border-blue-200 bg-blue-50/50`}>
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Users className="h-4 w-4 text-blue-600" />
          Voice Collaboration
          {isVoiceEnabled && (
            <Badge variant="secondary" className="text-xs">
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
        {/* Voice Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isVoiceEnabled ? (
            <Button
              onClick={startVoiceCollaboration}
              disabled={isConnecting}
              size={isMobile ? "sm" : "default"}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Phone className="h-4 w-4 mr-1" />
              {isConnecting ? 'Connecting...' : 'Join Voice'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleMute}
                size={isMobile ? "sm" : "default"}
                variant={isMuted ? "destructive" : "secondary"}
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4 mr-1" />
                ) : (
                  <Mic className="h-4 w-4 mr-1" />
                )}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
              
              <Button
                onClick={stopVoiceCollaboration}
                size={isMobile ? "sm" : "default"}
                variant="destructive"
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                Leave
              </Button>
            </div>
          )}
        </div>

        {/* Audio Level Indicator */}
        {isVoiceEnabled && !isMuted && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Your voice:</span>
            <AudioLevelIndicator level={audioLevel} />
          </div>
        )}

        {/* Connected Trackers */}
        {isVoiceEnabled && connectedTrackers.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">
              Connected Trackers ({connectedTrackers.length})
            </div>
            <div className="space-y-1">
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
                    <span className="truncate max-w-[100px]">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isVoiceEnabled && (
          <div className="text-xs text-gray-600 p-2 bg-blue-50 rounded border border-blue-200">
            📞 Join voice chat to communicate with other trackers in real-time during the match.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceCollaboration;
