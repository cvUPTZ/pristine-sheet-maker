// src/components/PianoInput.tsx (This file was already provided and should now work)
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EVENT_TYPES, KEYBOARD_MAPPINGS } from '@/constants/eventTypes'; // This import should now be satisfied
import { Badge } from '@/components/ui/badge';
import {
  ArrowRightLeft, Circle, ShieldAlert, Target, CornerRightDown, AlertOctagon, Hand, Replace, Square, XSquare,
  RectangleHorizontal, Minus, Goal, Zap, Bot, ShieldCheck, Footprints, Swords, ThumbsUp, ThumbsDown
} from 'lucide-react'; // Importing a selection of icons
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Team, Player, EventType } from '@/types'; // Ensure these types are correctly defined
import { MatchEvent } from '@/types'; // Ensure this type is correctly defined

interface PianoInputProps {
  homeTeam: Team;
  awayTeam: Team;
  onEventAdd: (event: MatchEvent) => void;
  elapsedTime: number;
  selectedEventType: EventType | null;
  onEventTypeSelect: (eventType: EventType) => void;
  selectedTeam: Team | null;
  onTeamSelect: (team: Team) => void;
  selectedPlayer: Player | null;
  onPlayerSelect: (player: Player) => void;
  isPassTrackingMode: boolean;
}

const PianoInput: React.FC<PianoInputProps> = ({
  homeTeam,
  awayTeam,
  onEventAdd,
  elapsedTime,
  selectedEventType,
  onEventTypeSelect,
  selectedTeam,
  onTeamSelect,
  selectedPlayer,
  onPlayerSelect,
  isPassTrackingMode // This prop is defined but not used in the provided snippet.
                     // Ensure it's used or remove it if not needed.
}) => {
  // const [isExpanded, setIsExpanded] = useState(false); // isExpanded is declared but not used.

  const handleEventTypeSelect = useCallback((eventType: EventType) => {
    onEventTypeSelect(eventType);
  }, [onEventTypeSelect]);

  const handleTeamSelect = (team: Team) => {
    onTeamSelect(team);
  };

  const handlePlayerSelect = (player: Player) => {
    onPlayerSelect(player);
  };

  // keyboardMappings is declared but its value is KEYBOARD_MAPPINGS.
  // You can directly use KEYBOARD_MAPPINGS in the useEffect hook.
  // const keyboardMappings = KEYBOARD_MAPPINGS; // This line can be removed if KEYBOARD_MAPPINGS is used directly

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement) { // Good practice to check for textareas too
        return;
      }

      const eventType = (Object.keys(KEYBOARD_MAPPINGS) as EventType[]).find(
        (key) => KEYBOARD_MAPPINGS[key as EventType] === event.key.toUpperCase()
      );

      if (eventType) {
        event.preventDefault(); // Prevent default browser actions for these keys if needed
        handleEventTypeSelect(eventType);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleEventTypeSelect]); // Removed keyboardMappings from dependency array as it's a constant from import

  const addEvent = useCallback(() => {
    if (!selectedEventType || !selectedTeam || !selectedPlayer) {
      console.warn('Cannot add event: Event Type, Team, or Player not selected.');
      return;
    }

    const newEvent: MatchEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Added randomness to ID
      matchId: 'match-1', // Consider making this dynamic if needed
      teamId: selectedTeam.id === homeTeam.id ? homeTeam.id : awayTeam.id, // Use actual team ID
      playerId: selectedPlayer.id,
      type: selectedEventType,
      timestamp: elapsedTime,
      coordinates: { x: 50, y: 50 }, // Placeholder, should be dynamic
      status: 'confirmed', // Default status
      clientId: `client-${Date.now()}` // This might be redundant if `id` is already client-generated and unique
    };

    onEventAdd(newEvent);
    // Optionally reset selections after adding an event
    // onEventTypeSelect(null);
    // onPlayerSelect(null); // Team selection might persist or reset based on UX
  }, [selectedEventType, selectedTeam, selectedPlayer, elapsedTime, onEventAdd, homeTeam.id, awayTeam.id]);

  return (
    <div className="space-y-4 p-4"> {/* Added some padding for better layout */}
      <Card>
        <CardHeader>
          <CardTitle>Event Type</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"> {/* Responsive grid */}
          {(Object.keys(EVENT_TYPES) as EventType[]).map((eventType) => (
            <Button
              key={eventType}
              variant={selectedEventType === eventType ? 'secondary' : 'outline'}
              onClick={() => handleEventTypeSelect(eventType)}
              className="flex flex-col items-center justify-center h-28 w-full p-2 rounded-lg shadow hover:shadow-md active:scale-95 transform transition-transform duration-100 ease-out hover:bg-accent focus:ring-2 focus:ring-primary"
            >
              {getEventTypeIcon(eventType as EventType)}
              <span className="text-xs text-center mt-1">{EVENT_TYPES[eventType]}</span>
              {KEYBOARD_MAPPINGS[eventType] && (
                <Badge variant="outline" className="mt-1 text-xs scale-90">
                  {KEYBOARD_MAPPINGS[eventType]}
                </Badge>
              )}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full" defaultValue="team-selection"> {/* `single` and `collapsible` often go together */}
        <AccordionItem value="team-selection">
          <AccordionTrigger>Team & Player Selection</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={selectedTeam === homeTeam ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle>{homeTeam.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto"> {/* Scrollable player list */}
                  {homeTeam.players.map((player) => (
                    <Button
                      key={player.id}
                      variant={selectedTeam === homeTeam && selectedPlayer === player ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => {
                        handleTeamSelect(homeTeam);
                        handlePlayerSelect(player);
                      }}
                    >
                      {player.jerseyNumber && <Badge variant="secondary" className="mr-2">{player.jerseyNumber}</Badge>}
                      {player.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className={selectedTeam === awayTeam ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle>{awayTeam.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto"> {/* Scrollable player list */}
                  {awayTeam.players.map((player) => (
                    <Button
                      key={player.id}
                      variant={selectedTeam === awayTeam && selectedPlayer === player ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => {
                        handleTeamSelect(awayTeam);
                        handlePlayerSelect(player);
                      }}
                    >
                       {player.jerseyNumber && <Badge variant="secondary" className="mr-2">{player.jerseyNumber}</Badge>}
                       {player.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      <Button 
        onClick={addEvent} 
        disabled={!selectedEventType || !selectedTeam || !selectedPlayer}
        className="w-full"
        size="lg"
      >
        Add Event: {selectedEventType ? EVENT_TYPES[selectedEventType] : 'Select Event'}
        {selectedPlayer && selectedTeam && ` by ${selectedPlayer.name} (${selectedTeam.name})`}
      </Button>
    </div>
  );
};

// Helper function to get an icon for an event type
const getEventTypeIcon = (eventType: EventType) => {
  const iconProps = { className: "w-5 h-5 mb-1" };
  switch (eventType) {
    case 'pass': return <ArrowRightLeft {...iconProps} />;
    case 'shot': return <Target {...iconProps} />;
    case 'tackle': return <ShieldCheck {...iconProps} />;
    case 'foul': return <ShieldAlert {...iconProps} />;
    case 'corner': return <CornerRightDown {...iconProps} />;
    case 'offside': return <AlertOctagon {...iconProps} />;
    case 'goal': return <Goal {...iconProps} />; // Lucide Goal icon is a net
    case 'assist': return <ThumbsUp {...iconProps} />; // Placeholder, can be improved
    case 'yellowCard': return <Square {...iconProps} style={{ fill: 'yellow', color: 'black' }} />;
    case 'redCard': return <Square {...iconProps} style={{ fill: 'red', color: 'white' }}/>;
    case 'substitution': return <Replace {...iconProps} />;
    case 'card': return <RectangleHorizontal {...iconProps} />; // Generic card
    case 'penalty': return <Circle {...iconProps} />; // Simple circle for penalty spot
    case 'free-kick': return <Zap {...iconProps} />; // Zap for a powerful kick
    case 'goal-kick': return <Bot {...iconProps} />; // Placeholder, like a robot taking a kick
    case 'throw-in': return <Hand {...iconProps} />;
    case 'interception': return <ShieldCheck {...iconProps} transform="rotate(180)" />; // Inverted shield
    case 'possession': return <Footprints {...iconProps} />; // Placeholder
    case 'ballLost': return <ThumbsDown {...iconProps} />; // Placeholder
    case 'ballRecovered': return <ThumbsUp {...iconProps} />; // Placeholder
    case 'dribble': return <Footprints {...iconProps} />; // Placeholder
    case 'cross': return <CornerRightDown {...iconProps} transform="scale(1, -1)"/>; // Flipped corner
    case 'clearance': return <ShieldAlert {...iconProps} transform="rotate(180)" />; // Inverted alert
    case 'block': return <ShieldCheck {...iconProps} />;
    case 'save': return <Hand {...iconProps} />; // Goalkeeper hand
    case 'ownGoal': return <XSquare {...iconProps} style={{ fill: 'darkred', color: 'white' }} />;
    case 'aerialDuel': return <Swords {...iconProps} />; // Swords for duel
    case 'groundDuel': return <Swords {...iconProps} transform="rotate(90)" />;
    // Handle camelCase versions if they are distinct types and exist in EVENT_TYPES
    case 'freeKick': return <Zap {...iconProps} />;
    case 'goalKick': return <Bot {...iconProps} />;
    case 'throwIn': return <Hand {...iconProps} />;
    default: return <Minus {...iconProps} />; // Default icon
  }
};

export default PianoInput;