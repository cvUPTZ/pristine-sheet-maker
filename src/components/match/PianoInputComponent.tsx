import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MatchEvent, Player, EventType as GlobalEventType } from '@/types'; // Assuming global types

// Define AssignedPlayerForMatch if not already globally available
// For simplicity, let's use a simplified version or assume Player type can be used.
// We can refine this based on how `MatchAnalysisV2` will provide it.
interface AssignedPlayerForMatch { // Placeholder - align with MatchAnalysisV2's state
  id: string | number;
  name: string;
  teamId: 'home' | 'away';
  // teamName: string; // teamName can be derived from homeTeamName/awayTeamName props
}

interface PianoInputComponentProps {
  matchId: string;
  userId: string;
  assignedPlayers: AssignedPlayerForMatch[] | null; // Players tracker is specifically assigned to
  assignedEventTypes: string[] | null; // Event types tracker can record
  sendCollaborationEvent: (eventData: Omit<MatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'>) => void;
  homeTeamPlayers: Player[] | null;
  awayTeamPlayers: Player[] | null;
  homeTeamName: string;
  awayTeamName: string;
}

// Define some basic event types for the piano keys
const basicEventTypes: { key: GlobalEventType; label: string }[] = [
  { key: 'pass', label: 'Pass' },
  { key: 'shot', label: 'Shot' },
  { key: 'foul', label: 'Foul' },
  { key: 'goal', label: 'Goal' },
  { key: 'tackle', label: 'Tackle' },
  { key: 'corner', label: 'Corner' },
  { key: 'offside', label: 'Offside' },
  // Add more or make dynamic based on assignedEventTypes later
];

const PianoInputComponent: React.FC<PianoInputComponentProps> = ({
  matchId,
  userId,
  assignedPlayers, // This prop is available for future filtering logic
  assignedEventTypes,
  sendCollaborationEvent,
  homeTeamPlayers,
  awayTeamPlayers,
  homeTeamName,
  awayTeamName
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedTeamContext, setSelectedTeamContext] = useState<'home' | 'away' | null>(null);

  const handleEventRecord = (eventTypeKey: GlobalEventType) => {
    if (!selectedPlayerId || !selectedTeamContext) {
      console.warn('PianoInputComponent: No player selected or team context missing.');
      // Consider adding toast.error('Please select a player first.'); if toast is available globally
      return;
    }

    console.log(`PianoInputComponent: Record event ${eventTypeKey} for player ${selectedPlayerId} (Team: ${selectedTeamContext}, User: ${userId})`);
    
    const eventData: Omit<MatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'> = {
      matchId: matchId,
      teamId: selectedTeamContext, 
      playerId: Number(selectedPlayerId), 
      type: eventTypeKey, 
      timestamp: Date.now(),
      coordinates: { x: Math.random() * 100, y: Math.random() * 68 }, // Placeholder random coordinates
      // user_id (created_by) will be added by useMatchCollaboration or backend based on authenticated user
    };
    sendCollaborationEvent(eventData);
    // Consider adding toast.success(`Event ${eventTypeKey} recorded for player ${selectedPlayerId}`);
  };
  
  // Filter players for selection based on assignedPlayers prop.
  const allPlayersForSelection = (() => {
    if (assignedPlayers && assignedPlayers.length > 0) {
      return assignedPlayers
        .map(assignedPlayer => {
          let fullPlayer: Player | undefined;
          let teamNameToDisplay = '';

          if (assignedPlayer.teamId === 'home') {
            fullPlayer = (homeTeamPlayers || []).find(p => String(p.id) === String(assignedPlayer.id));
            teamNameToDisplay = homeTeamName;
          } else { // away team
            fullPlayer = (awayTeamPlayers || []).find(p => String(p.id) === String(assignedPlayer.id));
            teamNameToDisplay = awayTeamName;
          }

          if (!fullPlayer && !assignedPlayer.name) { // If fullPlayer not found and no fallback name in assignedPlayer
            console.warn(`PianoInputComponent: Assigned player ID ${assignedPlayer.id} not found in rosters and has no fallback name.`);
            return null; // Skip this player if essential details are missing
          }
          
          return {
            id: String(assignedPlayer.id),
            // Prioritize fullPlayer.name, then assignedPlayer.name, then a generic ID string
            name: fullPlayer?.name || assignedPlayer.name || `Player ID ${assignedPlayer.id}`,
            teamId: assignedPlayer.teamId,
            teamName: teamNameToDisplay,
            number: fullPlayer?.jersey_number, // Assuming Player type has jersey_number
          };
        })
        .filter(player => player !== null); // Remove any null entries (players not found)
    }
    // If assignedPlayers is null or empty, return an empty list.
    // This strictly enforces that only assigned players can be selected.
    return []; 
  })();

  // Filter event types based on assignedEventTypes if provided
  const availableEventTypes = basicEventTypes.filter(et => 
    !assignedEventTypes || assignedEventTypes.length === 0 || assignedEventTypes.includes(et.key)
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Piano Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-4">
        <div>
          <label htmlFor="player-select-piano" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select Player
          </label>
          <Select
            value={selectedPlayerId ? `${selectedPlayerId}:${selectedTeamContext}` : ""}
            onValueChange={(value) => {
              if (value) {
                const [id, teamCtx] = value.split(':');
                setSelectedPlayerId(id);
                setSelectedTeamContext(teamCtx as 'home' | 'away');
              } else {
                setSelectedPlayerId(null);
                setSelectedTeamContext(null);
              }
            }}
          >
            <SelectTrigger id="player-select-piano" className="w-full">
              <SelectValue placeholder="Select a player..." />
            </SelectTrigger>
            <SelectContent>
              {allPlayersForSelection.length > 0 ? (
                allPlayersForSelection.map((player) => (
                  // Added a null check for player before rendering SelectItem
                  player ? (
                    <SelectItem key={`${player.teamId}-${player.id}`} value={`${player.id}:${player.teamId}`}>
                      {player.name} ({player.teamName})
                    </SelectItem>
                  ) : null
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                  {assignedPlayers && assignedPlayers.length > 0 ? 'Assigned player details not found in rosters.' : 'No players assigned for tracking.'}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayerId ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {availableEventTypes.length > 0 ? (
              availableEventTypes.map((eventType) => (
              <Button
                key={eventType.key}
                variant="outline"
                className="p-3 h-auto text-xs sm:text-sm focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150 ease-in-out hover:bg-indigo-50 dark:hover:bg-gray-700"
                onClick={() => handleEventRecord(eventType.key)}
              >
                {eventType.label}
              </Button>
            ))
            ) : (
              <p className="col-span-full text-sm text-muted-foreground text-center py-4">
                No event types assigned or available for recording.
              </p>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            Please select a player to enable event recording.
          </div>
        )}
        
        {/* Optional Debug Info - uncomment if needed during development
        <div className="mt-4 p-2 border-t text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">Debug Information:</p>
          <p>Match ID: {matchId}</p>
          <p>User ID: {userId}</p>
          <p>Selected Player ID: {selectedPlayerId || 'None'}</p>
          <p>Selected Team Context: {selectedTeamContext || 'None'}</p>
          <p>Assigned Players: {assignedPlayers ? JSON.stringify(assignedPlayers.map(p => p.name)) : 'None'}</p>
          <p>Assigned Event Types: {assignedEventTypes ? JSON.stringify(assignedEventTypes) : 'All (or default)'}</p>
          <p>Home Team Players: {(homeTeamPlayers || []).length}</p>
          <p>Away Team Players: {(awayTeamPlayers || []).length}</p>
        </div>
        */}
      </CardContent>
    </Card>
  );
};

export default PianoInputComponent;
