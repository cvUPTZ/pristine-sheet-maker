
import React, { useState } from 'react';
import { Player, EventType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

interface PianoInputProps {
  homeTeam: {
    name: string;
    players: Player[];
  };
  awayTeam: {
    name: string;
    players: Player[];
  };
  onRecordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => void;
  teamPositions: Record<number, { x: number; y: number }>;
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
}

const PianoInput: React.FC<PianoInputProps> = ({
  homeTeam,
  awayTeam,
  onRecordEvent,
  teamPositions,
  selectedTeam,
  setSelectedTeam
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedAction, setSelectedAction] = useState<EventType | null>(null);
  const [showSubstitutionMenu, setShowSubstitutionMenu] = useState(false);
  const [benchPlayers, setBenchPlayers] = useState<Player[]>([]);
  
  // Define available actions for the piano
  const commonActions: Array<{ type: EventType; label: string }> = [
    { type: 'pass', label: 'Pass' },
    { type: 'shot', label: 'Shot' },
    { type: 'goal', label: 'Goal' },
    { type: 'dribble', label: 'Dribble' },
    { type: 'tackle', label: 'Tackle' },
    { type: 'interception', label: 'Interception' },
    { type: 'foul', label: 'Foul' },
    { type: 'card', label: 'Card' },
    { type: 'cross', label: 'Cross' },
    { type: 'header', label: 'Header' },
    { type: 'corner', label: 'Corner' },
    { type: 'free-kick', label: 'Free Kick' },
    { type: 'penalty', label: 'Penalty' },
    { type: 'offside', label: 'Offside' },
    { type: 'goal-kick', label: 'Goal Kick' },
    { type: 'throw-in', label: 'Throw In' }
  ];
  
  const handleSelectPlayer = (player: Player, team: 'home' | 'away') => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };
  
  const handleActionClick = (action: EventType) => {
    if (!selectedPlayer) return;
    
    setSelectedAction(action);
    
    // Get player position from teamPositions or default to center of field
    const position = teamPositions[selectedPlayer.id] || { x: 0.5, y: 0.5 };
    
    // Record the event
    onRecordEvent(action, selectedPlayer.id, selectedTeam, position);
    
    // Reset selection after recording
    setSelectedAction(null);
  };
  
  const handleSubstitution = (outPlayer: Player, inPlayer: Player) => {
    // Handle substitution logic
    console.log(`Substituting ${outPlayer.name} with ${inPlayer.name}`);
    setShowSubstitutionMenu(false);
  };
  
  // Filter active players and bench players
  const activePlayers = selectedTeam === 'home' ? homeTeam.players : awayTeam.players;

  return (
    <div className="w-full">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Piano de Saisie de Match</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <Button 
                variant={selectedTeam === 'home' ? 'default' : 'outline'} 
                onClick={() => setSelectedTeam('home')}
                className="w-1/2 mr-1"
              >
                {homeTeam.name}
              </Button>
              <Button 
                variant={selectedTeam === 'away' ? 'default' : 'outline'} 
                onClick={() => setSelectedTeam('away')}
                className="w-1/2 ml-1"
              >
                {awayTeam.name}
              </Button>
            </div>
            
            <div className="relative h-[300px] border-2 border-gray-200 rounded-md overflow-hidden">
              <FootballPitch>
                {/* Render players for the selected team */}
                {activePlayers.map((player) => (
                  <PlayerMarker
                    key={`${selectedTeam}-${player.id}`}
                    player={player}
                    teamColor={selectedTeam === 'home' ? "#1A365D" : "#D3212C"}
                    position={teamPositions[player.id] || { x: 0.5, y: 0.5 }}
                    onClick={() => handleSelectPlayer(player, selectedTeam)}
                    selected={selectedPlayer?.id === player.id}
                  />
                ))}
              </FootballPitch>
            </div>
            
            {selectedPlayer && (
              <div className="mt-2 p-2 bg-gray-100 rounded-md shadow-sm">
                <p className="font-medium">Selected: {selectedPlayer.name} (#{selectedPlayer.number}) - {selectedTeam === 'home' ? homeTeam.name : awayTeam.name}</p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-4 gap-2 mt-4">
            {commonActions.map((action) => (
              <Button
                key={action.type}
                variant="outline"
                onClick={() => handleActionClick(action.type)}
                disabled={!selectedPlayer}
                className={selectedAction === action.type ? 'bg-blue-100' : ''}
              >
                {action.label}
              </Button>
            ))}
          </div>
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowSubstitutionMenu(!showSubstitutionMenu)}
              className="w-full"
            >
              Substitution
            </Button>
            
            {showSubstitutionMenu && (
              <div className="mt-2 p-3 border border-gray-300 rounded-md">
                <h4 className="font-medium mb-2">Bench Players</h4>
                <div className="grid grid-cols-3 gap-2">
                  {benchPlayers.map(player => (
                    <Button
                      key={player.id}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        if (selectedPlayer) {
                          handleSubstitution(selectedPlayer, player);
                        }
                      }}
                      disabled={!selectedPlayer}
                    >
                      {player.name} (#{player.number})
                    </Button>
                  ))}
                  {benchPlayers.length === 0 && (
                    <p className="text-muted-foreground text-sm">No bench players available</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PianoInput;
