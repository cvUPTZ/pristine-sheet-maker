import React, { useState, useEffect } from 'react';
import { Player, EventType } from '@/types'; // Removed BallTrackingPoint as it's not used directly
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
  onRecordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: {
    x: number;
    y: number;
  }) => void;
  teamPositions?: Record<number, {
    x: number;
    y: number;
  }>;
  selectedTeam?: 'home' | 'away';
  setSelectedTeam?: (team: 'home' | 'away') => void;
  compact?: boolean; 
  ballPathHistory?: BallPath[]; // From useMatchState via MatchAnalysis
  onRecordPass?: (passer: Player, receiver: Player, passerTeamIdStr: 'home' | 'away', receiverTeamIdStr: 'home' | 'away', passerCoords: {x: number, y: number}, receiverCoords: {x: number, y: number}) => void;
}

// Assuming BallPath is imported or defined elsewhere (e.g., in types/index.ts or directly in useMatchState)
// For this context, if not globally defined, we might need a local reference or import.
// Let's assume it's available globally for now or imported from '@/types' or '@/hooks/useMatchState'
import { BallPath } from '@/hooks/useMatchState'; // Or from '@/types' if moved there
import { useToast } from '@/components/ui/use-toast'; // Import useToast

interface PlayerEventPair {
  player: Player;
  teamId: 'home' | 'away';
  eventType: EventType;
}

// Define event types with colors and descriptions
const eventTypes: Record<EventType, {
  color: string;
  description: string;
}> = {
  pass: {
    color: "bg-blue-500",
    description: "Pass"
  },
  shot: {
    color: "bg-red-500",
    description: "Shot"
  },
  tackle: {
    color: "bg-green-500",
    description: "Tackle"
  },
  foul: {
    color: "bg-yellow-500",
    description: "Foul"
  },
  corner: {
    color: "bg-indigo-500",
    description: "Corner"
  },
  offside: {
    color: "bg-orange-500",
    description: "Offside"
  },
  goal: {
    color: "bg-emerald-500",
    description: "Goal"
  },
  assist: {
    color: "bg-purple-500",
    description: "Assist"
  },
  yellowCard: {
    color: "bg-yellow-400",
    description: "Yellow Card"
  },
  redCard: {
    color: "bg-red-600",
    description: "Red Card"
  },
  substitution: {
    color: "bg-green-400",
    description: "Substitution"
  },
  card: {
    color: "bg-yellow-300",
    description: "Card"
  },
  penalty: {
    color: "bg-red-400",
    description: "Penalty"
  },
  "free-kick": {
    color: "bg-cyan-500",
    description: "Free Kick"
  },
  "goal-kick": {
    color: "bg-teal-500",
    description: "Goal Kick"
  },
  "throw-in": {
    color: "bg-sky-500",
    description: "Throw-in"
  },
  interception: {
    color: "bg-amber-500",
    description: "Interception"
  }
};

// Group actions by categories for better organization
const ACTION_CATEGORIES = {
  'Attack': ['pass', 'shot', 'goal', 'assist'],
  'Defense': ['tackle', 'interception'],
  'Set Pieces': ['corner', 'free-kick', 'goal-kick', 'throw-in', 'penalty'],
  'Violations': ['foul', 'offside', 'yellowCard', 'redCard'],
  'Other': ['substitution']
};

const PianoInput: React.FC<PianoInputProps> = ({
  homeTeam,
  awayTeam,
  onRecordEvent,
  teamPositions = {},
  selectedTeam = 'home',
  setSelectedTeam = () => {},
  compact = false,
  ballPathHistory = [], // Default to empty array if not provided
  onRecordPass
}) => {
  const { toast } = useToast(); // Initialize useToast
  const [activeTab, setActiveTab] = useState<'home' | 'away'>(selectedTeam);
  const [selectedEventType, setSelectedEventType] = useState<EventType>('pass');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [eventSequence, setEventSequence] = useState<PlayerEventPair[]>([]);
  const [ballPosition, setBallPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [animateBall, setAnimateBall] = useState(false);
  const [lastRecordTime, setLastRecordTime] = useState(0); // For debounce

  const DEBOUNCE_DELAY = 200; // 200ms debounce

  // Local ballHistory is removed, will use ballPathHistory prop

  // Current player with the ball
  const [currentBallHolder, setCurrentBallHolder] = useState<{
    player: Player;
    teamId: 'home' | 'away';
    since: number;
  } | null>(null);

  // Intercepted ball paths
  const [interceptedPaths, setInterceptedPaths] = useState<{
    point: {
      x: number;
      y: number;
    };
    timestamp: number;
  }[]>([]);

  // Generate player positions based on formations
  const homePositions = getPlayerPositions(homeTeam, true);
  const awayPositions = getPlayerPositions(awayTeam, false);

  // Combine with any provided positions from props
  const combinedPositions = {
    ...homePositions,
    ...awayPositions,
    ...teamPositions
  };

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
  const handlePlayerSelect = (player: Player, teamId: 'home' | 'away', coordinates: {
    x: number;
    y: number;
  }) => {
    const now = Date.now();
    if (now - lastRecordTime < DEBOUNCE_DELAY) {
      console.log("PianoInput: Debounced player select action.");
      return;
    }
    setLastRecordTime(now);

    // Don't allow event recording without selecting an event type
    if (!selectedEventType) return;
    setSelectedPlayer(player);

    // Determine if this is an interception based on current ball holder
    let isInterception = false;
    if (currentBallHolder && currentBallHolder.teamId !== teamId && (selectedEventType === 'interception' || selectedEventType === 'tackle')) {
      isInterception = true;
      const interceptPosition = {
        x: (combinedPositions[currentBallHolder.player.id]?.x + coordinates.x) / 2,
        y: (combinedPositions[currentBallHolder.player.id]?.y + coordinates.y) / 2
      };
      setInterceptedPaths([...interceptedPaths, {
        point: interceptPosition,
        timestamp: Date.now()
      }]);
      // For interception, still call onRecordEvent for the interception itself
      onRecordEvent(selectedEventType, player.id, teamId, coordinates);
    }

    // If it's a pass and onRecordPass is available, use it.
    if (selectedEventType === 'pass' && onRecordPass && currentBallHolder) {
      const passer = currentBallHolder.player;
      const receiver = player; // The clicked player is the receiver
      const passerTeamIdStr = currentBallHolder.teamId;
      const receiverTeamIdStr = teamId;
      const passerCoords = combinedPositions[passer.id] || { x: 0.5, y: 0.5 };
      const receiverCoords = coordinates; // Receiver's coordinates are the event coordinates

      onRecordPass(passer, receiver, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords);
      toast({
        title: "Pass Recorded (Piano)",
        description: `Pass from ${passer.name} to ${receiver.name}`,
      });
      // The onRecordEvent for 'pass' is skipped here as recordPass handles event creation & stats.
    } else if (selectedEventType !== 'pass' || !onRecordPass) { 
      // For non-pass events, or if onRecordPass is not provided (fallback), use onRecordEvent.
      // This also handles the case where selectedEventType is 'pass' but currentBallHolder is null (e.g., first touch)
      onRecordEvent(selectedEventType, player.id, teamId, coordinates);
    }
    
    // Add to local event sequence for UI display (this is fine)
    setEventSequence([...eventSequence, {
      player,
      teamId,
      eventType: selectedEventType
    }]);

    // Update ball position for animation (this is fine)
    setBallPosition(coordinates);
    setAnimateBall(true);

    // Local ballHistory update is removed. Central ballPathHistory is used for rendering.

    // Update current ball holder (player who was just clicked, i.e., the receiver or active player)
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
      setInterceptedPaths(prev => prev.filter(path => now - path.timestamp < 5000));
    };
    const timer = setInterval(cleanup, 1000);
    return () => clearInterval(timer);
  }, []);

  // Function to handle pitch click for mobile use
  const handlePitchClick = (coordinates: {
    x: number;
    y: number;
  }) => {
    // Handle click on the pitch itself (for mobile use)
  };
  
  // Use a simplified handleEventSelect function for PianoInput's context
  const handleEventSelect = (eventType: EventType, player: Player, coordinates: { x: number; y: number }) => {
    const now = Date.now();
    if (now - lastRecordTime < DEBOUNCE_DELAY) {
      console.log("PianoInput: Debounced event select action from circular menu.");
      return;
    }
    setLastRecordTime(now);
    
    // Option: If you want the main panel's selected event type to also update when an event is chosen from circular menu:
    // setSelectedEventType(eventType); 

    setSelectedPlayer(player); // Still useful to highlight the player

    // Note: The original code for handleEventSelect had `onRecordEvent` called twice if it wasn't a pass.
    // This was likely a bug from previous refactoring. Correcting it here.
    // The logic should be: if it's a pass and onRecordPass is available, use it. Otherwise, use onRecordEvent.

    // Add to event sequence using the eventType from the circular menu
    setEventSequence(prev => [...prev, {
      player,
      teamId: activeTab as 'home' | 'away',
      eventType: eventType 
    }]);

    setBallPosition(coordinates);
    setAnimateBall(true);

    // If it's a pass from circular menu and onRecordPass is available
    if (eventType === 'pass' && onRecordPass && currentBallHolder) {
        const passer = currentBallHolder.player;
        const receiver = player; // Player from menu is receiver
        const passerTeamIdStr = currentBallHolder.teamId;
        const receiverTeamIdStr = activeTab as 'home' | 'away'; // Team of the currently active tab
        const passerCoords = combinedPositions[passer.id] || { x: 0.5, y: 0.5 };
        const receiverCoords = coordinates; // Coordinates from menu click

        onRecordPass(passer, receiver, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords);
        toast({
            title: "Pass Recorded (Piano Menu)",
            description: `Pass from ${passer.name} to ${receiver.name}`,
        });
        // The onRecordEvent for 'pass' is skipped here because recordPass in useMatchState handles the event creation.
    } else { 
        // For non-pass events from circular menu, or if onRecordPass is not provided (fallback for pass)
        // The onRecordEvent call here will trigger the toast from MatchAnalysis.handlePianoEvent
        onRecordEvent(eventType, player.id, activeTab as 'home' | 'away', coordinates);
    }
    
    // Local ballHistory update is removed. Central ballPathHistory is used for rendering.

    // Update current ball holder (player who was just clicked, i.e., the receiver or active player)
    setCurrentBallHolder({
      player,
      teamId: activeTab as 'home' | 'away',
      since: Date.now()
    });

    // Reset animation state after animation completes
    setTimeout(() => {
      setAnimateBall(false);
    }, 500);
  };
  
  return <div className="w-full">
      <Card className={`${compact ? "h-full" : ""}`}>
        <CardHeader className={`${compact ? "pb-2" : "pb-6"}`}>
          <CardTitle className={`${compact ? "text-lg" : "text-xl"} flex items-center justify-between`}>
            <span>Event Piano</span>
            {compact && <span className="text-xs text-muted-foreground">
                Select player and event type
              </span>}
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

              {/* Event type selection - THIS WAS MISSING */}
              <div className="border rounded-md p-2 overflow-y-auto">
                <h3 className="font-medium mb-1 text-sm">Event Type</h3>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(eventTypes).map(([type, info]) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={selectedEventType === type ? "default" : "outline"}
                      className={`text-xs h-8 ${selectedEventType === type ? info.color : ""}`}
                      onClick={() => handleEventTypeSelect(type as EventType)}
                    >
                      {info.description}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Recent events log (only show in non-compact mode) */}
              {!compact && <div className="border rounded-md p-2 h-36 overflow-y-auto">
                  <h3 className="font-medium mb-1 text-sm">Recent Events</h3>
                  {eventSequence.length === 0 ? <p className="text-xs text-muted-foreground">No events recorded yet</p> : <ul className="space-y-1">
                      {[...eventSequence].reverse().slice(0, 5).map((event, idx) => <li key={idx} className="text-xs border-b pb-1 flex justify-between">
                          <span className="font-medium">
                            {event.player.name} ({event.teamId})
                          </span>
                          <span className={`px-1.5 rounded-full text-white ${eventTypes[event.eventType]?.color}`}>
                            {eventTypes[event.eventType]?.description}
                          </span>
                        </li>)}
                    </ul>}
                </div>}
            </div>

            {/* Right column - Player selection and visualization */}
            <div className={`${compact ? "w-full mt-2" : "w-2/3"}`}>
              {/* Pitch with player positions */}
              <div className="relative">
                <FootballPitch onClick={handlePitchClick} className={`${compact ? "h-[30vh]" : "h-[45vh]"} w-full`}>
                  {/* Home team players */}
                  {activeTab === 'home' && homeTeam.players.map(player => <PlayerMarker 
                    key={`home-${player.id}`} 
                    player={player} 
                    teamColor="#1A365D" 
                    position={combinedPositions[player.id] || { x: 0.5, y: 0.9 }} 
                    onClick={() => handlePlayerSelect(player, 'home', combinedPositions[player.id] || { x: 0.5, y: 0.9 })} 
                    selected={selectedPlayer?.id === player.id} 
                    hasBall={currentBallHolder?.player.id === player.id && currentBallHolder?.teamId === 'home'}
                    onEventSelect={handleEventSelect}
                    allowCircularMenu={true} // Always allow circular menu in piano tab
                  />)}
                  
                  {/* Away team players */}
                  {activeTab === 'away' && awayTeam.players.map(player => <PlayerMarker 
                    key={`away-${player.id}`} 
                    player={player} 
                    teamColor="#D3212C" 
                    position={combinedPositions[player.id] || { x: 0.5, y: 0.1 }} 
                    onClick={() => handlePlayerSelect(player, 'away', combinedPositions[player.id] || { x: 0.5, y: 0.1 })} 
                    selected={selectedPlayer?.id === player.id} 
                    hasBall={currentBallHolder?.player.id === player.id && currentBallHolder?.teamId === 'away'}
                    onEventSelect={handleEventSelect}
                    allowCircularMenu={true} // Always allow circular menu in piano tab
                  />)}
                  
                  {/* Ball movement history - draw lines between players using ballPathHistory prop */}
                  {ballPathHistory.slice(-5).map((pathItem, index) => {
                  const { startCoordinates, endCoordinates, eventType } = pathItem;
                  
                  // Check if this path was intercepted - This logic might need adjustment
                  // if interceptions are marked differently or not directly on BallPath items.
                  // For now, we assume interception check might be based on eventType or a separate mechanism.
                  // Let's simplify and assume wasIntercepted is false for now, or rely on eventType if it's 'interception'.
                  const wasIntercepted = interceptedPaths.some(path => 
                    Math.abs(path.point.x - endCoordinates.x) < 0.1 && 
                    Math.abs(path.point.y - endCoordinates.y) < 0.1
                  );

                  return <React.Fragment key={pathItem.id}>
                        {/* Draw the path line */}
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{
                      zIndex: 5
                    }}>
                          <line 
                            x1={`${startCoordinates.x * 100}%`} y1={`${startCoordinates.y * 100}%`} 
                            x2={`${endCoordinates.x * 100}%`} y2={`${endCoordinates.y * 100}%`} 
                            stroke={wasIntercepted ? "#ff3333" : "#ffffff"} 
                            strokeWidth="2" 
                            strokeDasharray={wasIntercepted ? "5,5" : index === ballPathHistory.length - 1 ? "none" : "5,5"} 
                            opacity={0.7 - 0.1 * (ballPathHistory.length - index - 1)} 
                          />
                        </svg>
                      </React.Fragment>;
                })}
                  
                  {/* Interception markers */}
                  {interceptedPaths.map((path, idx) => <div key={`intercept-${idx}`} className="absolute w-4 h-4 transform -translate-x-1/2 -translate-y-1/2 z-15" style={{
                  left: `${path.point.x * 100}%`,
                  top: `${path.point.y * 100}%`
                }}>
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M2 2L14 14M2 14L14 2" stroke="#ff3333" strokeWidth="3" />
                      </svg>
                    </div>)}
                  
                  {/* Current ball position */}
                  {currentBallHolder && <div className="absolute w-4 h-4 bg-white border-2 border-black rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 shadow-md ball-pulse" style={{
                  left: `${(combinedPositions[currentBallHolder.player.id]?.x || 0.5) * 100}%`,
                  top: `${(combinedPositions[currentBallHolder.player.id]?.y || 0.5) * 100}%`
                }} />}
                </FootballPitch>
              </div>
              
              {/* Player selection info */}
              {!compact && selectedPlayer && <div className="mt-2 p-2 bg-gray-100 rounded-md">
                  <p className="text-sm font-medium">
                    Selected: {selectedPlayer.name} (#{selectedPlayer.number})
                    <span className={`ml-2 px-2 py-0.5 rounded-full ${activeTab === 'home' ? 'bg-football-home' : 'bg-football-away'} text-white text-xs`}>
                      {activeTab === 'home' ? homeTeam.name : awayTeam.name}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click a player to record a {eventTypes[selectedEventType]?.description} event
                  </p>
                </div>}
            </div>
          </div>

          {/* Player grid (only in compact mode) */}
          {compact && <div className="mt-2">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-[20vh] overflow-y-auto pb-2">
                {activeTab === 'home' ? homeTeam.players.map(player => <Button key={`player-btn-${player.id}`} size="sm" variant={selectedPlayer?.id === player.id ? "default" : "outline"} className={`${selectedPlayer?.id === player.id ? "bg-football-home text-white" : ""} text-xs flex flex-col h-auto py-1`} onClick={() => handlePlayerSelect(player, 'home', combinedPositions[player.id] || { x: 0.5, y: 0.9 })}>
                      <span className="font-bold">{player.number}</span>
                      <span className="truncate">{player.name}</span>
                    </Button>) : awayTeam.players.map(player => <Button key={`player-btn-${player.id}`} size="sm" variant={selectedPlayer?.id === player.id ? "default" : "outline"} className={`${selectedPlayer?.id === player.id ? "bg-football-away text-white" : ""} text-xs flex flex-col h-auto py-1`} onClick={() => handlePlayerSelect(player, 'away', combinedPositions[player.id] || { x: 0.5, y: 0.1 })}>
                      <span className="font-bold">{player.number}</span>
                      <span className="truncate">{player.name}</span>
                    </Button>)}
              </div>
            </div>}
          
          {/* Legend (only in non-compact mode) */}
          {!compact && <div className="mt-4 flex flex-wrap gap-1 text-xs items-center">
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
            </div>}
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
    </div>;
};
export default PianoInput;
