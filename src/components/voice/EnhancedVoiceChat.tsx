
import React, { useEffect, useRef, useState } from 'react';
import { useNewVoiceCollaboration } from '@/hooks/useNewVoiceCollaboration';
import { Participant, ConnectionState, LocalParticipant } from 'livekit-client';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VolumeX, Volume2, Shield, Users } from 'lucide-react';

interface EnhancedVoiceChatProps {
  matchId: string;
  userId: string;
  userRole: string;
  userName: string;
}

export const EnhancedVoiceChat: React.FC<EnhancedVoiceChatProps> = ({ 
  matchId, 
  userId, 
  userRole, 
  userName 
}) => {
  const {
    availableRooms,
    currentRoomId,
    participants,
    localParticipant,
    connectionState,
    isConnecting,
    isConnected,
    isLoadingRooms,
    error,
    audioLevels,
    joinRoom,
    leaveRoom,
    toggleMuteSelf,
    fetchAvailableRooms,
    moderateMuteParticipant,
    getAudioLevel,
  } = useNewVoiceCollaboration();

  const [allMuted, setAllMuted] = useState(false);
  const lastShownErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      toast.error(error.message || 'An unknown error occurred.', {
        id: error.message,
      });
      lastShownErrorRef.current = error;
    }
    if (!error && lastShownErrorRef.current) {
        lastShownErrorRef.current = null;
    }
  }, [error]);

  useEffect(() => {
    if (matchId) {
      fetchAvailableRooms(matchId);
    }
  }, [fetchAvailableRooms, matchId]);

  const handleJoinRoom = async (roomId: string) => {
    await joinRoom(roomId, userId, userRole, userName);
  };

  const isParticipantMuted = (participant: Participant): boolean => {
    if (participant.isLocal && localParticipant) {
      const localP = localParticipant as LocalParticipant;
      return !localP.isMicrophoneEnabled;
    }
    const audioTrackPublications = Array.from(participant.audioTrackPublications.values());
    return audioTrackPublications.length === 0 || audioTrackPublications.some(pub => pub.isMuted);
  };

  const isParticipantSpeaking = (participant: Participant): boolean => {
    const audioLevel = getAudioLevel(participant.identity);
    return audioLevel > 0.1 && !isParticipantMuted(participant);
  };

  const canModerate = userRole === 'admin' || userRole === 'coordinator';

  const handleMuteAll = async () => {
    if (!canModerate) return;
    
    const newMuteState = !allMuted;
    setAllMuted(newMuteState);
    
    // Mute all participants except self
    for (const participant of participants) {
      if (!participant.isLocal) {
        await moderateMuteParticipant(participant.identity, newMuteState);
      }
    }
    
    toast.success(newMuteState ? 'All participants muted' : 'All participants unmuted');
  };

  const renderConnectionStatus = () => {
    if (isConnecting) return <Badge variant="secondary">Connecting...</Badge>;
    if (isConnected) return <Badge variant="default">Connected</Badge>;
    if (connectionState === ConnectionState.Disconnected) return <Badge variant="destructive">Disconnected</Badge>;
    return <Badge variant="outline">Initializing...</Badge>;
  };

  if (!isConnected && !isConnecting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Voice Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingRooms && <p>Loading voice rooms...</p>}
          {!isLoadingRooms && availableRooms.length === 0 && (
            <p className="text-muted-foreground">No voice rooms available for this match.</p>
          )}
          {!isLoadingRooms && availableRooms.length > 0 && (
            <div className="space-y-2">
              {availableRooms.map(room => (
                <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-sm text-muted-foreground">Room ID: {room.id}</p>
                  </div>
                  <Button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={isConnecting}
                    size="sm"
                  >
                    Join Room
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Voice Room: {currentRoomId}
          </CardTitle>
          {renderConnectionStatus()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={leaveRoom}
            variant="destructive"
            size="sm"
          >
            Leave Room
          </Button>
          <Button
            onClick={toggleMuteSelf}
            variant="outline"
            size="sm"
            disabled={!localParticipant}
          >
            {isParticipantMuted(localParticipant!) ? (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Unmute Self
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Mute Self
              </>
            )}
          </Button>
          
          {canModerate && (
            <Button
              onClick={handleMuteAll}
              variant="outline"
              size="sm"
              className="text-orange-600 hover:text-orange-700"
            >
              <Shield className="h-4 w-4 mr-2" />
              {allMuted ? 'Unmute All' : 'Mute All'}
            </Button>
          )}
        </div>

        {/* Participants list */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Participants ({participants.length})</h4>
          {participants.map(participant => {
            const isMuted = isParticipantMuted(participant);
            const isSpeaking = isParticipantSpeaking(participant);
            const audioLevel = getAudioLevel(participant.identity);
            
            return (
              <div 
                key={participant.identity} 
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {participant.name || participant.identity}
                      {participant.isLocal && ' (You)'}
                    </span>
                    {isMuted && <span className="text-xs text-muted-foreground">Muted</span>}
                    {isSpeaking && !isMuted && (
                      <span className="text-xs text-green-600 animate-pulse">Speaking</span>
                    )}
                  </div>
                  
                  {/* Audio level indicator */}
                  {!isMuted && (
                    <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-100 ${
                          isSpeaking ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.max(audioLevel * 100, 2)}%` }}
                      />
                    </div>
                  )}
                </div>

                {canModerate && !participant.isLocal && (
                  <Button
                    onClick={() => moderateMuteParticipant(participant.identity, !isMuted)}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
