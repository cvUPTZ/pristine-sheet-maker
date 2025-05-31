
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimerReset, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MatchTimerProps {
  matchId?: string;
  dbTimerValue?: number | null; // from match.current_timer_value
  timerStatus?: string | null; // from match.timer_status: 'stopped', 'running', 'paused'
  timerLastStartedAt?: string | null; // from match.timer_last_started_at (ISO string)
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  matchId,
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

  const handleTimerToggle = async () => {
    if (!matchId) return;

    try {
      const newStatus = timerStatus === 'running' ? 'paused' : 'running';
      const now = new Date().toISOString();
      
      let newTimerValue = dbTimerValue || 0;

      if (newStatus === 'paused' && timerLastStartedAt) {
        const elapsedSinceLastStart = (Date.now() - new Date(timerLastStartedAt).getTime()) / 1000;
        newTimerValue = (dbTimerValue || 0) + elapsedSinceLastStart;
      }

      const updateData: any = {
        timer_status: newStatus,
        updated_at: now
      };

      if (newStatus === 'running') {
        updateData.timer_last_started_at = now;
      } else {
        updateData.timer_current_value = Math.floor(newTimerValue);
        updateData.timer_last_started_at = null;
      }

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;

      toast.success(`Timer ${newStatus === 'running' ? 'started' : 'paused'}`);
    } catch (error) {
      console.error('Error toggling timer:', error);
      toast.error('Failed to update timer');
    }
  };

  const handleTimerReset = async () => {
    if (!matchId) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          timer_status: 'stopped',
          timer_current_value: 0,
          timer_last_started_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (error) throw error;

      toast.success('Timer reset');
    } catch (error) {
      console.error('Error resetting timer:', error);
      toast.error('Failed to reset timer');
    }
  };

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
          {matchId && (
            <div className="flex gap-2 mt-3 w-full">
              <Button 
                onClick={handleTimerToggle}
                variant={timerStatus === 'running' ? 'destructive' : 'default'}
                className="flex-1 text-xs"
                size="sm"
              >
                {timerStatus === 'running' ? (
                  <><Pause className="h-3 w-3 mr-1" /> Pause</>
                ) : (
                  <><Play className="h-3 w-3 mr-1" /> Start</>
                )}
              </Button>
              <Button 
                onClick={handleTimerReset}
                variant="outline"
                size="sm"
                className="px-2"
              >
                <TimerReset className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchTimer;
