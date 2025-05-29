
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw } from 'lucide-react';
import FootballPitch from '@/components/FootballPitch';
import { Team, Player, MatchEvent, EventType } from '@/types';

interface PitchViewProps {
  homeTeam: Team;
  awayTeam: Team;
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
  handlePlayerSelect: (player: Player) => void;
  ballTrackingPoints: Array<{ x: number; y: number; timestamp: number }>;
  handlePitchClick: (coordinates: { x: number; y: number }) => void;
  addBallTrackingPoint: (point: { x: number; y: number }) => void;
  recordEvent: (eventType: EventType, playerId: string | number, teamId: 'home' | 'away', coordinates?: { x: number; y: number }) => void;
  events: MatchEvent[];
}

const PitchView: React.FC<PitchViewProps> = ({
  homeTeam,
  awayTeam,
  selectedPlayer,
  selectedTeam,
  setSelectedTeam,
  handlePlayerSelect,
  ballTrackingPoints,
  handlePitchClick,
  addBallTrackingPoint,
  recordEvent,
  events,
}) => {
  const [selectedEventType, setSelectedEventType] = useState<EventType>('pass');
  const [isTracking, setIsTracking] = useState(false);

  const handlePitchClickInternal = (coordinates: { x: number; y: number }) => {
    if (isTracking) {
      addBallTrackingPoint(coordinates);
    }
    
    if (selectedPlayer) {
      recordEvent(selectedEventType, selectedPlayer.id, selectedTeam, coordinates);
    }
    
    handlePitchClick(coordinates);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Team Selection</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex gap-2">
              <Button
                variant={selectedTeam === 'home' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTeam('home')}
                className="flex-1"
              >
                {homeTeam.name}
              </Button>
              <Button
                variant={selectedTeam === 'away' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTeam('away')}
                className="flex-1"
              >
                {awayTeam.name}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Event Type</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Select value={selectedEventType} onValueChange={(value: EventType) => setSelectedEventType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="shot">Shot</SelectItem>
                <SelectItem value="goal">Goal</SelectItem>
                <SelectItem value="foul">Foul</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="substitution">Substitution</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ball Tracking</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Button
              variant={isTracking ? 'destructive' : 'default'}
              size="sm"
              onClick={() => setIsTracking(!isTracking)}
              className="w-full"
            >
              {isTracking ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Tracking
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Tracking
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Selected Player Info */}
      {selectedPlayer && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline">#{selectedPlayer.number}</Badge>
              <span className="font-medium">{selectedPlayer.name}</span>
              <Badge variant={selectedTeam === 'home' ? 'default' : 'secondary'}>
                {selectedTeam === 'home' ? homeTeam.name : awayTeam.name}
              </Badge>
              <span className="text-sm text-gray-600">{selectedPlayer.position}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Football Pitch */}
      <Card>
        <CardContent className="p-2">
          <FootballPitch
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            ballTrackingPoints={ballTrackingPoints}
            onPitchClick={handlePitchClickInternal}
            selectedPlayer={selectedPlayer}
            selectedTeam={selectedTeam}
            onPlayerSelect={handlePlayerSelect}
            events={events}
          />
        </CardContent>
      </Card>

      {/* Player Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{homeTeam.name} Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {homeTeam.players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerSelect(player)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedPlayer?.id === player.id && selectedTeam === 'home'
                      ? 'bg-blue-100 border border-blue-300'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">#{player.number}</Badge>
                    <span>{player.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{awayTeam.name} Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {awayTeam.players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerSelect(player)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedPlayer?.id === player.id && selectedTeam === 'away'
                      ? 'bg-blue-100 border border-blue-300'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">#{player.number}</Badge>
                    <span>{player.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PitchView;
