
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MatchTimerProps {
  dbTimerValue?: number | null; // from match.current_timer_value
  timerStatus?: string | null; // from match.timer_status: 'stopped', 'running', 'paused'
  timerLastStartedAt?: string | null; // from match.timer_last_started_at (ISO string)
  timerPeriod?: string | null; // from match.timer_period
  timerAddedTime?: number | null; // from match.timer_added_time
  showControls?: boolean; // whether to show admin controls
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  dbTimerValue = 0, 
  timerStatus = 'stopped', 
  timerLastStartedAt,
  timerPeriod = 'first_half',
  timerAddedTime = 0,
  showControls = false
}) => {
  const [displayTime, setDisplayTime] = useState(dbTimerValue || 0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const safeDbTimerValue = dbTimerValue || 0;

    if (timerStatus === 'running' && timerLastStartedAt) {
      const startTime = new Date(timerLastStartedAt).getTime();
      
      const updateDisplayTime = () => {
        const elapsedSinceLastStart = (Date.now() - startTime) / 1000;
        setDisplayTime(safeDbTimerValue + elapsedSinceLastStart);
      };
      
      updateDisplayTime(); // Initial update
      intervalId = setInterval(updateDisplayTime, 1000); // Update every second

    } else {
      setDisplayTime(safeDbTimerValue); // For 'paused' or 'stopped'
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [dbTimerValue, timerStatus, timerLastStartedAt]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPeriodDisplay = () => {
    switch (timerPeriod) {
      case 'first_half': return 'First Half';
      case 'second_half': return 'Second Half';
      case 'extra_time': return 'Extra Time';
      case 'penalties': return 'Penalties';
      default: return 'Match';
    }
  };
  
  // Ensure displayTime is a number to avoid NaN display
  const safeDisplayTime = isNaN(displayTime) ? 0 : displayTime;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          <div className="text-3xl font-mono font-bold flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-md px-4 py-2 w-32">
            {formatTime(safeDisplayTime)}
          </div>
          <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <span>Status: </span>
            <Badge variant={
              timerStatus === 'running' ? 'default' :
              timerStatus === 'paused' ? 'secondary' :
              'outline'
            } className={
              timerStatus === 'running' ? 'bg-green-500' :
              timerStatus === 'paused' ? 'bg-yellow-500' :
              'bg-red-500'
            }>
              {timerStatus ? timerStatus.charAt(0).toUpperCase() + timerStatus.slice(1) : 'Unknown'}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
            <Badge variant="outline">{getPeriodDisplay()}</Badge>
            {timerAddedTime && timerAddedTime > 0 && (
              <Badge variant="secondary">
                +{Math.floor(timerAddedTime / 60)}min
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchTimer;
