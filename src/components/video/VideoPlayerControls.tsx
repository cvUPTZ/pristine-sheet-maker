import React, { useState, useEffect, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Rewind, FastForward, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { YouTubePlayerInstance, PlayerControlEvent } from './YouTubePlayer'; // Assuming types are exported

interface VideoPlayerControlsProps {
  player: YouTubePlayerInstance | null;
  initialVideoId?: string;
  onSendEvent: (event: Omit<PlayerControlEvent, 'timestamp'>) => void;
  isLoading?: boolean; // To show loading state, e.g., when changing video
}

const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = ({ player, initialVideoId, onSendEvent, isLoading }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [videoIdInput, setVideoIdInput] = useState(initialVideoId || '');

  useEffect(() => {
    if (initialVideoId) {
      setVideoIdInput(initialVideoId);
    }
  }, [initialVideoId]);

  useEffect(() => {
    if (!player) return;

    const updatePlayerState = () => {
      setIsPlaying(player.getPlayerState() === 1);
      setCurrentTime(player.getCurrentTime());
      setDuration(player.getDuration());
      setVolume(player.getVolume());
      setIsMuted(player.isMuted());
    };

    updatePlayerState(); // Initial state

    const interval = setInterval(updatePlayerState, 500); // Poll for updates

    // Listen to player events for more responsive UI (optional, as interval handles it too)
    // player.addEventListener('onStateChange', updatePlayerState);
    // player.addEventListener('onVolumeChange', updatePlayerState); // This specific event might not exist, check react-youtube docs

    return () => {
      clearInterval(interval);
      // player.removeEventListener('onStateChange', updatePlayerState);
      // player.removeEventListener('onVolumeChange', updatePlayerState);
    };
  }, [player]);

  const handlePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
      onSendEvent({ type: 'PAUSE' });
    } else {
      player.playVideo();
      onSendEvent({ type: 'PLAY', currentTime: player.getCurrentTime() });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!player) return;
    const newTime = value[0];
    player.seekTo(newTime, true);
    onSendEvent({ type: 'SEEK', currentTime: newTime });
    setCurrentTime(newTime); // Optimistic update
  };

  const handleFastForward = () => {
    if (!player) return;
    const newTime = Math.min(duration, currentTime + 10);
    player.seekTo(newTime, true);
    onSendEvent({ type: 'SEEK', currentTime: newTime });
  };

  const handleRewind = () => {
    if (!player) return;
    const newTime = Math.max(0, currentTime - 10);
    player.seekTo(newTime, true);
    onSendEvent({ type: 'SEEK', currentTime: newTime });
  };

  const handleVolumeChange = (value: number[]) => {
    if (!player) return;
    const newVolume = value[0];
    player.setVolume(newVolume);
    setVolume(newVolume);
    if (isMuted && newVolume > 0) {
      player.unMute();
      setIsMuted(false);
    } else if (!isMuted && newVolume === 0) {
      player.mute();
      setIsMuted(true);
    }
  };

  const handleMuteToggle = () => {
    if (!player) return;
    if (isMuted) {
      player.unMute();
      setVolume(player.getVolume()); // Reflect actual volume if unmuted
    } else {
      player.mute();
    }
    setIsMuted(!isMuted);
  };

  const handleChangeVideo = () => {
    if (!player || !videoIdInput) return;
    const newVideoId = videoIdInput.trim();
    // Basic validation, can be improved with regex for YouTube IDs
    if (newVideoId.length >= 11) {
      onSendEvent({ type: 'LOAD_VIDEO', videoId: newVideoId });
      // The YouTubePlayer component itself will call player.loadVideoById when its videoId prop changes
    } else {
      alert("Invalid YouTube Video ID or URL format.");
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  if (!player && !isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Player not available or loading...</div>;
  }
   if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center space-y-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading video...</p>
      </div>
    );
  }


  return (
    <div className="p-4 space-y-4 bg-card text-card-foreground rounded-lg shadow">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Enter YouTube Video ID or URL"
          value={videoIdInput}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setVideoIdInput(e.target.value)}
          className="flex-grow"
        />
        <Button onClick={handleChangeVideo} disabled={isLoading || !videoIdInput.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Video"}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleRewind} title="Rewind 10s">
          <Rewind />
        </Button>
        <Button variant="ghost" size="icon" onClick={handlePlayPause} title={isPlaying ? "Pause" : "Play"} className="w-12 h-12">
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleFastForward} title="Fast-Forward 10s">
          <FastForward />
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Slider
          min={0}
          max={duration || 0}
          step={1}
          value={[currentTime]}
          onValueChange={handleSeek}
          disabled={!player || duration === 0}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleMuteToggle} title={isMuted ? "Unmute" : "Mute"}>
          {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
        </Button>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[isMuted ? 0 : volume]}
          onValueChange={handleVolumeChange}
          disabled={!player}
          className="w-32"
        />
      </div>
    </div>
  );
};

export default VideoPlayerControls;
