
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus } from 'lucide-react';

interface MatchTimerProps {
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  elapsedTime: number; // in seconds
  setElapsedTime: (time: number) => void;
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  isRunning, 
  onToggle, 
  onReset, 
  elapsedTime,
  setElapsedTime
}) => {
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);

  const handleAddMinute = () => {
    setElapsedTime(elapsedTime + 60);
  };

  const handleSubtractMinute = () => {
    if (elapsedTime >= 60) {
      setElapsedTime(elapsedTime - 60);
    }
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
          >
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onReset}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchTimer;
