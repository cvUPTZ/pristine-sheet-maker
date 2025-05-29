
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  recordEvent: (eventType: EventType, playerId: string, teamId: 'home' | 'away', coordinates?: { x: number; y: number }) => void;
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
  events
}) => {
  // Create team objects with required id property
  const homeTeamWithId = {
    ...homeTeam,
    id: homeTeam.id || 'home-team'
  };
  
  const awayTeamWithId = {
    ...awayTeam,
    id: awayTeam.id || 'away-team'
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Team Selection</h3>
              <div className="flex gap-2">
                <Button
                  variant={selectedTeam === 'home' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTeam('home')}
                >
                  {homeTeam.name}
                </Button>
                <Button
                  variant={selectedTeam === 'away' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTeam('away')}
                >
                  {awayTeam.name}
                </Button>
              </div>
            </div>
            
            {selectedPlayer && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Selected Player</h4>
                <Badge variant="secondary">
                  {selectedPlayer.name} (#{selectedPlayer.number})
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <FootballPitch
            homeTeam={homeTeamWithId}
            awayTeam={awayTeamWithId}
            ballTrackingPoints={ballTrackingPoints}
            onPitchClick={handlePitchClick}
            selectedPlayer={selectedPlayer}
            selectedTeam={selectedTeam}
            onPlayerSelect={handlePlayerSelect}
          />
        </CardContent>
      </Card>

      {events.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Recent Events</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {events.slice(-5).map((event) => (
                <div key={event.id} className="text-sm">
                  <Badge variant="outline" className="mr-2">
                    {event.type}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PitchView;
