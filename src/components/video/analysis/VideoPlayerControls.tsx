// src/components/video/analysis/VideoPlayerControls.tsx
import React, { useState, useEffect } from 'react'; // Corrected import
import { Button } from '@/components/ui/button'; 
import { SkipBack, SkipForward } from 'lucide-react';

const ASSUMED_FPS = 30;

interface VideoPlayerControlsProps {
  videoPlayerRef: React.RefObject<HTMLVideoElement>;
  isPlayingPlaylist: boolean; 
}

export const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = ({ videoPlayerRef, isPlayingPlaylist }) => {
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1);

  const handleFrameStep = (direction: 'backward' | 'forward') => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
      const frameDuration = 1 / ASSUMED_FPS;
      let newTime = videoPlayerRef.current.currentTime + (direction === 'forward' ? frameDuration : -frameDuration);
      newTime = Math.max(0, Math.min(newTime, videoPlayerRef.current.duration || Infinity));
      videoPlayerRef.current.currentTime = newTime;
    }
  };

  const handlePlaybackRateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (videoPlayerRef.current) {
      const newRate = parseFloat(event.target.value);
      videoPlayerRef.current.playbackRate = newRate;
      setCurrentPlaybackRate(newRate);
    }
  };

  useEffect(() => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.playbackRate = currentPlaybackRate;
    }
  }, [videoPlayerRef, currentPlaybackRate]);


  return (
    <div className="my-3 p-3 border rounded-md space-y-2">
      <h4 className="font-medium text-sm">Playback Controls</h4>
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" onClick={() => handleFrameStep('backward')} title="Previous Frame" disabled={isPlayingPlaylist}>
          <SkipBack className="h-4 w-4 mr-1" /> Prev Frame
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleFrameStep('forward')} title="Next Frame" disabled={isPlayingPlaylist}>
          <SkipForward className="h-4 w-4 mr-1" /> Next Frame
        </Button>
        <div className="flex items-center gap-2">
          <label htmlFor="playbackRate" className="text-sm">Speed:</label>
          <select
            id="playbackRate"
            value={currentPlaybackRate}
            onChange={handlePlaybackRateChange}
            disabled={isPlayingPlaylist}
            className="p-1 border rounded-md text-sm bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500"
          >
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
              <option key={rate} value={rate}>{rate}x</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
