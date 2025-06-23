import React, { useState, useRef, useEffect } from 'react';
import { YouTubePlayer, YouTubePlayerInstance, PlayerControlEvent } from './YouTubePlayer';
import VideoPlayerControls from './VideoPlayerControls';
import TrackerPianoInput, { PlayerForPianoInput } from '../TrackerPianoInput'; // Assuming this component exists and exports PlayerForPianoInput
import { EnhancedVoiceChat } from '../voice/EnhancedVoiceChat'; // Assuming this component exists
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client'; // For recording events
import { useToast } from '@/hooks/use-toast';

interface TrackerVideoInterfaceProps {
  initialVideoId: string;
  matchId: string; // Used for Supabase channel scoping for player control and voice chat room
  // We might need more specific video assignment ID if a match can have multiple videos
}

const TrackerVideoInterface: React.FC<TrackerVideoInterfaceProps> = ({ initialVideoId, matchId }) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState(initialVideoId);
  const [isAdminView, setIsAdminView] = useState(false); // Determine this based on userRole

  useEffect(() => {
    // Example: Set isAdminView based on user's role
    setIsAdminView(userRole === 'admin');
  }, [userRole]);

  useEffect(() => {
    setCurrentVideoId(initialVideoId);
  }, [initialVideoId]);

  const handlePlayerReady = (playerInstance: YouTubePlayerInstance) => {
    playerRef.current = playerInstance;
    console.log('Player is ready:', playerInstance);
  };

  // This function will be passed to VideoPlayerControls for admin to send events
  const sendAdminPlayerEvent = (event: Omit<PlayerControlEvent, 'timestamp'>) => {
    const channel = supabase.channel(`video-control-${matchId}`); // Ensure this matches YouTubePlayer's channel
    if (isAdminView && channel && playerRef.current) {
      const fullEvent: PlayerControlEvent = { ...event, timestamp: Date.now() };
      console.log('Admin sending player control event from TrackerVideoInterface:', fullEvent);
      channel.send({
        type: 'broadcast',
        event: 'player-control',
        payload: fullEvent,
      });

      // Also directly control admin's local player if needed (though YouTubePlayer handles its own state via key prop for LOAD_VIDEO)
      if (event.type === 'LOAD_VIDEO' && event.videoId) {
         // The YouTubePlayer component will reload due to its 'key' prop changing with currentVideoId
         setCurrentVideoId(event.videoId); // This will trigger re-render of YouTubePlayer
      }
    }
  };

  const handleRecordEventWithVideoTime = async (
    eventTypeKey: string,
    playerId?: number,
    teamContext?: 'home' | 'away',
    details?: Record<string, any>
  ): Promise<any | null> => {
    if (!playerRef.current) {
      toast({ title: "Player Error", description: "YouTube player is not available.", variant: "destructive" });
      return null;
    }
    if (!user) {
        toast({ title: "Auth Error", description: "User not authenticated.", variant: "destructive" });
        return null;
    }

    const videoTimestamp = playerRef.current.getCurrentTime(); // Get current time in seconds

    const eventToInsert = {
      match_id: matchId,
      event_type: eventTypeKey,
      player_id: playerId,
      team_context: teamContext,
      details: {
        ...details,
        video_timestamp: videoTimestamp,
        recorded_by_video_tracker: true
      },
      created_by: user.id,
      // Potentially add x, y coordinates if relevant and if piano input provides them
    };

    console.log("Recording event with video time:", eventToInsert);

    try {
      const { data, error } = await supabase
        .from('match_events') // Assuming 'match_events' is your table for all events
        .insert(eventToInsert)
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Event Recorded", description: `${eventTypeKey} at ${videoTimestamp.toFixed(2)}s (video time).` });
      return data;
    } catch (error: any) {
      console.error('Error recording video event:', error);
      toast({ title: "Recording Error", description: `Failed to record event: ${error.message}`, variant: "destructive" });
      return null;
    }
  };


  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 h-full max-h-screen overflow-hidden">
      {/* Video Player and Controls Section */}
      <div className="flex-grow lg:w-2/3 flex flex-col gap-2">
        <div className="aspect-video bg-black rounded-lg shadow-lg overflow-hidden">
          {currentVideoId && matchId ? (
            <YouTubePlayer
              videoId={currentVideoId}
              matchId={matchId}
              isAdmin={isAdminView}
              onPlayerReady={handlePlayerReady}
              // onStateChange can be added if needed for specific logic here
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Select a video to start.
            </div>
          )}
        </div>
        {isAdminView && playerRef.current && (
          <VideoPlayerControls
            player={playerRef.current}
            initialVideoId={currentVideoId}
            onSendEvent={sendAdminPlayerEvent}
          />
        )}
      </div>

      {/* Piano Input and Voice Chat Section */}
      <div className="lg:w-1/3 flex flex-col gap-4 overflow-y-auto">
        {matchId && user && (
          <TrackerPianoInput
            matchId={matchId}
            onRecordEvent={handleRecordEventWithVideoTime}
          />
        )}

        {matchId && user && userRole && (
          <EnhancedVoiceChat
            matchId={`video-${matchId}`} // Or just matchId if rooms are shared
            userId={user.id}
            userRole={userRole}
            userName={user.email || user.id} // Or a display name if available
          />
        )}
      </div>
    </div>
  );
};

export default TrackerVideoInterface;
