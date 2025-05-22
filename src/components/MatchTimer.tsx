
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TimerReset, Play, Pause, Plus, Minus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MatchTimerProps {
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  elapsedTime: number; // in seconds
  setElapsedTime: React.Dispatch<React.SetStateAction<number>>;
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  isRunning, 
  onToggle, 
  onReset, 
  elapsedTime,
  setElapsedTime
}) => {
  const { toast } = useToast();
  const intervalRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);
  const hasToastedStartRef = useRef<boolean>(false);
  const hasToastedPauseRef = useRef<boolean>(false);
  
  // Ensure elapsedTime is a number to avoid NaN display
  const safeElapsedTime = isNaN(elapsedTime) ? 0 : elapsedTime;
  const minutes = Math.floor(safeElapsedTime / 60);
  const seconds = Math.floor(safeElapsedTime % 60);
  
  // Function to handle timer ticks with performance optimization
  const handleTimerTick = () => {
    const currentTime = performance.now();
    
    // First tick, just set the reference time
    if (lastTickTimeRef.current === null) {
      lastTickTimeRef.current = currentTime;
      return;
    }
    
    // Calculate actual elapsed time since last tick (in seconds)
    const deltaTime = (currentTime - lastTickTimeRef.current) / 1000;
    lastTickTimeRef.current = currentTime;
    
    // Update with the actual elapsed time rather than assuming exactly 1 second
    setElapsedTime(prev => {
      const prevTimeNum = isNaN(prev) ? 0 : Number(prev);
      return prevTimeNum + deltaTime;
    });
  };

  // Set up and clean up timer effect
  useEffect(() => {
    if (isRunning) {
      // Clear any existing interval first
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      
      // Reset the last tick time reference
      lastTickTimeRef.current = null;
      
      // Set up a new interval with higher resolution (100ms) for smoother updates
      intervalRef.current = window.setInterval(handleTimerTick, 100);
      
      // Notify that timer has started (only once per start)
      if (!hasToastedStartRef.current) {
        toast({
          title: "Timer Started",
          description: "Match timer is now running",
          duration: 2000
        });
        hasToastedStartRef.current = true;
        hasToastedPauseRef.current = false;
      }
    } else if (intervalRef.current) {
      // Clear the interval when stopped
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      lastTickTimeRef.current = null;
      
      if (safeElapsedTime > 0 && !hasToastedPauseRef.current) {
        toast({
          title: "Timer Paused",
          description: `Current time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          duration: 2000
        });
        hasToastedPauseRef.current = true;
        hasToastedStartRef.current = false;
      }
    }
    
    // Clean up on component unmount
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, setElapsedTime, toast, minutes, seconds, safeElapsedTime]);

  const handleReset = () => {
    onReset();
    hasToastedStartRef.current = false;
    hasToastedPauseRef.current = false;
    toast({
      title: "Timer Reset",
      description: "Match timer has been reset to 00:00",
      duration: 2000
    });
  };

  const handleAddMinute = () => {
    setElapsedTime(prev => {
      const prevTimeNum = isNaN(prev) ? 0 : Number(prev);
      const newTime = prevTimeNum + 60;
      toast({
        title: "Time Adjusted",
        description: `Added 1 minute to timer`,
        duration: 1500
      });
      return newTime;
    });
  };

  const handleSubtractMinute = () => {
    setElapsedTime(prev => {
      const prevTimeNum = isNaN(prev) ? 0 : Number(prev);
      // Don't go below zero
      const newTime = Math.max(0, prevTimeNum - 60);
      
      if (prevTimeNum !== newTime) {
        toast({
          title: "Time Adjusted",
          description: `Subtracted 1 minute from timer`,
          duration: 1500
        });
      }
      
      return newTime;
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          <div className="relative w-full flex items-center justify-between mb-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleSubtractMinute}
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="text-3xl font-mono font-bold flex items-center justify-center bg-black/5 rounded-md px-4 py-2 w-32">
              {minutes.toString().padStart(2, '0')}
              <span className="mx-1 animate-pulse">:</span>
              {seconds.toString().padStart(2, '0')}
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleAddMinute}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-center mt-4 space-x-3 w-full">
            <Button 
              variant={isRunning ? "destructive" : "default"} 
              size="sm"
              onClick={onToggle}
              className="flex-1 flex items-center justify-center gap-1"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1"
            >
              <TimerReset className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchTimer;
