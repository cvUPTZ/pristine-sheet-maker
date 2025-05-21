
import React, { useState, useEffect } from 'react';
import { Player, EventType, BallTrackingPoint } from '@/types';
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
  Award,
  ArrowRight,
  X
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getPlayerPositions } from '@/utils/formationUtils';

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
  const [ballPositionHistory, setBallPositionHistory] = useState<BallTrackingPoint[]>([]);
  const [currentBallHolder, setCurrentBallHolder] = useState<{player: Player, team: 'home' | 'away'} | null>(null);
  const [interceptions, setInterceptions] = useState<{from: {player: Player, team: 'home'|'away'}, to: {player: Player, team: 'home'|'away'}, position: {x: number, y: number}}[]>([]);
  
  // Generate separate position maps for home and away teams
  const homePositions = getPlayerPositions(homeTeam, true);
  const awayPositions = getPlayerPositions(awayTeam, false);
  
  // Combine with any provided positions from props (for custom positioning)
  const combinedPositions = { ...homePositions, ...awayPositions, ...teamPositions };
  
  // Define available actions for the piano with clearer categories and icons
  // Remove pass actions as requested
  const offensiveActions: ActionButton[] = [
    { type: 'shot', label: 'TIR', color: 'bg-orange-500 hover:bg-orange-600 text-white', icon: <Target className="w-5 h-5" />, additionalData: { cadre: true } },
    { type: 'goal', label: 'BUT', color: 'bg-green-500 hover:bg-green-600 text-white', icon: <Trophy className="w-5 h-5" /> },
    { type: 'shot', label: 'NON CADRÉ', color: 'bg-yellow-500 hover:bg-yellow-600 text-black', icon: <XCircle className="w-5 h-5" />, additionalData: { cadre: false } },
    { type: 'header', label: 'TÊTE', color: 'bg-blue-500 hover:bg-blue-600 text-white', icon: <ArrowUp className="w-5 h-5" /> }
  ];
  
  const playActions: ActionButton[] = [
    // Re-adding pass action for recording passes between players
    { type: 'pass', label: 'PASSE', color: 'bg-blue-400 hover:bg-blue-500 text-white', icon: <Send className="w-5 h-5" /> },
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
    { type: 'interception', label: 'INTERCEPTION', color: 'bg-purple-700 hover:bg-purple-800 text-white', icon: <X className="w-5 h-5" />, additionalData: { isInterception: true } },
    { type: 'header', label: 'POTEAU', color: 'bg-amber-500 hover:bg-amber-600 text-black', icon: <Circle className="w-5 h-5" />, additionalData: { hitPost: true } },
    { type: 'shot', label: 'CADRÉ', color: 'bg-lime-500 hover:bg-lime-600 text-black', icon: <CheckCircle className="w-5 h-5" />, additionalData: { cadre: true } }
  ];
  
  // Combine all actions for the circular menu
  const allActions = [...offensiveActions, ...playActions, ...defensiveActions, ...setPlayActions, ...specialActions];
  
  // Effect to handle initial ball position
  useEffect(() => {
    if (selectedTeam && !currentBallHolder) {
      const team = selectedTeam === 'home' ? homeTeam : awayTeam;
      if (team.players.length > 0) {
        // Start with a central midfielder or a forward as default ball holder
        const defaultPosition = team.players.find(p => p.position === 'CM' || p.position === 'CF') || team.players[0];
        setCurrentBallHolder({
          player: defaultPosition,
          team: selectedTeam
        });
      }
    }
  }, [selectedTeam, homeTeam, awayTeam]);
  
  const handleSelectPlayer = (player: Player, team: 'home' | 'away') => {
    // If we already have a selected player and now selecting another player,
    // interpret it as a pass from selected player to the newly clicked player
    if (selectedPlayer && selectedPlayer.id !== player.id) {
      setTargetPlayer(player);
      
      // Check if players are from different teams - this is an interception
      if (selectedTeam !== team) {
        // Record the interception
        const fromPosition = combinedPositions[selectedPlayer.id] || { x: 0.5, y: 0.5 };
        const toPosition = combinedPositions[player.id] || { x: 0.5, y: 0.5 };
        
        // Calculate the middle point where interception happens
        const interceptionPoint = {
          x: (fromPosition.x + toPosition.x) / 2,
          y: (fromPosition.y + toPosition.y) / 2
        };
        
        // Add to interceptions list
        setInterceptions([...interceptions, {
          from: { player: selectedPlayer, team: selectedTeam },
          to: { player, team },
          position: interceptionPoint
        }]);
        
        // Record interception event
        onRecordEvent('interception', player.id, team, interceptionPoint);
        
        // Update ball history with interception point
        setBallPositionHistory([
          ...ballPositionHistory, 
          {
            x: fromPosition.x,
            y: fromPosition.y,
            timestamp: Date.now(),
            teamId: selectedTeam,
            playerId: selectedPlayer.id
          },
          {
            x: interceptionPoint.x,
            y: interceptionPoint.y,
            timestamp: Date.now() + 1,
            teamId: team,
            playerId: player.id
          }
        ]);
      } else {
        // It's a regular pass within same team
        const position = combinedPositions[selectedPlayer.id] || { x: 0.5, y: 0.5 };
        onRecordEvent('pass', selectedPlayer.id, selectedTeam, position);
        
        // Add to ball history
        const targetPosition = combinedPositions[player.id] || { x: 0.5, y: 0.5 };
        setBallPositionHistory([
          ...ballPositionHistory, 
          {
            x: position.x,
            y: position.y,
            timestamp: Date.now(),
            teamId: selectedTeam,
            playerId: selectedPlayer.id
          },
          {
            x: targetPosition.x,
            y: targetPosition.y,
            timestamp: Date.now() + 1,
            teamId: team,
            playerId: player.id
          }
        ]);
      }
      
      // Update current ball holder
      setCurrentBallHolder({
        player,
        team
      });
      
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
      
      // Update current ball holder
      setCurrentBallHolder({
        player,
        team
      });
      
      // Update ball history with this position
      const position = combinedPositions[player.id] || { x: 0.5, y: 0.5 };
      setBallPositionHistory([...ballPositionHistory, {
        x: position.x,
        y: position.y,
        timestamp: Date.now(),
        teamId: team,
        playerId: player.id
      }]);
    }
  };
  
  const handleActionClick = (action: EventType, additionalData?: Record<string, any>) => {
    if (!selectedPlayer) return;
    
    setSelectedAction(action);
    
    // Get player position from teamPositions or default to center of field
    const position = combinedPositions[selectedPlayer.id] || { x: 0.5, y: 0.5 };
    
    // Record the event
    onRecordEvent(action, selectedPlayer.id, selectedTeam, position);
    
    // Update ball tracking for certain actions
    if (action === 'shot' || action === 'goal') {
      // For shots and goals, ball moves toward the goal
      const targetY = selectedTeam === 'home' ? 0.05 : 0.95;
      setBallPositionHistory([
        ...ballPositionHistory,
        {
          x: position.x,
          y: position.y,
          timestamp: Date.now(),
          teamId: selectedTeam,
          playerId: selectedPlayer.id
        },
        {
          x: position.x,
          y: targetY,
          timestamp: Date.now() + 1,
          teamId: selectedTeam,
          playerId: selectedPlayer.id
        }
      ]);
      
      // If it's a goal, ball is in the net
      if (action === 'goal') {
        setCurrentBallHolder(null); // Ball is in the net
      }
    }
    
    // Reset selection after recording
    setSelectedAction(null);
    setShowActionCircle(false);
  };
  
  const handleUndoAction = () => {
    // Remove last ball position
    if (ballPositionHistory.length > 0) {
      setBallPositionHistory(ballPositionHistory.slice(0, -1));
    }
    
    // Reset current ball holder to previous player if possible
    if (ballPositionHistory.length > 1) {
      const previousPoint = ballPositionHistory[ballPositionHistory.length - 2];
      const team = previousPoint.teamId as 'home' | 'away';
      const players = team === 'home' ? homeTeam.players : awayTeam.players;
      const player = players.find(p => p.id === previousPoint.playerId);
      
      if (player) {
        setCurrentBallHolder({ player, team });
        setSelectedPlayer(player);
        setSelectedTeam(team);
      }
    } else {
      setCurrentBallHolder(null);
    }
    
    // Remove last interception if there are any
    if (interceptions.length > 0) {
      setInterceptions(interceptions.slice(0, -1));
    }
    
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
  
  // Get current ball position for display
  const currentBallPosition = ballPositionHistory.length > 0 ? 
    ballPositionHistory[ballPositionHistory.length - 1] : null;
  
  // Find the last few positions to show the path
  const lastPositions = ballPositionHistory.length > 5 ? 
    ballPositionHistory.slice(-5) : ballPositionHistory;
  
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
                {/* Render home team players */}
                {homeTeam.players.map((player) => (
                  <PlayerMarker
                    key={`home-${player.id}`}
                    player={player}
                    teamColor="#1A365D" // Home team color
                    position={combinedPositions[player.id] || { x: 0.5, y: 0.9 }}
                    onClick={() => handleSelectPlayer(player, 'home')}
                    selected={selectedPlayer?.id === player.id && selectedTeam === 'home'}
                    hasBall={currentBallHolder?.player.id === player.id && currentBallHolder?.team === 'home'}
                  />
                ))}
                
                {/* Render away team players */}
                {awayTeam.players.map((player) => (
                  <PlayerMarker
                    key={`away-${player.id}`}
                    player={player}
                    teamColor="#D3212C" // Away team color
                    position={combinedPositions[player.id] || { x: 0.5, y: 0.1 }}
                    onClick={() => handleSelectPlayer(player, 'away')}
                    selected={selectedPlayer?.id === player.id && selectedTeam === 'away'}
                    hasBall={currentBallHolder?.player.id === player.id && currentBallHolder?.team === 'away'}
                  />
                ))}

                {/* Ball path history */}
                {lastPositions.length > 1 && (
                  <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                    <defs>
                      <marker 
                        id="arrowhead" 
                        markerWidth="10" 
                        markerHeight="7" 
                        refX="0" 
                        refY="3.5" 
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.8)" />
                      </marker>
                    </defs>
                    <path 
                      d={`M ${lastPositions.map(p => `${p.x * 100}% ${p.y * 100}%`).join(' L ')}`}
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="5,5"
                      markerEnd="url(#arrowhead)"
                    />
                  </svg>
                )}

                {/* Render interception markers */}
                {interceptions.map((interception, index) => (
                  <div 
                    key={`interception-${index}`}
                    className="absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 z-30"
                    style={{
                      left: `${interception.position.x * 100}%`,
                      top: `${interception.position.y * 100}%`,
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <X 
                        className="text-red-500 stroke-[3px]" 
                        size={24}
                      />
                      <div className="absolute inset-0 bg-red-500 rounded-full opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                ))}

                {/* Current ball position */}
                {currentBallHolder && (
                  <div
                    className="absolute w-4 h-4 bg-white border-2 border-black rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 shadow-md"
                    style={{
                      left: `${(combinedPositions[currentBallHolder.player.id]?.x || 0.5) * 100}%`,
                      top: `${(combinedPositions[currentBallHolder.player.id]?.y || 0.5) * 100}%`,
                      animation: 'ball-pulse 1s infinite',
                    }}
                  />
                )}
              </FootballPitch>
              
              <style jsx>{`
                @keyframes ball-pulse {
                  0% { transform: translate(-50%, -50%) scale(1); }
                  50% { transform: translate(-50%, -50%) scale(1.2); }
                  100% { transform: translate(-50%, -50%) scale(1); }
                }
              `}</style>
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
            
            {/* Undo button */}
            <div className="mt-2 mb-2">
              <Button 
                variant="outline" 
                onClick={handleUndoAction}
                className="w-full border-amber-500 text-amber-800 hover:bg-amber-50"
              >
                <RotateCw className="mr-2 h-4 w-4" /> Annuler dernière action
              </Button>
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
