
import React, { useState } from 'react';
import { Player, EventType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import { Badge } from '@/components/ui/badge';
import { 
  Keyboard,
  Target,
  Trophy,
  ArrowUp,
  Flag,
  Shield,
  RotateCw,
  Hand,
  Star,
  CheckCircle,
  XCircle,
  Circle,
  Pause,
  Send,
  CornerUpRight,
  Award
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

// Define a type for the action buttons to include additionalData
interface ActionButton {
  type: EventType;
  label: string;
  color: string;
  icon: React.ReactNode;
  additionalData?: Record<string, any>;
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
  const [showActionCircle, setShowActionCircle] = useState(false);
  const [targetPlayer, setTargetPlayer] = useState<Player | null>(null);
  
  // Define available actions for the piano with clearer categories and icons
  // Remove pass actions as requested
  const offensiveActions: ActionButton[] = [
    { type: 'shot', label: 'TIR', color: 'bg-orange-500 hover:bg-orange-600 text-white', icon: <Target className="w-5 h-5" />, additionalData: { cadre: true } },
    { type: 'goal', label: 'BUT', color: 'bg-green-500 hover:bg-green-600 text-white', icon: <Trophy className="w-5 h-5" /> },
    { type: 'shot', label: 'NON CADRÉ', color: 'bg-yellow-500 hover:bg-yellow-600 text-black', icon: <XCircle className="w-5 h-5" />, additionalData: { cadre: false } },
    { type: 'header', label: 'TÊTE', color: 'bg-blue-500 hover:bg-blue-600 text-white', icon: <ArrowUp className="w-5 h-5" /> }
  ];
  
  const playActions: ActionButton[] = [
    // Removed pass actions as requested
    { type: 'cross', label: 'CENTRE', color: 'bg-violet-400 hover:bg-violet-500 text-white', icon: <CornerUpRight className="w-5 h-5" /> },
    { type: 'free-kick', label: 'COUP FRANC', color: 'bg-rose-400 hover:bg-rose-500 text-white', icon: <Flag className="w-5 h-5" /> }
  ];
  
  const defensiveActions: ActionButton[] = [
    { type: 'tackle', label: 'TACLE', color: 'bg-red-500 hover:bg-red-600 text-white', icon: <Shield className="w-5 h-5" /> },
    { type: 'foul', label: 'FAUTE', color: 'bg-red-600 hover:bg-red-700 text-white', icon: <Pause className="w-5 h-5" /> },
    { type: 'card', label: 'JAUNE', color: 'bg-yellow-400 hover:bg-yellow-500 text-black', icon: <Star className="w-5 h-5" />, additionalData: { cardType: 'yellow' } },
    { type: 'card', label: 'ROUGE', color: 'bg-red-600 hover:bg-red-700 text-white', icon: <Star className="w-5 h-5 fill-current" />, additionalData: { cardType: 'red' } }
  ];
  
  const setPlayActions: ActionButton[] = [
    { type: 'corner', label: 'CORNER', color: 'bg-purple-500 hover:bg-purple-600 text-white', icon: <Flag className="w-5 h-5" /> },
    { type: 'penalty', label: 'PENALTY', color: 'bg-pink-500 hover:bg-pink-600 text-white', icon: <Target className="w-5 h-5" /> },
    { type: 'offside', label: 'HORS JEU', color: 'bg-blue-700 hover:bg-blue-800 text-white', icon: <Flag className="w-5 h-5" /> }
  ];
  
  const specialActions: ActionButton[] = [
    { type: 'tackle', label: 'CONTRE', color: 'bg-purple-700 hover:bg-purple-800 text-white', icon: <Shield className="w-5 h-5" />, additionalData: { blockType: 'counter' } },
    { type: 'header', label: 'POTEAU', color: 'bg-amber-500 hover:bg-amber-600 text-black', icon: <Circle className="w-5 h-5" />, additionalData: { hitPost: true } },
    { type: 'shot', label: 'CADRÉ', color: 'bg-lime-500 hover:bg-lime-600 text-black', icon: <CheckCircle className="w-5 h-5" />, additionalData: { cadre: true } }
  ];
  
  // Combine all actions for the circular menu
  const allActions = [...offensiveActions, ...playActions, ...defensiveActions, ...setPlayActions, ...specialActions];
  
  const handleSelectPlayer = (player: Player, team: 'home' | 'away') => {
    // If we already have a selected player and now selecting another player,
    // interpret it as a pass from selected player to the newly clicked player
    if (selectedPlayer && selectedPlayer.id !== player.id) {
      setTargetPlayer(player);
      // Record pass event
      const position = teamPositions[selectedPlayer.id] || { x: 0.5, y: 0.5 };
      onRecordEvent('pass', selectedPlayer.id, selectedTeam, position);
      
      // Then update selected player to the target
      setSelectedPlayer(player);
      setSelectedTeam(team);
      setPlayerName(player.name);
      setShowActionCircle(true);
    } else {
      // First player selection
      setSelectedPlayer(player);
      setSelectedTeam(team);
      setPlayerName(player.name);
      setShowActionCircle(true);
    }
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
    setShowActionCircle(false);
  };
  
  const handleUndoAction = () => {
    // Implementation for undo would be handled elsewhere
    console.log('Undo last action');
  };
  
  // Filter active players and bench players
  const activePlayers = selectedTeam === 'home' ? homeTeam.players : awayTeam.players;
  
  // Calculate positions for circular menu items
  const calculateCirclePosition = (index: number, total: number, radius: number) => {
    const angleStep = (2 * Math.PI) / total;
    const angle = index * angleStep;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { x, y };
  };
  
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
            
            {/* Stadium with full height taking most of the available space */}
            <div className="relative h-[65vh] border-2 border-gray-300 rounded-md overflow-hidden mb-4 shadow-inner">
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
                <div className="flex items-center gap-2 w-full justify-between">
                  <div className="flex items-center">
                    <span className="bg-gray-200 text-gray-800 font-bold px-2 py-1 rounded-l-md">
                      {selectedPlayer.number}
                    </span>
                    <span className="bg-blue-700 text-white px-2 py-1 rounded-r-md">
                      {selectedPlayer.name}
                    </span>
                  </div>
                  
                  {/* Show action circle directly without a button when a player is selected */}
                  {showActionCircle && (
                    <div className="relative w-64 h-64">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        {/* Central cancel button */}
                        <Button 
                          variant="destructive" 
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full w-10 h-10 flex items-center justify-center shadow-md z-10"
                          onClick={() => setShowActionCircle(false)}
                        >
                          <RotateCw className="h-5 w-5" />
                        </Button>
                        
                        {/* Action buttons in a circle */}
                        {allActions.map((action, index) => {
                          const position = calculateCirclePosition(
                            index, 
                            allActions.length, 
                            100 // radius
                          );
                          
                          return (
                            <Button
                              key={`${action.type}-${action.label}`}
                              onClick={() => handleActionClick(action.type, action.additionalData)}
                              disabled={!selectedPlayer}
                              className={`absolute rounded-full w-14 h-14 ${action.color} flex flex-col items-center justify-center p-1 transform -translate-x-1/2 -translate-y-1/2 shadow-md transition-transform hover:scale-110`}
                              style={{
                                left: `calc(50% + ${position.x}px)`,
                                top: `calc(50% + ${position.y}px)`,
                              }}
                            >
                              <div className="flex items-center justify-center">
                                {action.icon}
                              </div>
                              <span className="text-[8px] font-semibold mt-1 leading-none">
                                {action.label}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">Sélectionnez un joueur</div>
              )}
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
