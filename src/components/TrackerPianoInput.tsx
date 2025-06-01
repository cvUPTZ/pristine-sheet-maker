import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { EventType } from '@/types';
import EnhancedEventTypeIcon from '@/components/match/EnhancedEventTypeIcon';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { toast } from 'sonner';

// Define event categories and types
const eventTypes = [
  'pass', 'shot', 'goal', 'foul', 'save', 'offside', 'corner', 'substitution', 'card',
  'tackle', 'assist', 'yellowCard', 'redCard', 'penalty', 'cross', 'clearance', 'block',
  'interception', 'freeKick', 'throwIn', 'dribble'
] as const;

const EVENT_TYPE_CATEGORIES = [
  {
    key: 'ball_actions',
    label: 'Ball Actions',
    color: '#3b82f6',
    events: [
      { key: 'pass' as EventType, label: 'Pass' },
      { key: 'shot' as EventType, label: 'Shot' },
      { key: 'cross' as EventType, label: 'Cross' },
      { key: 'dribble' as EventType, label: 'Dribble' },
      { key: 'tackle' as EventType, label: 'Tackle' },
      { key: 'interception' as EventType, label: 'Interception' },
      { key: 'clearance' as EventType, label: 'Clearance' },
      { key: 'save' as EventType, label: 'Save' }
    ]
  },
  {
    key: 'set_pieces',
    label: 'Set Pieces',
    color: '#10b981',
    events: [
      { key: 'corner' as EventType, label: 'Corner Kick' },
      { key: 'freeKick' as EventType, label: 'Free Kick' },
      { key: 'throwIn' as EventType, label: 'Throw In' },
      { key: 'penalty' as EventType, label: 'Penalty' }
    ]
  },
  {
    key: 'fouls_cards',
    label: 'Fouls & Cards',
    color: '#ef4444',
    events: [
      { key: 'foul' as EventType, label: 'Foul' },
      { key: 'yellowCard' as EventType, label: 'Yellow Card' },
      { key: 'redCard' as EventType, label: 'Red Card' },
      { key: 'offside' as EventType, label: 'Offside' }
    ]
  },
  {
    key: 'goals_assists',
    label: 'Goals & Assists',
    color: '#f59e0b',
    events: [
      { key: 'goal' as EventType, label: 'Goal' },
      { key: 'assist' as EventType, label: 'Assist' }
    ]
  }
];

interface TrackerPianoInputProps {
  matchId: string;
  assignedEventTypes: EventType[];
  assignedPlayerIds: number[];
  playerId?: number;
  playerTeam?: 'home' | 'away';
}

const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({
  matchId,
  assignedEventTypes,
  assignedPlayerIds,
  playerId,
  playerTeam
}) => {
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(playerId || null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (timerRunning) {
      intervalId = setInterval(() => {
        setCurrentTime(prevTime => prevTime + 1);
      }, 1000);
    }

    return () => clearInterval(intervalId);
  }, [timerRunning]);

  const handleEventSubmit = useCallback(async (eventType: EventType) => {
    if (!selectedPlayer && assignedPlayerIds.length > 1) {
      toast.error('Please select a player first');
      return;
    }

    const targetPlayerId = selectedPlayer || assignedPlayerIds[0];
    
    try {
      const { error } = await supabase
        .from('match_events')
        .insert({
          match_id: matchId,
          event_type: eventType,
          player_id: targetPlayerId,
          team: playerTeam || 'home',
          timestamp: currentTime,
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (error) throw error;

      toast.success(`${eventType} event recorded`);
    } catch (error) {
      console.error('Error recording event:', error);
      toast.error('Failed to record event');
    }
  }, [selectedPlayer, assignedPlayerIds, matchId, playerTeam, currentTime]);

  const renderEventButtons = () => {
    return EVENT_TYPE_CATEGORIES.map(category => {
      const availableEvents = category.events.filter(event => 
        assignedEventTypes.includes(event.key)
      );

      if (availableEvents.length === 0) return null;

      return (
        <div key={category.key} className="space-y-2">
          <h4 className="text-sm font-medium" style={{ color: category.color }}>
            {category.label}
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {availableEvents.map(event => (
              <Button
                key={event.key}
                variant={selectedEventType === event.key ? "default" : "outline"}
                size="sm"
                onClick={() => handleEventSubmit(event.key)}
                className="h-16 flex flex-col items-center justify-center"
              >
                <EnhancedEventTypeIcon
                  eventType={event.key}
                  size={24}
                  variant={selectedEventType === event.key ? "selected" : "default"}
                />
                <span className="text-xs mt-1">{event.label}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Event Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant={timerRunning ? "destructive" : "default"}
            onClick={() => setTimerRunning(!timerRunning)}
          >
            {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {timerRunning ? 'Pause' : 'Start'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setTimerRunning(false);
              setCurrentTime(0);
            }}
          >
            <Square className="h-4 w-4" />
            Reset
          </Button>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
          </Badge>
        </div>

        {/* Player Selection */}
        {assignedPlayerIds.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Select Player</h4>
            <div className="flex flex-wrap gap-2">
              {assignedPlayerIds.map(pid => (
                <Button
                  key={pid}
                  variant={selectedPlayer === pid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPlayer(pid)}
                >
                  Player #{pid}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Event Type Buttons */}
        <div className="space-y-4">
          {renderEventButtons()}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackerPianoInput;
