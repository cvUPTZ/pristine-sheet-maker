
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoPlayerProps {
  videoInfo: {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
  };
  onEventRecord: (eventType: string, playerId?: number, teamContext?: 'home' | 'away', details?: any) => Promise<any>;
  matchId: string;
  isMuted?: boolean;
}

const IntegratedVideoPlayer: React.FC<VideoPlayerProps> = ({
  videoInfo,
  onEventRecord,
  matchId,
  isMuted = false
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(isMuted ? 0 : 50);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recentEvents, setRecentEvents] = useState<Array<{type: string, time: number, timestamp: number}>>([]);
  const { toast } = useToast();

  // Quick event buttons for common football events
  const quickEvents = [
    { type: 'goal', label: '⚽ Goal', color: 'bg-green-500' },
    { type: 'shot_on_target', label: '🎯 Shot', color: 'bg-blue-500' },
    { type: 'foul_committed', label: '⚠️ Foul', color: 'bg-yellow-500' },
    { type: 'yellow_card', label: '🟨 Card', color: 'bg-yellow-400' },
    { type: 'corner_kick', label: '📐 Corner', color: 'bg-purple-500' },
    { type: 'substitution', label: '🔄 Sub', color: 'bg-indigo-500' },
  ];

  // YouTube Player API setup
  useEffect(() => {
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);

      window.onYouTubeIframeAPIReady = () => {
        initializePlayer();
      };
    } else {
      initializePlayer();
    }

    return () => {
      if (window.player) {
        window.player.destroy();
      }
    };
  }, [videoInfo.id]);

  const initializePlayer = useCallback(() => {
    if (!window.YT || !videoInfo.id) return;

    window.player = new window.YT.Player('youtube-player', {
      videoId: videoInfo.id,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event: any) => {
          setDuration(event.target.getDuration());
          if (isMuted) {
            event.target.mute();
          }
        },
        onStateChange: (event: any) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
        },
      },
    });

    // Update current time periodically
    const interval = setInterval(() => {
      if (window.player && window.player.getCurrentTime) {
        setCurrentTime(window.player.getCurrentTime());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [videoInfo.id, isMuted]);

  // Player controls
  const togglePlayPause = () => {
    if (!window.player) return;
    
    if (isPlaying) {
      window.player.pauseVideo();
    } else {
      window.player.playVideo();
    }
  };

  const skipSeconds = (seconds: number) => {
    if (!window.player) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    window.player.seekTo(newTime);
  };

  const toggleMute = () => {
    if (!window.player) return;
    
    if (window.player.isMuted()) {
      window.player.unMute();
      window.player.setVolume(volume);
    } else {
      window.player.mute();
    }
  };

  const toggleFullscreen = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (!document.fullscreenElement) {
      iframe.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Quick event recording
  const handleQuickEvent = async (eventType: string) => {
    const eventTime = Math.floor(currentTime);
    const result = await onEventRecord(eventType, undefined, undefined, {
      video_timestamp: eventTime,
      quick_recorded: true,
    });

    if (result) {
      setRecentEvents(prev => [
        { type: eventType, time: eventTime, timestamp: Date.now() },
        ...prev.slice(0, 4) // Keep only last 5 events
      ]);

      toast({
        title: 'Event Recorded',
        description: `${eventType} at ${formatTime(eventTime)}`,
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <div
          id="youtube-player"
          ref={iframeRef}
          className="w-full h-full"
        />
        
        {/* Overlay Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/70 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={togglePlayPause}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => skipSeconds(-10)}
              className="text-white hover:bg-white/20"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => skipSeconds(10)}
              className="text-white hover:bg-white/20"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-white text-sm">
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Video Info */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">{videoInfo.title}</h3>
              <p className="text-xs text-gray-500">Match: {matchId}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {isPlaying ? 'Playing' : 'Paused'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Event Buttons */}
      <Card>
        <CardContent className="p-3">
          <h4 className="font-medium text-sm mb-3">Quick Events</h4>
          <div className="grid grid-cols-2 gap-2">
            {quickEvents.map((event) => (
              <Button
                key={event.type}
                size="sm"
                variant="outline"
                onClick={() => handleQuickEvent(event.type)}
                className="justify-start text-xs"
              >
                {event.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h4 className="font-medium text-sm mb-3">Recent Events</h4>
            <div className="space-y-2">
              {recentEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{event.type}</span>
                  <span className="text-gray-500">{formatTime(event.time)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Extend window interface for YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    player: any;
  }
}

export default IntegratedVideoPlayer;
