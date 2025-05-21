
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TimerReset, Play, Pause, Plus, Minus } from 'lucide-react';

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
  // Ensure elapsedTime is a number to avoid NaN display
  const safeElapsedTime = isNaN(elapsedTime) ? 0 : elapsedTime;
  const minutes = Math.floor(safeElapsedTime / 60);
  const seconds = Math.floor(safeElapsedTime % 60);
  
  // Add effect to increment timer when running
  useEffect(() => {
    let interval: number | undefined;
    
    if (isRunning) {
      interval = window.setInterval(() => {
        setElapsedTime(prevTime => {
          // Ensure we're working with a valid number
          const prevTimeNum = isNaN(prevTime) ? 0 : Number(prevTime);
          return prevTimeNum + 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, setElapsedTime]);

  const handleAddMinute = () => {
    setElapsedTime(prevTime => {
      // Ensure we're working with a valid number
      const prevTimeNum = isNaN(prevTime) ? 0 : Number(prevTime);
      return prevTimeNum + 60;
    });
  };

  const handleSubtractMinute = () => {
    setElapsedTime(prevTime => {
      // Ensure we're working with a valid number
      const prevTimeNum = isNaN(prevTime) ? 0 : Number(prevTime);
      // Don't go below zero
      return Math.max(0, prevTimeNum - 60);
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-center space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8" 
            onClick={handleSubtractMinute}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <div className="text-2xl font-mono font-bold w-20 text-center">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
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
        
        <div className="flex justify-center mt-2 space-x-2">
          <Button 
            variant={isRunning ? "destructive" : "default"} 
            size="sm"
            onClick={onToggle}
            className="flex items-center gap-1"
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onReset}
            className="flex items-center gap-1"
          >
            <TimerReset className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchTimer;
