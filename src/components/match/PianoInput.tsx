
import React, { useState } from 'react';
import { Player, EventType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

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
  
  // Define available actions for the piano with clearer categories
  const offensiveActions = [
    { type: 'shot' as EventType, label: 'TIR', color: 'bg-orange-500 hover:bg-orange-600 text-white' },
    { type: 'goal' as EventType, label: 'BUT', color: 'bg-green-500 hover:bg-green-600 text-white' },
    { type: 'shot' as EventType, label: 'NON CADRÉ', color: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
    { type: 'header' as EventType, label: 'TÊTE', color: 'bg-blue-500 hover:bg-blue-600 text-white' }
  ];
  
  const playActions = [
    { type: 'pass' as EventType, label: 'PASSE', color: 'bg-sky-400 hover:bg-sky-500 text-black' },
    { type: 'pass' as EventType, label: 'PASSE DÉCISIVE', color: 'bg-indigo-400 hover:bg-indigo-500 text-white' },
    { type: 'cross' as EventType, label: 'CENTRE', color: 'bg-violet-400 hover:bg-violet-500 text-white' },
    { type: 'free-kick' as EventType, label: 'COUP FRANC', color: 'bg-rose-400 hover:bg-rose-500 text-white' }
  ];
  
  const defensiveActions = [
    { type: 'tackle' as EventType, label: 'TACLE', color: 'bg-red-500 hover:bg-red-600 text-white' },
    { type: 'foul' as EventType, label: 'FAUTE', color: 'bg-red-600 hover:bg-red-700 text-white' },
    { type: 'card' as EventType, label: 'JAUNE', additionalData: { cardType: 'yellow' }, color: 'bg-yellow-400 hover:bg-yellow-500 text-black' },
    { type: 'card' as EventType, label: 'ROUGE', additionalData: { cardType: 'red' }, color: 'bg-red-600 hover:bg-red-700 text-white' }
  ];
  
  const setPlayActions = [
    { type: 'corner' as EventType, label: 'CORNER', color: 'bg-purple-500 hover:bg-purple-600 text-white' },
    { type: 'penalty' as EventType, label: 'PENALTY', color: 'bg-pink-500 hover:bg-pink-600 text-white' },
    { type: 'pass' as EventType, label: 'TOUCHE', color: 'bg-gray-500 hover:bg-gray-600 text-white' },
    { type: 'offside' as EventType, label: 'HORS JEU', color: 'bg-blue-700 hover:bg-blue-800 text-white' }
  ];
  
  const specialActions = [
    { type: 'tackle' as EventType, label: 'CONTRE', color: 'bg-purple-700 hover:bg-purple-800 text-white' },
    { type: 'header' as EventType, label: 'POTEAU', color: 'bg-amber-500 hover:bg-amber-600 text-black' },
    { type: 'shot' as EventType, label: 'CADRÉ', color: 'bg-lime-500 hover:bg-lime-600 text-black' }
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
        <CardHeader className="bg-gradient-to-r from-blue-700 to-purple-700 py-3">
          <CardTitle className="text-center text-lg text-white flex items-center justify-center gap-2">
            <Keyboard className="h-5 w-5" />
            Piano de Saisie de Match
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 bg-gray-50">
          <div className="mb-4">
            <div className="flex justify-between mb-3">
              <Button 
                variant={selectedTeam === 'home' ? 'default' : 'outline'} 
                onClick={() => setSelectedTeam('home')}
                className={`w-1/2 mr-1 ${selectedTeam === 'home' ? 'bg-blue-700' : ''}`}
              >
                {homeTeam.name}
              </Button>
              <Button 
                variant={selectedTeam === 'away' ? 'default' : 'outline'} 
                onClick={() => setSelectedTeam('away')}
                className={`w-1/2 ml-1 ${selectedTeam === 'away' ? 'bg-red-700' : ''}`}
              >
                {awayTeam.name}
              </Button>
            </div>
            
            <div className="relative h-[220px] border-2 border-gray-300 rounded-md overflow-hidden mb-4 shadow-inner">
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
            
            {/* Player selection info */}
            <div className="border rounded-md p-3 mb-4 bg-blue-50 shadow-inner flex items-center justify-between">
              <div className="font-semibold text-blue-800">Joueur: </div>
              {selectedPlayer ? (
                <div className="flex items-center">
                  <span className="bg-gray-200 text-gray-800 font-bold px-2 py-1 rounded-l-md">
                    {selectedPlayer.number}
                  </span>
                  <span className="bg-blue-700 text-white px-2 py-1 rounded-r-md">
                    {selectedPlayer.name}
                  </span>
                </div>
              ) : (
                <div className="text-gray-500">Sélectionnez un joueur</div>
              )}
            </div>
            
            {/* Piano keyboard interface - better organization by action type */}
            <div className="space-y-3">
              {/* First section: Offensive actions */}
              <div>
                <div className="text-sm font-semibold mb-1 text-blue-800 border-b border-blue-200">Actions Offensives</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {offensiveActions.map((action) => (
                    <Button
                      key={action.label}
                      onClick={() => handleActionClick(action.type, action.additionalData)}
                      disabled={!selectedPlayer}
                      className={`h-12 ${action.color}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Second section: Play actions */}
              <div>
                <div className="text-sm font-semibold mb-1 text-blue-800 border-b border-blue-200">Passes & Construction</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {playActions.map((action) => (
                    <Button
                      key={action.label}
                      onClick={() => handleActionClick(action.type, action.additionalData)}
                      disabled={!selectedPlayer}
                      className={`h-12 ${action.color}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Third section: Defensive actions */}
              <div>
                <div className="text-sm font-semibold mb-1 text-blue-800 border-b border-blue-200">Actions Défensives</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {defensiveActions.map((action) => (
                    <Button
                      key={action.label}
                      onClick={() => handleActionClick(action.type, action.additionalData)}
                      disabled={!selectedPlayer}
                      className={`h-12 ${action.color}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Fourth section: Set play actions */}
              <div>
                <div className="text-sm font-semibold mb-1 text-blue-800 border-b border-blue-200">Phases Arrêtées</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {setPlayActions.map((action) => (
                    <Button
                      key={action.label}
                      onClick={() => handleActionClick(action.type, action.additionalData)}
                      disabled={!selectedPlayer}
                      className={`h-12 ${action.color}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Fifth section: Special actions and undo */}
              <div>
                <div className="text-sm font-semibold mb-1 text-blue-800 border-b border-blue-200">Actions Spéciales</div>
                <div className="grid grid-cols-4 gap-1">
                  {specialActions.map((action) => (
                    <Button
                      key={action.label}
                      onClick={() => handleActionClick(action.type, action.additionalData)}
                      disabled={!selectedPlayer}
                      className={`h-12 ${action.color}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                  <Button 
                    variant="destructive" 
                    onClick={handleUndoAction}
                    className="h-12 col-span-1"
                  >
                    ANNULER
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Substitution button */}
            <div className="mt-4">
              <Button 
                variant="default"
                onClick={() => setShowSubstitutionMenu(!showSubstitutionMenu)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-12 shadow-md"
              >
                REMPLACEMENTS
              </Button>
              
              {showSubstitutionMenu && (
                <div className="mt-2 p-3 border border-gray-300 rounded-md bg-white shadow-md">
                  <h4 className="font-medium mb-2 text-gray-700">Substitutions</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {benchPlayers.length === 0 ? (
                      <p className="text-muted-foreground text-sm col-span-3">Aucun remplaçant disponible</p>
                    ) : (
                      benchPlayers.map(player => (
                        <Button 
                          key={player.id}
                          variant="outline" 
                          className="flex items-center justify-between"
                          onClick={() => handleSelectPlayer(player, selectedTeam)}
                        >
                          <span className="mr-2 bg-gray-200 px-1 rounded">{player.number}</span>
                          <span className="truncate">{player.name}</span>
                        </Button>
                      ))
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
