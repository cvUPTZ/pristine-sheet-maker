import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MatchTimerProps {
  dbTimerValue?: number | null; 
  timerStatus?: string | null; 
  timerLastStartedAt?: string | null; 
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  dbTimerValue = 0, 
  timerStatus = 'stopped', 
  timerLastStartedAt 
}) => {
  const [displayTime, setDisplayTime] = useState(dbTimerValue || 0);

  // Log initial props
  useEffect(() => {
    console.log('[MatchTimer] Initial Props:', { dbTimerValue, timerStatus, timerLastStartedAt });
  }, []); // Run only once on mount to log initial props

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const safeDbTimerValue = Number(dbTimerValue) || 0; // Ensure it's a number

    console.log('[MatchTimer] Effect Triggered. Status:', timerStatus, 'DB Value:', safeDbTimerValue, 'Last Started At:', timerLastStartedAt);

    if (timerStatus === 'running' && timerLastStartedAt) {
      const startTime = new Date(timerLastStartedAt).getTime();
      if (isNaN(startTime)) {
        console.error('[MatchTimer] Invalid timerLastStartedAt date:', timerLastStartedAt);
        setDisplayTime(safeDbTimerValue); // Fallback to dbTimerValue if date is invalid
        return;
      }
      
      console.log(`[MatchTimer] Status is 'running'. StartTime (ms from epoch): ${startTime}. Current DB Value: ${safeDbTimerValue}`);
      
      const updateDisplayTime = () => {
        const now = Date.now();
        const elapsedSinceLastStart = (now - startTime) / 1000;
        const newDisplayTime = safeDbTimerValue + elapsedSinceLastStart;
        // console.log(`[MatchTimer] Tick. Now: ${now}, Elapsed: ${elapsedSinceLastStart.toFixed(2)}s, New Display: ${newDisplayTime.toFixed(2)}s`);
        setDisplayTime(newDisplayTime);
      };
      
      updateDisplayTime(); // Initial update
      intervalId = setInterval(updateDisplayTime, 1000); // Update every second

    } else {
      console.log(`[MatchTimer] Status is '${timerStatus}'. Setting display time to DB value: ${safeDbTimerValue}`);
      setDisplayTime(safeDbTimerValue); // For 'paused' or 'stopped'
    }

    return () => {
      if (intervalId) {
        // console.log('[MatchTimer] Clearing interval.');
        clearInterval(intervalId);
      }
    };
  }, [dbTimerValue, timerStatus, timerLastStartedAt]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const safeDisplayTime = isNaN(displayTime) || displayTime < 0 ? 0 : displayTime;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          <div className="text-3xl font-mono font-bold flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-md px-4 py-2 w-36"> {/* Increased width slightly */}
            {formatTime(safeDisplayTime)}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Status: <span className={`font-semibold ${
              timerStatus === 'running' ? 'text-green-500 animate-pulse' : // Added pulse for running
              timerStatus === 'paused' ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {timerStatus ? timerStatus.charAt(0).toUpperCase() + timerStatus.slice(1) : 'Unknown'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchTimer;
