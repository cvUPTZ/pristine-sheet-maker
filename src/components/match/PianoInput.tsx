import React, { useState, useEffect, useCallback } from 'react';
import { Player, EventType } from '@/types';
// import { useAuth } from '@/context/AuthContext'; // No longer directly used for assignedEventTypes
import { EVENT_TYPES } from '@/pages/Admin'; // Import EVENT_TYPES from Admin.tsx (temporary)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FootballPitch from '../FootballPitch';
import PlayerMarker from '../PlayerMarker';
import { getPlayerPositions } from '@/utils/formationUtils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BallPath, MatchEvent } from '@/hooks/useMatchState'; // Or from '@/types' if moved there. Ensure MatchEvent is imported.
import { useToast } from '@/components/ui/use-toast'; 

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
  ballPathHistory?: BallPath[]; 
  onRecordPass?: (passer: Player, receiver: Player, passerTeamIdStr: 'home' | 'away', receiverTeamIdStr: 'home' | 'away', passerCoords: {x: number, y: number}, receiverCoords: {x: number, y: number}) => void;
  matchEvents?: MatchEvent[];
  assignedEventTypes?: string[]; // Prop for assigned event types
  isLoadingAssignedEventTypes?: boolean; // Prop for loading state
}


interface PlayerEventPair {
  player: Player;
  teamId: 'home' | 'away';
  eventType: EventType;
}


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
  ballPathHistory = [], 
  onRecordPass,
  matchEvents = [],
  assignedEventTypes = [], // Default to empty array if not provided
  isLoadingAssignedEventTypes = false // Default to false
}) => {
  const { toast } = useToast(); 
  // const { assignedEventTypes: authAssignedEventTypes } = useAuth(); // Removed direct use

  // useEffect(() => {
  //   console.log("PianoInput: Assigned Event Types from AuthContext:", authAssignedEventTypes);
  //   console.log("PianoInput: All EVENT_TYPES (from Admin.tsx):", EVENT_TYPES);
  // }, [authAssignedEventTypes]);

  // Normalize event names from EVENT_TYPES (e.g., "Pass (P)" -> "pass")
  const normalizeEventType = (eventTypeWithShortcut: string): EventType => {
    const match = eventTypeWithShortcut.match(/^([a-zA-Z\s-]+)/);
    return match ? match[1].trim().toLowerCase().replace(/\s+/g, '-') as EventType : eventTypeWithShortcut.toLowerCase() as EventType;
  };

  const normalizedAssignedEventTypes = React.useMemo(() => {
    if (!assignedEventTypes) return new Set<EventType>();
    return new Set(assignedEventTypes.map(normalizeEventType));
  }, [assignedEventTypes]);


  const EVENT_SHORTCUTS: Record<string, EventType> = {
    'p': 'pass',
    's': 'shot',
    't': 'tackle',
    'f': 'foul',
    'i': 'interception',
    'c': 'corner',
    'g': 'goal',
  };

  const SHORTCUT_KEYS_DISPLAY: Record<EventType, string> = {};
  for (const key in EVENT_SHORTCUTS) {
    SHORTCUT_KEYS_DISPLAY[EVENT_SHORTCUTS[key]] = key.toUpperCase();
  }

  const [activeTab, setActiveTab] = useState<'home' | 'away'>(selectedTeam);
  const [selectedEventType, setSelectedEventType] = useState<EventType>('pass');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [eventSequence, setEventSequence] = useState<PlayerEventPair[]>([]);
  const [ballPosition, setBallPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [animateBall, setAnimateBall] = useState(false);
  const [lastRecordTime, setLastRecordTime] = useState(0); 

  const DEBOUNCE_DELAY = 200; 

  const [currentBallHolder, setCurrentBallHolder] = useState<{
    player: Player;
    teamId: 'home' | 'away';
    since: number;
  } | null>(null);

  const [interceptedPaths, setInterceptedPaths] = useState<{
    point: {
      x: number;
      y: number;
    };
    timestamp: number;
  }[]>([]);

  const homePositions = getPlayerPositions(homeTeam, true);
  const awayPositions = getPlayerPositions(awayTeam, false);

  const combinedPositions = {
    ...homePositions,
    ...awayPositions,
    ...teamPositions
  };

  useEffect(() => {
    setActiveTab(selectedTeam);
  }, [selectedTeam]);
  
  const handleEventTypeSelect = useCallback((eventType: EventType) => {
    setSelectedEventType(eventType);
  }, []);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || 
          (event.target instanceof HTMLInputElement) || 
          (event.target instanceof HTMLTextAreaElement) ||
          (event.target instanceof HTMLSelectElement)) {
        return;
      }

      const keyPressed = event.key.toLowerCase();
      const targetEventType = EVENT_SHORTCUTS[keyPressed];

      if (targetEventType) {
        handleEventTypeSelect(targetEventType);
        event.preventDefault(); 
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleEventTypeSelect]); 

  const handleTeamTabChange = (value: string) => {
    const team = value as 'home' | 'away';
    setActiveTab(team);
    setSelectedTeam(team);
    setSelectedPlayer(null); // Reset selected player when team changes
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

    if (!selectedEventType) return;
    setSelectedPlayer(player);

    let isInterception = false;
    if (currentBallHolder && currentBallHolder.teamId !== teamId && (selectedEventType === 'interception' || selectedEventType === 'tackle')) {
      isInterception = true;
      const interceptPosition = {
        x: (combinedPositions[currentBallHolder.player.id]?.x + coordinates.x) / 2,
        y: (combinedPositions[currentBallHolder.player.id]?.y + coordinates.y) / 2
      };
      setInterceptedPaths(prev => [...prev, {
        point: interceptPosition,
        timestamp: Date.now()
      }]);
      // Record the interception/tackle event
      onRecordEvent(selectedEventType, player.id, teamId, coordinates);
    }

    // Handle pass event
    if (selectedEventType === 'pass' && onRecordPass && currentBallHolder) {
      const passer = currentBallHolder.player;
      const receiver = player;
      const passerTeamIdStr = currentBallHolder.teamId;
      const receiverTeamIdStr = teamId;
      const passerCoords = combinedPositions[passer.id] || { x: 0.5, y: 0.5 };
      const receiverCoords = coordinates;
      
      // Log before calling onRecordPass
      console.log("[PianoInput] About to record pass:", { passer, receiver, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords });
      onRecordPass(passer, receiver, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords);
      toast({
        title: "Pass Recorded (Piano)",
        description: `Pass from ${passer.name} to ${receiver.name}`,
      });
    } else if (selectedEventType !== 'pass' || !onRecordPass) { 
      // Handle non-pass events or if onRecordPass is not available (fallback)
      // Log before calling onRecordEvent
      console.log("[PianoInput] About to record event:", { eventType: selectedEventType, playerId: player.id, teamId, coordinates });
      onRecordEvent(selectedEventType, player.id, teamId, coordinates);
    }
    
    // Update event sequence for UI display
    setEventSequence(prev => [...prev, {
      player,
      teamId,
      eventType: selectedEventType
    }]);

    // Update ball position and animation
    setBallPosition(coordinates);
    setAnimateBall(true);
    setTimeout(() => setAnimateBall(false), 500);

    // Update current ball holder
    setCurrentBallHolder({
      player,
      teamId,
      since: Date.now()
    });
  };

  useEffect(() => {
    const now = Date.now();
    const cleanup = () => {
      setInterceptedPaths(prev => prev.filter(path => now - path.timestamp < 5000));
    };
    const timer = setInterval(cleanup, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePitchClick = (coordinates: {
    x: number;
    y: number;
  }) => {
    // Placeholder for future mobile-specific pitch interactions
    console.log("Pitch clicked at:", coordinates);
  };
  
  const handleEventSelectFromMarker = (eventType: EventType, player: Player, coordinates: { x: number; y: number }) => {
    const now = Date.now();
    if (now - lastRecordTime < DEBOUNCE_DELAY) {
      console.log("PianoInput: Debounced event select action from circular menu.");
      return;
    }
    setLastRecordTime(now);
    
    // setSelectedEventType(eventType); // Optionally sync main panel's event type
    setSelectedPlayer(player);

    setEventSequence(prev => [...prev, {
      player,
      teamId: activeTab as 'home' | 'away',
      eventType: eventType 
    }]);

    setBallPosition(coordinates);
    setAnimateBall(true);
    setTimeout(() => setAnimateBall(false), 500);

    if (eventType === 'pass' && onRecordPass && currentBallHolder) {
        const passer = currentBallHolder.player;
        const receiver = player;
        const passerTeamIdStr = currentBallHolder.teamId;
        const receiverTeamIdStr = activeTab as 'home' | 'away';
        const passerCoords = combinedPositions[passer.id] || { x: 0.5, y: 0.5 };
        const receiverCoords = coordinates;

        // Log before calling onRecordPass from circular menu
        console.log("[PianoInput] About to record pass (circular menu):", { passer, receiver, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords });
        onRecordPass(passer, receiver, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords);
        toast({
            title: "Pass Recorded (Piano Menu)",
            description: `Pass from ${passer.name} to ${receiver.name}`,
        });
    } else { 
        // Log before calling onRecordEvent from circular menu
        console.log("[PianoInput] About to record event (circular menu):", { eventType, playerId: player.id, teamId: activeTab as 'home' | 'away', coordinates });
        onRecordEvent(eventType, player.id, activeTab as 'home' | 'away', coordinates);
    }
    
    setCurrentBallHolder({
      player,
      teamId: activeTab as 'home' | 'away',
      since: Date.now()
    });
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

              {/* Event type selection */}
              <div className="border rounded-md p-2 overflow-y-auto">
                <h3 className="font-medium mb-1 text-sm">Event Type</h3>
                <Accordion type="multiple" collapsible className="w-full">
                  {Object.entries(ACTION_CATEGORIES).map(([categoryName, eventTypeList]) => (
                    <AccordionItem value={categoryName} key={categoryName}>
                      <AccordionTrigger className="text-sm py-2">{categoryName}</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-1 p-1">
                          {(eventTypeList as EventType[]).map((eventType: EventType) => { // eventType here is like 'pass', 'shot'
                            const info = eventTypes[eventType];
                            if (!info) return null;
                            
                            // Use the passed prop `assignedEventTypes` (which is already normalized in this component)
                            const isAssigned = normalizedAssignedEventTypes.has(eventType); 
                            let buttonStyle = `text-xs h-auto py-1.5 whitespace-normal relative`; // Added relative for potential badge

                            if (selectedEventType === eventType) {
                               buttonStyle += ` ${info.color} text-white`; // Keep existing selected color and ensure text is visible
                            } else if (isAssigned) {
                              // Visually distinct style for assigned but not selected event types
                              buttonStyle += ` bg-blue-100 border border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:border-blue-600`;
                            } else {
                              // Default style for non-assigned & non-selected (variant="outline" handles this)
                            }

                            return (
                              <Button
                                key={eventType}
                                size="sm"
                                variant={selectedEventType === eventType ? "default" : "outline"}
                                className={buttonStyle}
                                onClick={() => handleEventTypeSelect(eventType)}
                              >
                                {isAssigned && (
                                  <span className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 rounded-full bg-yellow-400 border-2 border-white dark:border-gray-800" title="Assigned to you"></span>
                                )}
                                {SHORTCUT_KEYS_DISPLAY[eventType] ? `${info.description} (${SHORTCUT_KEYS_DISPLAY[eventType]})` : info.description}
                              </Button>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {isLoadingAssignedEventTypes && (
                  <div className="text-xs text-muted-foreground p-2 text-center">Loading your event assignments...</div>
                )}
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
                    onEventSelect={handleEventSelectFromMarker}
                    allowCircularMenu={true}
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
                    onEventSelect={handleEventSelectFromMarker}
                    allowCircularMenu={true}
                  />)}
                  
                  {/* Ball movement history - draw lines between players using ballPathHistory prop */}
                  {ballPathHistory.slice(-5).map((pathItem, index) => {
                  const { startCoordinates, endCoordinates, status, id, clientId } = pathItem; 
                  
                  const wasIntercepted = interceptedPaths.some(path => 
                    Math.abs(path.point.x - endCoordinates.x) < 0.1 && 
                    Math.abs(path.point.y - endCoordinates.y) < 0.1
                  );

                  let strokeColor = "#ffffff"; // Default for confirmed
                  let strokeDash = index === ballPathHistory.slice(-5).length - 1 ? "none" : "5,5"; 
                  let lineOpacity = 0.7 - 0.1 * (ballPathHistory.slice(-5).length - 1 - index);


                  if (wasIntercepted) { 
                    strokeColor = "#ff3333"; // Red for intercepted
                    strokeDash = "5,5";
                  } else if (status === 'pending_confirmation' || status === 'optimistic') { // Treat optimistic as pending
                    strokeColor = "#cccccc"; // Lighter color for pending
                    strokeDash = "3,3";
                    lineOpacity = 0.5;
                  } else if (status === 'failed') {
                    strokeColor = "#ff9999"; // Lighter red for failed
                    strokeDash = "2,2";
                    lineOpacity = 0.4;
                  }
                  // 'confirmed' status uses the default #ffffff and existing dash/opacity logic if not intercepted.

                  return <React.Fragment key={id || clientId || `ballpath-${index}`}>
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{
                      zIndex: 5
                    }}>
                          <line 
                            x1={`${startCoordinates.x * 100}%`} y1={`${startCoordinates.y * 100}%`} 
                            x2={`${endCoordinates.x * 100}%`} y2={`${endCoordinates.y * 100}%`} 
                            stroke={strokeColor}
                            strokeWidth="2" 
                            strokeDasharray={strokeDash}
                            opacity={lineOpacity}
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
                <div className="w-3 h-0.5 bg-white"></div> {/* Solid white line */}
                <span className="ml-1">Current path</span>
              </div>
              <div className="flex items-center ml-2">
                <div className="w-3 h-0.5 bg-white dashed-line-legend"></div> {/* Dashed white line */}
                <span className="ml-1">Previous path</span>
              </div>
              <div className="flex items-center ml-2">
                 <div className="w-3 h-0.5 bg-gray-400 dashed-line-legend"></div> {/* Dashed gray line */}
                 <span className="ml-1">Pending path</span>
              </div>
              <div className="flex items-center ml-2">
                <div className="w-3 h-0.5 bg-red-500 dashed-line-legend"></div> {/* Dashed red line */}
                <span className="ml-1">Intercepted/Failed</span>
              </div>
              <div className="flex items-center ml-2">
                <div className="inline-block w-2 h-2 bg-white border border-black rounded-full"></div>
                <span className="ml-1">Ball</span>
              </div>
            </div>}
        </CardContent>
      </Card>
      
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
          
          .dashed-line-legend {
            border-top: 2px dashed currentColor; /* Use currentColor to inherit color from parent or apply directly */
            height: 0; /* Make it a line */
            display: inline-block; /* Allow width */
          }
        `}
      </style>
    </div>;
};
export default PianoInput;