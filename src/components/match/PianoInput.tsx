import React, { useState, useEffect } from 'react';
import { Player, EventType, BallTrackingPoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FootballPitch from '../FootballPitch';
import PlayerMarker from '../PlayerMarker';
import { getPlayerPositions } from '@/utils/formationUtils';

interface PianoInputProps {
  homeTeam: {
    name: string;
    players: Player[];
    formation?: string;
  };
  awayTeam: {
    name: string;
    players: Player[];
    formation?: string;
  };
  onRecordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => void;
  teamPositions?: Record<number, { x: number; y: number }>;
  selectedTeam?: 'home' | 'away';
  setSelectedTeam?: (team: 'home' | 'away') => void;
  compact?: boolean; // New prop to support compact mode when displayed alongside the pitch
}

interface PlayerEventPair {
  player: Player;
  teamId: 'home' | 'away';
  eventType: EventType;
}

// Define event types with colors and descriptions
const eventTypes: Record<EventType, { color: string; description: string }> = {
  pass: { color: "bg-blue-500", description: "Pass" },
  shot: { color: "bg-red-500", description: "Shot" },
  tackle: { color: "bg-green-500", description: "Tackle" },
  foul: { color: "bg-yellow-500", description: "Foul" },
  corner: { color: "bg-indigo-500", description: "Corner" },
  offside: { color: "bg-orange-500", description: "Offside" },
  goal: { color: "bg-emerald-500", description: "Goal" },
  assist: { color: "bg-purple-500", description: "Assist" },
  yellowCard: { color: "bg-yellow-400", description: "Yellow Card" },
  redCard: { color: "bg-red-600", description: "Red Card" },
  substitution: { color: "bg-green-400", description: "Substitution" },
  card: { color: "bg-yellow-300", description: "Card" },
  penalty: { color: "bg-red-400", description: "Penalty" },
  "free-kick": { color: "bg-cyan-500", description: "Free Kick" },
  "goal-kick": { color: "bg-teal-500", description: "Goal Kick" },
  "throw-in": { color: "bg-sky-500", description: "Throw-in" },
  interception: { color: "bg-amber-500", description: "Interception" }
};

const PianoInput: React.FC<PianoInputProps> = ({
  homeTeam,
  awayTeam,
  onRecordEvent,
  teamPositions = {},
  selectedTeam = 'home',
  setSelectedTeam = () => {},
  compact = false
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'away'>(selectedTeam);
  const [selectedEventType, setSelectedEventType] = useState<EventType>('pass');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [eventSequence, setEventSequence] = useState<PlayerEventPair[]>([]);
  const [ballPosition, setBallPosition] = useState<{x: number, y: number} | null>(null);
  const [animateBall, setAnimateBall] = useState(false);
  
  // Track ball movement history
  const [ballHistory, setBallHistory] = useState<{
    fromPlayer: { id: number; teamId: 'home' | 'away' },
    toPlayer: { id: number; teamId: 'home' | 'away' },
    coordinates: { start: { x: number, y: number }, end: { x: number, y: number } },
    eventType: EventType
  }[]>([]);
  
  // Current player with the ball
  const [currentBallHolder, setCurrentBallHolder] = useState<{
    player: Player;
    teamId: 'home' | 'away';
    since: number;
  } | null>(null);
  
  // Intercepted ball paths
  const [interceptedPaths, setInterceptedPaths] = useState<{
    point: {x: number, y: number},
    timestamp: number
  }[]>([]);

  // Generate player positions based on formations
  const homePositions = getPlayerPositions(homeTeam, true);
  const awayPositions = getPlayerPositions(awayTeam, false);
  
  // Combine with any provided positions from props
  const combinedPositions = { ...homePositions, ...awayPositions, ...teamPositions };
  
  // Keep track of the active team
  useEffect(() => {
    setActiveTab(selectedTeam);
  }, [selectedTeam]);

  const handleTeamTabChange = (value: string) => {
    const team = value as 'home' | 'away';
    setActiveTab(team);
    setSelectedTeam(team);
    setSelectedPlayer(null);
  };

  const handleEventTypeSelect = (eventType: EventType) => {
    setSelectedEventType(eventType);
  };

  const handlePlayerSelect = (player: Player, teamId: 'home' | 'away', coordinates: {x: number, y: number}) => {
    // Don't allow event recording without selecting an event type
    if (!selectedEventType) return;
    
    setSelectedPlayer(player);
    
    // Determine if this is an interception based on current ball holder
    let isInterception = false;
    if (currentBallHolder && 
        currentBallHolder.teamId !== teamId && 
        (selectedEventType === 'interception' || selectedEventType === 'tackle')) {
      isInterception = true;
      
      const interceptPosition = {
        x: (combinedPositions[currentBallHolder.player.id]?.x + coordinates.x) / 2,
        y: (combinedPositions[currentBallHolder.player.id]?.y + coordinates.y) / 2
      };
      
      setInterceptedPaths([...interceptedPaths, {
        point: interceptPosition,
        timestamp: Date.now()
      }]);
    }
    
    // Record the event
    onRecordEvent(selectedEventType, player.id, teamId, coordinates);
    
    // Add to event sequence
    setEventSequence([...eventSequence, {
      player,
      teamId,
      eventType: selectedEventType
    }]);

    // Update ball position
    setBallPosition(coordinates);
    setAnimateBall(true);
    
    // If we have a previous ball holder, record the ball movement
    if (currentBallHolder) {
      const startPos = combinedPositions[currentBallHolder.player.id] || { x: 0.5, y: 0.5 };
      
      setBallHistory([...ballHistory, {
        fromPlayer: {
          id: currentBallHolder.player.id,
          teamId: currentBallHolder.teamId
        },
        toPlayer: {
          id: player.id,
          teamId
        },
        coordinates: {
          start: { x: startPos.x, y: startPos.y },
          end: { x: coordinates.x, y: coordinates.y }
        },
        eventType: selectedEventType
      }]);
    }
    
    // Update current ball holder
    setCurrentBallHolder({
      player,
      teamId,
      since: Date.now()
    });
    
    // Reset animation state after animation completes
    setTimeout(() => {
      setAnimateBall(false);
    }, 500);
  };

  // Clean up old intercepted paths (older than 5 seconds)
  useEffect(() => {
    const now = Date.now();
    const cleanup = () => {
      setInterceptedPaths(prev => 
        prev.filter(path => now - path.timestamp < 5000)
      );
    };
    
    const timer = setInterval(cleanup, 1000);
    return () => clearInterval(timer);
  }, []);

  // Function to handle pitch click for mobile use
  const handlePitchClick = (coordinates: { x: number; y: number }) => {
    // Handle click on the pitch itself (for mobile use)
  };

  return (
    <div className="w-full">
      <Card className={`${compact ? "h-full" : ""}`}>
        <CardHeader className={`${compact ? "pb-2" : "pb-6"}`}>
          <CardTitle className={`${compact ? "text-lg" : "text-xl"} flex items-center justify-between`}>
            <span>Event Piano</span>
            {compact && (
              <span className="text-xs text-muted-foreground">
                Select player and event type
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-0 pt-0">
          <div className={`flex ${compact ? "flex-col" : "space-x-4"}`}>
            {/* Left column */}
            <div className={`${compact ? "w-full" : "w-1/3"} space-y-4`}>
              {/* Team selection */}
              <Tabs value={activeTab} onValueChange={handleTeamTabChange} className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="home" className="text-football-home">
                    {homeTeam.name}
                  </TabsTrigger>
                  <TabsTrigger value="away" className="text-football-away">
                    {awayTeam.name}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Event type selection */}
              <div className={`grid ${compact ? "grid-cols-2 gap-1" : "grid-cols-3 gap-2"}`}>
                {Object.entries(eventTypes).map(([type, { color, description }]) => (
                  <Button
                    key={type}
                    variant={selectedEventType === type ? "default" : "outline"}
                    size={compact ? "sm" : "default"}
                    className={`${selectedEventType === type ? color + " text-white" : ""}`}
                    onClick={() => handleEventTypeSelect(type as EventType)}
                  >
                    {description}
                  </Button>
                ))}
              </div>

              {/* Recent events log (only show in non-compact mode) */}
              {!compact && (
                <div className="border rounded-md p-2 h-36 overflow-y-auto">
                  <h3 className="font-medium mb-1 text-sm">Recent Events</h3>
                  {eventSequence.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No events recorded yet</p>
                  ) : (
                    <ul className="space-y-1">
                      {[...eventSequence].reverse().slice(0, 5).map((event, idx) => (
                        <li key={idx} className="text-xs border-b pb-1 flex justify-between">
                          <span className="font-medium">
                            {event.player.name} ({event.teamId})
                          </span>
                          <span className={`px-1.5 rounded-full text-white ${eventTypes[event.eventType]?.color}`}>
                            {eventTypes[event.eventType]?.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Right column - Player selection and visualization */}
            <div className={`${compact ? "w-full mt-2" : "w-2/3"}`}>
              {/* Pitch with player positions */}
              <div className="relative">
                <FootballPitch 
                  onClick={handlePitchClick}
                  className={`${compact ? "h-[30vh]" : "h-[45vh]"} w-full`}
                >
                  {/* Home team players */}
                  {activeTab === 'home' && homeTeam.players.map((player) => (
                    <PlayerMarker
                      key={`home-${player.id}`}
                      player={player}
                      teamColor="#1A365D"
                      position={combinedPositions[player.id] || { x: 0.5, y: 0.9 }}
                      onClick={() => handlePlayerSelect(
                        player, 
                        'home',
                        combinedPositions[player.id] || { x: 0.5, y: 0.9 }
                      )}
                      selected={selectedPlayer?.id === player.id}
                      hasBall={currentBallHolder?.player.id === player.id && currentBallHolder?.teamId === 'home'}
                    />
                  ))}
                  
                  {/* Away team players */}
                  {activeTab === 'away' && awayTeam.players.map((player) => (
                    <PlayerMarker
                      key={`away-${player.id}`}
                      player={player}
                      teamColor="#D3212C"
                      position={combinedPositions[player.id] || { x: 0.5, y: 0.1 }}
                      onClick={() => handlePlayerSelect(
                        player,
                        'away',
                        combinedPositions[player.id] || { x: 0.5, y: 0.1 }
                      )}
                      selected={selectedPlayer?.id === player.id}
                      hasBall={currentBallHolder?.player.id === player.id && currentBallHolder?.teamId === 'away'}
                    />
                  ))}
                  
                  {/* Ball movement history - draw lines between players */}
                  {ballHistory.slice(-5).map((historyItem, index) => {
                    const { start, end } = historyItem.coordinates;
                    
                    // Check if this path was intercepted
                    const wasIntercepted = interceptedPaths.some(path => 
                      Math.abs(path.point.x - end.x) < 0.1 && 
                      Math.abs(path.point.y - end.y) < 0.1
                    );
                    
                    return (
                      <React.Fragment key={`history-${index}`}>
                        {/* Draw the path line */}
                        <svg 
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          style={{ zIndex: 5 }}
                        >
                          <line 
                            x1={`${start.x * 100}%`} 
                            y1={`${start.y * 100}%`} 
                            x2={`${end.x * 100}%`} 
                            y2={`${end.y * 100}%`} 
                            stroke={wasIntercepted ? "#ff3333" : "#ffffff"} 
                            strokeWidth="2" 
                            strokeDasharray={wasIntercepted ? "5,5" : index === ballHistory.length - 1 ? "none" : "5,5"} 
                            opacity={0.7 - (0.1 * (ballHistory.length - index - 1))} 
                          />
                        </svg>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Interception markers */}
                  {interceptedPaths.map((path, idx) => (
                    <div 
                      key={`intercept-${idx}`}
                      className="absolute w-4 h-4 transform -translate-x-1/2 -translate-y-1/2 z-15"
                      style={{
                        left: `${path.point.x * 100}%`,
                        top: `${path.point.y * 100}%`,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M2 2L14 14M2 14L14 2" stroke="#ff3333" strokeWidth="3" />
                      </svg>
                    </div>
                  ))}
                  
                  {/* Current ball position */}
                  {currentBallHolder && (
                    <div
                      className="absolute w-4 h-4 bg-white border-2 border-black rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 shadow-md ball-pulse"
                      style={{
                        left: `${(combinedPositions[currentBallHolder.player.id]?.x || 0.5) * 100}%`,
                        top: `${(combinedPositions[currentBallHolder.player.id]?.y || 0.5) * 100}%`,
                      }}
                    />
                  )}
                </FootballPitch>
              </div>
              
              {/* Player selection info */}
              {!compact && selectedPlayer && (
                <div className="mt-2 p-2 bg-gray-100 rounded-md">
                  <p className="text-sm font-medium">
                    Selected: {selectedPlayer.name} (#{selectedPlayer.number})
                    <span className={`ml-2 px-2 py-0.5 rounded-full ${
                      activeTab === 'home' ? 'bg-football-home' : 'bg-football-away'
                    } text-white text-xs`}>
                      {activeTab === 'home' ? homeTeam.name : awayTeam.name}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click a player to record a {eventTypes[selectedEventType]?.description} event
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Player grid (only in compact mode) */}
          {compact && (
            <div className="mt-2">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-[20vh] overflow-y-auto pb-2">
                {activeTab === 'home' ? 
                  homeTeam.players.map((player) => (
                    <Button 
                      key={`player-btn-${player.id}`}
                      size="sm"
                      variant={selectedPlayer?.id === player.id ? "default" : "outline"}
                      className={`${selectedPlayer?.id === player.id ? "bg-football-home text-white" : ""} text-xs flex flex-col h-auto py-1`}
                      onClick={() => handlePlayerSelect(
                        player, 
                        'home',
                        combinedPositions[player.id] || { x: 0.5, y: 0.9 }
                      )}
                    >
                      <span className="font-bold">{player.number}</span>
                      <span className="truncate">{player.name}</span>
                    </Button>
                  )) :
                  awayTeam.players.map((player) => (
                    <Button 
                      key={`player-btn-${player.id}`}
                      size="sm"
                      variant={selectedPlayer?.id === player.id ? "default" : "outline"}
                      className={`${selectedPlayer?.id === player.id ? "bg-football-away text-white" : ""} text-xs flex flex-col h-auto py-1`}
                      onClick={() => handlePlayerSelect(
                        player, 
                        'away',
                        combinedPositions[player.id] || { x: 0.5, y: 0.1 }
                      )}
                    >
                      <span className="font-bold">{player.number}</span>
                      <span className="truncate">{player.name}</span>
                    </Button>
                  ))
                }
              </div>
            </div>
          )}
          
          {/* Legend (only in non-compact mode) */}
          {!compact && (
            <div className="mt-4 flex flex-wrap gap-1 text-xs items-center">
              <span className="font-medium mr-1">Legend:</span>
              <div className="flex items-center">
                <div className="w-3 h-0.5 bg-white"></div>
                <span className="ml-1">Current path</span>
              </div>
              <div className="flex items-center ml-2">
                <div className="w-3 h-0.5 bg-white dashed-line"></div>
                <span className="ml-1">Previous path</span>
              </div>
              <div className="flex items-center ml-2">
                <div className="w-3 h-0.5 bg-red-500 dashed-line"></div>
                <span className="ml-1">Intercepted</span>
              </div>
              <div className="flex items-center ml-2">
                <div className="inline-block w-2 h-2 bg-white border border-black rounded-full"></div>
                <span className="ml-1">Ball</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add the animation styles as a global style using plain CSS */}
      <style>
        {`
          @keyframes ball-pulse {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.2); }
            100% { transform: translate(-50%, -50%) scale(1); }
          }
          
          .ball-pulse {
            animation: ball-pulse 1s infinite;
          }
          
          .dashed-line {
            stroke-dasharray: 5,5;
          }
        `}
      </style>
    </div>
  );
};

export default PianoInput;
