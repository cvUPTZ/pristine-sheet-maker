
import React, { useState } from 'react';
import { Player, EventType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import { Badge } from '@/components/ui/badge';
import PianoIcon from '@/components/ui/icons/PianoIcon';

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
  const [playerName, setPlayerName] = useState('');
  
  // Define available actions for the piano
  const actionButtons = [
    { type: 'shot' as EventType, label: 'TIR', color: 'bg-yellow-300 hover:bg-yellow-400 text-black' },
    { type: 'goal' as EventType, label: 'CADRÉ', color: 'bg-yellow-300 hover:bg-yellow-400 text-black' },
    { type: 'shot' as EventType, label: 'NON CADRÉ', color: 'bg-yellow-300 hover:bg-yellow-400 text-black' },
    { type: 'tackle' as EventType, label: 'CONTRE', color: 'bg-yellow-300 hover:bg-yellow-400 text-black' },
    { type: 'header' as EventType, label: 'POTEAU', color: 'bg-yellow-300 hover:bg-yellow-400 text-black' },
    { type: 'header' as EventType, label: 'TETE', color: 'bg-yellow-300 hover:bg-yellow-400 text-black' }
  ];
  
  const secondRowButtons = [
    { type: 'foul' as EventType, label: 'ADVERSAIRE', color: 'bg-pink-400 hover:bg-pink-500 text-black' },
    { type: 'pass' as EventType, label: 'TOUCHE', color: 'bg-white hover:bg-gray-100 text-black border border-gray-300' },
    { type: 'free-kick' as EventType, label: 'COUP-FRANC', color: 'bg-white hover:bg-gray-100 text-black border border-gray-300' },
    { type: 'offside' as EventType, label: 'HORS JEU', color: 'bg-white hover:bg-gray-100 text-black border border-gray-300' },
    { type: 'pass' as EventType, label: 'PASSE APPUI', color: 'bg-gray-400 hover:bg-gray-500 text-black' },
    { type: 'pass' as EventType, label: 'PASSE DECISIVE', color: 'bg-gray-400 hover:bg-gray-500 text-black' },
    { type: 'cross' as EventType, label: 'CENTRE', color: 'bg-gray-400 hover:bg-gray-500 text-black' }
  ];
  
  const cardButtons = [
    { type: 'card' as EventType, label: 'ROUGE', additionalData: { cardType: 'red' }, color: 'bg-red-600 hover:bg-red-700 text-white' },
    { type: 'card' as EventType, label: 'JAUNE', additionalData: { cardType: 'yellow' }, color: 'bg-yellow-400 hover:bg-yellow-500 text-black' }
  ];
  
  const specialButtons = [
    { type: 'penalty' as EventType, label: 'PENALTY', color: 'bg-orange-400 hover:bg-orange-500 text-black' },
    { type: 'goal' as EventType, label: 'BUT', color: 'bg-orange-400 hover:bg-orange-500 text-black' },
    { type: 'corner' as EventType, label: 'CORNER', color: 'bg-pink-400 hover:bg-pink-500 text-black' },
  ];
  
  const handleSelectPlayer = (player: Player, team: 'home' | 'away') => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
    setPlayerName(player.name);
  };
  
  const handleActionClick = (action: EventType, additionalData?: Record<string, any>) => {
    if (!selectedPlayer) return;
    
    setSelectedAction(action);
    
    // Get player position from teamPositions or default to center of field
    const position = teamPositions[selectedPlayer.id] || { x: 0.5, y: 0.5 };
    
    // Record the event
    onRecordEvent(action, selectedPlayer.id, selectedTeam, position);
    
    // Reset selection after recording
    setSelectedAction(null);
  };
  
  const handleUndoAction = () => {
    // Implementation for undo would be handled elsewhere
    console.log('Undo last action');
  };
  
  // Filter active players and bench players
  const activePlayers = selectedTeam === 'home' ? homeTeam.players : awayTeam.players;
  
  return (
    <div className="w-full">
      <Card className="mb-4 overflow-visible">
        <CardHeader className="bg-green-100 py-2">
          <CardTitle className="text-center text-lg">Piano de Saisie de Match</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
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
            
            <div className="relative h-[270px] border-2 border-gray-200 rounded-md overflow-hidden mb-4">
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
            
            <div className="border rounded-md p-3 mb-4 bg-green-50">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-center font-semibold">Nom du joueur:</div>
                <Input 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex">
                <Button 
                  variant="destructive" 
                  onClick={handleUndoAction}
                  className="w-[120px] h-14 mr-1"
                >
                  ANNULER DERNIERE TOUCHE
                </Button>
                <div className="grid grid-cols-6 gap-1 flex-1">
                  {actionButtons.map((action) => (
                    <Button
                      key={action.label}
                      onClick={() => handleActionClick(action.type)}
                      disabled={!selectedPlayer}
                      className={`h-14 ${action.color}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {secondRowButtons.map((action) => (
                  <Button
                    key={action.label}
                    onClick={() => handleActionClick(action.type)}
                    disabled={!selectedPlayer}
                    className={`h-14 ${action.color}`}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
              
              <div className="flex justify-between">
                <div className="flex space-x-1">
                  {specialButtons.map((action) => (
                    <Button
                      key={action.label}
                      onClick={() => handleActionClick(action.type)}
                      disabled={!selectedPlayer}
                      className={`h-14 ${action.color}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
                <div className="flex space-x-1">
                  {cardButtons.map((action) => (
                    <Button
                      key={action.label}
                      onClick={() => handleActionClick(action.type, action.additionalData)}
                      disabled={!selectedPlayer}
                      className={`h-14 ${action.color}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Button 
                variant="default"
                onClick={() => setShowSubstitutionMenu(!showSubstitutionMenu)}
                className="w-full bg-orange-400 hover:bg-orange-500 text-black h-12"
              >
                BANC DES REMPLACANTS
              </Button>
              
              {showSubstitutionMenu && (
                <div className="mt-2 p-3 border border-gray-300 rounded-md bg-white">
                  <h4 className="font-medium mb-2">Substitutions</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {benchPlayers.length === 0 && (
                      <p className="text-muted-foreground text-sm col-span-3">No bench players available</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
};

export default PianoInput;
