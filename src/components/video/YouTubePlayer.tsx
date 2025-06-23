import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer as TYPlayer } from 'react-youtube';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface YouTubePlayerComponentProps {
  videoId: string;
  matchId: string; // Used for Supabase channel scoping
  isAdmin: boolean;
  onPlayerReady?: (player: TYPlayer) => void;
  onStateChange?: (event: any) => void; // Replace 'any' with proper event type from react-youtube if needed
}

type PlayerState = -1 | 0 | 1 | 2 | 3 | 5; // Unstarted, Ended, Playing, Paused, Buffering, Video Cued

interface PlayerControlEvent {
  type: 'PLAY' | 'PAUSE' | 'SEEK' | 'LOAD_VIDEO';
  videoId?: string; // For LOAD_VIDEO
  currentTime?: number; // For PLAY and SEEK
  timestamp: number; // To order events and prevent stale updates
}

const YouTubePlayerComponent: React.FC<YouTubePlayerComponentProps> = ({
  videoId,
  matchId,
  isAdmin,
  onPlayerReady,
  onStateChange,
}) => {
  const playerRef = useRef<TYPlayer | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState(videoId);
  const lastEventTimestampRef = useRef<number>(0);

  const broadcastChannelId = `video-control-${matchId}`;

  useEffect(() => {
    setCurrentVideoId(videoId); // Update currentVideoId if prop changes
  }, [videoId]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase.channel(broadcastChannelId, {
      config: {
        broadcast: {
          ack: true,
        },
      },
    });

    channel.on('broadcast', { event: 'player-control' }, ({ payload }: { payload: PlayerControlEvent }) => {
      if (isAdmin) return; // Admin doesn't react to its own broadcasts echoed back or other admin actions

      if (payload.timestamp <= lastEventTimestampRef.current) {
        console.log('Skipping stale event:', payload);
        return;
      }
      lastEventTimestampRef.current = payload.timestamp;

      const player = playerRef.current;
      if (!player) return;

      console.log('Received player control event:', payload);

      switch (payload.type) {
        case 'LOAD_VIDEO':
          if (payload.videoId && player.loadVideoById && payload.videoId !== currentVideoId) {
            console.log(`Tracker loading video: ${payload.videoId}`);
            setCurrentVideoId(payload.videoId); // Update state to reflect new video
            // player.loadVideoById(payload.videoId); // This will be handled by currentVideoId change if key is set on YouTube component
          }
          break;
        case 'PLAY':
          if (typeof payload.currentTime === 'number') {
            player.seekTo(payload.currentTime, true);
          }
          player.playVideo();
          break;
        case 'PAUSE':
          player.pauseVideo();
          break;
        case 'SEEK':
          if (typeof payload.currentTime === 'number') {
            player.seekTo(payload.currentTime, true);
          }
          break;
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to ${broadcastChannelId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Failed to subscribe to ${broadcastChannelId}: Channel error`);
      } else if (status === 'TIMED_OUT') {
        console.error(`Failed to subscribe to ${broadcastChannelId}: Timed out`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).then(() => {
          console.log(`Unsubscribed from ${broadcastChannelId}`);
        });
        channelRef.current = null;
      }
    };
  }, [matchId, isAdmin, currentVideoId]); // currentVideoId added to re-evaluate if needed on video change

  const sendPlayerControlEvent = (event: Omit<PlayerControlEvent, 'timestamp'>) => {
    if (!isAdmin || !channelRef.current || channelRef.current.state !== 'joined') {
      return;
    }
    const fullEvent: PlayerControlEvent = { ...event, timestamp: Date.now() };
    console.log('Admin sending player control event:', fullEvent);
    channelRef.current.send({
      type: 'broadcast',
      event: 'player-control',
      payload: fullEvent,
    });
  };

  const handlePlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    if (onPlayerReady) {
      onPlayerReady(event.target);
    }
  };

  const handlePlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (onStateChange) {
      onStateChange(event);
    }

    if (!isAdmin || !playerRef.current) return;

    const player = playerRef.current;
    const playerState = event.data as PlayerState;

    // More precise handling to avoid event loops from seekTo->playing
    // We only send PLAY/PAUSE when user explicitly clicks, not from programmatic changes
    // SEEK is handled by VideoPlayerControls component.
    // LOAD_VIDEO is handled by VideoPlayerControls component changing the videoId prop.

    // Example: if admin manually plays video
    if (playerState === 1) { // PLAYING
        // This might be triggered programmatically. Consider if this is desired.
        // sendPlayerControlEvent({ type: 'PLAY', currentTime: player.getCurrentTime() });
    }
    // Example: if admin manually pauses video
    else if (playerState === 2) { // PAUSED
        // sendPlayerControlEvent({ type: 'PAUSE' });
    }
  };

  // Effect to handle video changes by admin
  useEffect(() => {
    if (isAdmin && videoId !== currentVideoId) {
      // If admin changes the videoId prop
      console.log(`Admin changed video to: ${videoId}. Broadcasting...`);
      setCurrentVideoId(videoId);
      sendPlayerControlEvent({ type: 'LOAD_VIDEO', videoId: videoId });
      if (playerRef.current) {
         // playerRef.current.loadVideoById(videoId); // Let key prop handle re-render
      }
    }
  }, [videoId, isAdmin, currentVideoId]);


  const opts: YouTubeProps['opts'] = {
    height: '390',
    width: '640',
    playerVars: {
      autoplay: 0, // Admin controls autoplay
      controls: isAdmin ? 1 : 0, // Show controls only for admin
      rel: 0, // No related videos at the end
      modestbranding: 1,
      disablekb: isAdmin ? 0 : 1, // Disable keyboard for trackers
    },
  };

  return (
    <YouTube
      key={currentVideoId} // Important: Re-mounts component when videoId changes, ensuring new video loads
      videoId={currentVideoId}
      opts={opts}
      onReady={handlePlayerReady}
      onStateChange={handlePlayerStateChange}
      onError={(e) => console.error('YouTube Player Error:', e)}
      className={isAdmin ? "youtube-admin-player" : "youtube-tracker-player"}
    />
  );
};

export { YouTubePlayerComponent as YouTubePlayer, type TYPlayer as YouTubePlayerInstance, type PlayerControlEvent };
export default YouTubePlayerComponent;
