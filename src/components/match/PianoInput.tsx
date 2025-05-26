import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EVENT_TYPES, KEYBOARD_MAPPINGS } from '@/constants/eventTypes';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Team, Player, EventType } from '@/types';
import { MatchEvent } from '@/types';

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
  isPassTrackingMode
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEventTypeSelect = (eventType: EventType) => {
    onEventTypeSelect(eventType);
  };

  const handleTeamSelect = (team: Team) => {
    onTeamSelect(team);
  };

  const handlePlayerSelect = (player: Player) => {
    onPlayerSelect(player);
  };

  const keyboardMappings = KEYBOARD_MAPPINGS;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement) {
        return;
      }

      const eventType = (Object.keys(keyboardMappings) as EventType[]).find(
        (key) => keyboardMappings[key] === event.key.toUpperCase()
      );

      if (eventType) {
        handleEventTypeSelect(eventType);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleEventTypeSelect, keyboardMappings]);

  const addEvent = useCallback(() => {
    if (!selectedEventType || !selectedTeam || !selectedPlayer) {
      return;
    }

    const newEvent: MatchEvent = {
      id: `event-${Date.now()}`,
      matchId: 'match-1',
      teamId: selectedTeam.id,
      playerId: selectedPlayer.id,
      type: selectedEventType,
      timestamp: elapsedTime,
      coordinates: { x: 50, y: 50 },
      status: 'optimistic',
      clientId: `client-${Date.now()}`
    };

    onEventAdd(newEvent);
  }, [selectedEventType, selectedTeam, selectedPlayer, elapsedTime, onEventAdd]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Event Type</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-2">
          {(Object.keys(EVENT_TYPES) as EventType[]).map((eventType) => (
            <Button
              key={eventType}
              variant={selectedEventType === eventType ? 'secondary' : 'outline'}
              onClick={() => handleEventTypeSelect(eventType)}
            >
              {EVENT_TYPES[eventType]}
              <Badge className="ml-2">{keyboardMappings[eventType]}</Badge>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="team-selection">
          <AccordionTrigger>Team Selection</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{homeTeam.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {homeTeam.players.map((player) => (
                    <Button
                      key={player.id}
                      variant={selectedTeam === homeTeam && selectedPlayer === player ? 'secondary' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => {
                        handleTeamSelect(homeTeam);
                        handlePlayerSelect(player);
                      }}
                    >
                      {player.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{awayTeam.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {awayTeam.players.map((player) => (
                    <Button
                      key={player.id}
                      variant={selectedTeam === awayTeam && selectedPlayer === player ? 'secondary' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => {
                        handleTeamSelect(awayTeam);
                        handlePlayerSelect(player);
                      }}
                    >
                      {player.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button onClick={addEvent} disabled={!selectedEventType || !selectedTeam || !selectedPlayer}>
        Add Event
      </Button>
    </div>
  );
};

export default PianoInput;
