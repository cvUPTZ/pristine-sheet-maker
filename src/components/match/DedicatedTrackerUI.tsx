import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner'; // Using sonner as seen in other components like MatchAnalysis
import { EventType, Player, Team } from '@/types'; // Assuming EventType is correctly defined

export interface AssignedPlayerForMatch {
  id: number;         // Player's ID
  name: string;       // Player's name
  teamId: 'home' | 'away'; // Player's team ID ('home' or 'away')
  teamName: string;     // Player's team name
}

interface DedicatedTrackerUIProps {
  assignedPlayerForMatch: AssignedPlayerForMatch | null;
  assignedEventTypes: string[] | null;
  recordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates?: { x: number; y: number } | undefined) => void;
  matchId: string; // Current match ID
}

const DedicatedTrackerUI: React.FC<DedicatedTrackerUIProps> = ({
  assignedPlayerForMatch,
  assignedEventTypes,
  recordEvent,
  matchId,
}) => {
  if (!assignedPlayerForMatch) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Tracker Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No player assigned to you for this match, or assignment is loading.</p>
        </CardContent>
      </Card>
    );
  }

  if (!assignedEventTypes || assignedEventTypes.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Tracking: {assignedPlayerForMatch.name} ({assignedPlayerForMatch.teamName})</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No event types assigned to you. Please contact an admin.</p>
        </CardContent>
      </Card>
    );
  }

  const handleEventButtonClick = (eventType: string) => {
    if (!matchId) {
      toast.error('Error: Match ID is missing. Cannot record event.');
      return;
    }

    recordEvent(
      eventType as EventType, // Cast to EventType, assuming strings from assignedEventTypes are valid
      assignedPlayerForMatch.id,
      assignedPlayerForMatch.teamId,
      undefined // Coordinates are explicitly ignored/undefined
    );

    toast.success(`Event '${eventType}' recorded for ${assignedPlayerForMatch.name}`);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Tracking: {assignedPlayerForMatch.name} ({assignedPlayerForMatch.teamName})</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {assignedEventTypes.map((eventType) => (
          <Button
            key={eventType}
            onClick={() => handleEventButtonClick(eventType)}
            className="h-20 text-lg whitespace-normal break-words p-2" // Ensure text wraps and buttons are large
            variant="default" // Or any other appropriate variant
          >
            {eventType.charAt(0).toUpperCase() + eventType.slice(1) // Capitalize first letter
            }
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default DedicatedTrackerUI;
