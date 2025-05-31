
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
// Icons are removed as controls are removed from this component
// import { TimerReset, Play, Pause, Plus, Minus } from 'lucide-react'; 
// useToast is removed as this component will no longer show toasts for local actions
// import { useToast } from '@/components/ui/use-toast';

interface MatchTimerProps {
  dbTimerValue?: number | null; // from match.current_timer_value
  timerStatus?: string | null; // from match.timer_status: 'stopped', 'running', 'paused'
  timerLastStartedAt?: string | null; // from match.timer_last_started_at (ISO string)
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  dbTimerValue = 0, 
  timerStatus = 'stopped', 
  timerLastStartedAt 
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
  
  // Ensure displayTime is a number to avoid NaN display
  const safeDisplayTime = isNaN(displayTime) ? 0 : displayTime;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          <div className="text-3xl font-mono font-bold flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-md px-4 py-2 w-32">
            {formatTime(safeDisplayTime)}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Status: <span className={`font-semibold ${
              timerStatus === 'running' ? 'text-green-500' :
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
