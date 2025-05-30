
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventType, Team, Player } from '@/types';

interface PianoInputComponentProps {
  homeTeam: Team;
  awayTeam: Team;
  onEventAdd: (event: any) => void;
}

const eventTypes: EventType[] = [
  'pass', 'shot', 'tackle', 'foul', 'corner', 'offside', 'goal',
  'assist', 'yellowCard', 'redCard', 'substitution', 'card',
  'penalty', 'free-kick', 'goal-kick', 'throw-in', 'interception',
  'possession', 'ballLost', 'ballRecovered', 'dribble', 'cross',
  'clearance', 'block', 'save', 'ownGoal', 'freeKick', 'throwIn',
  'goalKick', 'aerialDuel', 'groundDuel'
];

const PianoInputComponent: React.FC<PianoInputComponentProps> = ({
  homeTeam,
  awayTeam,
  onEventAdd,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<EventType>('pass');
  const [timestamp, setTimestamp] = useState<string>('');

  const getCurrentTeamPlayers = (): Player[] => {
    return selectedTeam === 'home' ? homeTeam.players : awayTeam.players;
  };

  const handleAddEvent = () => {
    const player = getCurrentTeamPlayers().find(p => p.id.toString() === selectedPlayer);
    
    const event = {
      type: selectedEventType,
      team: selectedTeam,
      player: player,
      timestamp: timestamp ? parseInt(timestamp) * 1000 : Date.now(), // Convert seconds to milliseconds
      description: `${selectedEventType} by ${player?.name || 'Unknown'}`
    };

    onEventAdd(event);
    
    // Reset form
    setSelectedPlayer('');
    setTimestamp('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Piano Input - Quick Event Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Team Selection */}
          <div>
            <Label>Team</Label>
            <Select value={selectedTeam} onValueChange={(value: 'home' | 'away') => setSelectedTeam(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home">{homeTeam.name}</SelectItem>
                <SelectItem value="away">{awayTeam.name}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Player Selection */}
          <div>
            <Label>Player</Label>
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {getCurrentTeamPlayers().map((player) => (
                  <SelectItem key={player.id} value={player.id.toString()}>
                    #{player.jersey_number} {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Type */}
          <div>
            <Label>Event Type</Label>
            <Select value={selectedEventType} onValueChange={(value: EventType) => setSelectedEventType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timestamp */}
          <div>
            <Label>Time (minutes)</Label>
            <Input
              type="number"
              placeholder="e.g. 45"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {['pass', 'shot', 'goal', 'foul', 'card', 'corner'].map((type) => (
            <Button
              key={type}
              variant={selectedEventType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedEventType(type as EventType)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>

        <Button 
          onClick={handleAddEvent} 
          disabled={!selectedPlayer || !selectedEventType}
          className="w-full"
        >
          Add Event
        </Button>
      </CardContent>
    </Card>
  );
};

export default PianoInputComponent;
