import React, { useEffect, useRef, useState } from 'react';
import { useVoiceCollaborationContext } from '@/context/VoiceCollaborationContext'; // NEW
import { Participant, ConnectionState, LocalParticipant } from 'livekit-client';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VolumeX, Volume2, Shield, Users, Mic, PhoneOff, Wifi, WifiOff, Loader2, MicOff } from 'lucide-react';

interface EnhancedVoiceChatProps {
  matchId: string;
  userId: string;
  userRole: string;
  userName: string;
  voiceCollabCtx?: ReturnType<typeof useVoiceCollaborationContext>;
}

export const EnhancedVoiceChat: React.FC<EnhancedVoiceChatProps> = ({
  matchId, 
  userId, 
  userRole, 
  userName,
  voiceCollabCtx
}) => {
  // Consume the context. If a prop (from VoiceCollaborationWithTest), use it; else useContext (fallback).
  const ctx = voiceCollabCtx || useVoiceCollaborationContext();

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
  } = ctx;

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

  // Helper: check if participant metadata implies tracker role
  function isTrackerParticipant(participant: Participant): boolean {
    const { metadata, name } = participant;
    if (!metadata) return false;
    if (metadata === 'tracker') return true;
    try {
      const parsed = JSON.parse(metadata);
      if (parsed && typeof parsed === 'object' && parsed.role === 'tracker') {
        return true;
      }
    } catch {}
    if (name && name.toLowerCase().includes('tracker')) return true;
    return false;
  }

  const handleJoinRoom = async (roomId: string) => {
    await joinRoom(roomId, userId, userRole, userName);
  };

  // Ensure correct mute check for local and remote
  const isParticipantMuted = (participant: Participant | null): boolean => {
    if (!participant) {
      return true; // Default to muted if participant is null
    }
    if (participant.isLocal) {
      // Use new logic: some implementations use muted flag, but here isMicrophoneEnabled is best.
      return !(participant as LocalParticipant).isMicrophoneEnabled;
    }
    // For remote, treat as muted if no audio tracks or any publication is muted
    const audioTrackPublications = Array.from(participant.audioTrackPublications.values());
    return audioTrackPublications.length === 0 || audioTrackPublications.some(pub => pub.isMuted);
  };

  const isParticipantSpeaking = (participant: Participant): boolean => {
    const audioLevel = getAudioLevel(participant.identity);
    return audioLevel > 0.1 && !isParticipantMuted(participant);
  };

  const canModerate = userRole === 'admin' || userRole === 'coordinator';

  // Find all tracker participants (excluding self)
  const trackerParticipants = participants.filter(
    p => !p.isLocal && isTrackerParticipant(p)
  );

  // Fix: Mute self button works reliably
  const handleToggleMuteSelf = async () => {
    const result = await toggleMuteSelf();
    if (typeof result === "undefined") {
      toast.error("Failed to toggle mute.");
    }
    // else, the state will update on re-render
  };

  // Fix: Admin mute all only affects trackers
  const handleMuteAll = async () => {
    if (!canModerate) return;
    const newMuteState = !allMuted;
    setAllMuted(newMuteState);

    let errors = 0;
    for (const participant of participants) {
      if (!participant.isLocal && isTrackerParticipant(participant)) {
        const ok = await moderateMuteParticipant(participant.identity, newMuteState);
        if (!ok) errors++;
      }
    }
    if (errors) {
      toast.error(`Some participants could not be ${newMuteState ? 'muted' : 'unmuted'}`);
    } else {
      toast.success(newMuteState ? 'All trackers muted' : 'All trackers unmuted');
    }
  };

  const renderConnectionStatus = () => {
    if (isConnecting) return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Connecting...</Badge>;
    if (isConnected) return <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200"><Wifi className="mr-1 h-3 w-3" />Connected</Badge>;
    if (connectionState === ConnectionState.Disconnected) return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200"><WifiOff className="mr-1 h-3 w-3" />Disconnected</Badge>;
    return <Badge variant="outline"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Initializing...</Badge>;
  };

  if (!isConnected && !isConnecting) {
    return (
      <Card className="bg-white/60 backdrop-blur-lg border-slate-200/80 shadow-lg rounded-2xl transition-all">
        <CardHeader className="border-b border-slate-200/80 bg-slate-50/30">
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <Users className="h-6 w-6 text-blue-600" />
            Voice Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {isLoadingRooms && (
            <div className="flex items-center justify-center p-8 text-slate-500">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Loading voice rooms...
            </div>
          )}
          {!isLoadingRooms && availableRooms.length === 0 && (
            <div className="text-center py-8">
                <MicOff className="h-10 w-10 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 font-semibold">No voice rooms available</p>
                <p className="text-sm text-slate-500">There are no voice rooms for this match yet.</p>
            </div>
          )}
          {!isLoadingRooms && availableRooms.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-sm font-medium text-slate-500">Available Rooms</h3>
              {availableRooms.map(room => (
                <div key={room.id} className="flex items-center justify-between p-4 border border-slate-200/80 rounded-xl bg-white/50 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-800">{room.name}</p>
                    <p className="text-xs text-slate-500">Room ID: {room.id}</p>
                  </div>
                  <Button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={isConnecting}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Mic className="mr-2 h-4 w-4" />
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
    <Card className="bg-white/60 backdrop-blur-lg border-slate-200/80 shadow-lg rounded-2xl transition-all">
      <CardHeader className="border-b border-slate-200/80 bg-slate-50/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <Users className="h-6 w-6 text-blue-600" />
            Voice Room: <span className="text-blue-700">{currentRoomId}</span>
          </CardTitle>
          {renderConnectionStatus()}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Control buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={leaveRoom}
            variant="destructive"
            size="sm"
            className="shadow-md hover:shadow-lg"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Leave Room
          </Button>
          <Button
            onClick={handleToggleMuteSelf}
            variant="outline"
            size="sm"
            disabled={!localParticipant}
            className="shadow-sm hover:shadow-md"
          >
            {isParticipantMuted(localParticipant) ? (
              <>
                <VolumeX className="h-4 w-4 mr-2 text-red-500" />
                Unmute Self
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2 text-emerald-500" />
                Mute Self
              </>
            )}
          </Button>
          
          {canModerate && (
            <Button
              onClick={handleMuteAll}
              variant="outline"
              size="sm"
              className="text-orange-600 hover:text-orange-700 border-orange-300 hover:bg-orange-50 shadow-sm hover:shadow-md"
            >
              <Shield className="h-4 w-4 mr-2" />
              {allMuted ? 'Unmute All Trackers' : 'Mute All Trackers'}
            </Button>
          )}
        </div>

        {/* Participants list */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-700 text-base">Participants ({participants.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[28rem] overflow-y-auto p-1 -m-1">
            {participants.map(participant => {
              const isMuted = isParticipantMuted(participant);
              const isSpeaking = isParticipantSpeaking(participant);
              
              return (
                <div 
                  key={participant.identity} 
                  className={`
                    relative aspect-square flex flex-col items-center justify-center 
                    p-2 rounded-2xl text-center
                    bg-white/60 backdrop-blur-sm border border-slate-200/60
                    transition-all duration-300 transform hover:-translate-y-1
                    ${isSpeaking ? 'ring-2 ring-offset-2 ring-offset-slate-50/80 ring-emerald-500 shadow-lg' : 'shadow-md'}
                  `}
                >
                  <div className="relative mb-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 flex items-center justify-center text-blue-700 font-bold text-2xl shadow-inner">
                      {participant.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className={`absolute bottom-0 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white/80 ${isMuted ? 'bg-red-500' : 'bg-emerald-500'}`}>
                      {isMuted ? (
                        <MicOff size={14} className="text-white" />
                      ) : (
                        <Mic size={14} className="text-white"/>
                      )}
                    </div>
                  </div>

                  <span className="text-sm font-semibold text-slate-800 w-full truncate" title={participant.name || participant.identity}>
                    {participant.name || participant.identity}
                  </span>
                  {participant.isLocal && <Badge variant="secondary" className="mt-1 px-2 py-0.5 text-xs">You</Badge>}
                
                  {/* Moderation for non-local tracker participants only */}
                  {canModerate && !participant.isLocal && isTrackerParticipant(participant) && (
                    <Button
                      onClick={() => moderateMuteParticipant(participant.identity, !isMuted)}
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7 rounded-full bg-white/50 hover:bg-slate-200/50 text-slate-600"
                    >
                      {isMuted ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                      <span className="sr-only">{isMuted ? 'Unmute' : 'Mute'}</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
