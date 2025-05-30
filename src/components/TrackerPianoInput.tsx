import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface EventType {
  key: string;
  label: string;
}

interface AssignedPlayer {
  id: string;
  player_name: string;
  jersey_number: number;
  team_context: 'home' | 'away';
}

interface TrackerAssignment {
  assigned_event_types: string[];
  player_id: number;
  player_team_id: string;
  match_id: string;
}

interface TrackerPianoInputProps {
  matchId: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  'pass': 'Pass',
  'shot': 'Shot',
  'foul': 'Foul',
  'goal': 'Goal',
  'save': 'Save',
  'offside': 'Offside',
  'corner': 'Corner Kick',
  'substitution': 'Substitution',
  'yellowCard': 'Yellow Card',
  'redCard': 'Red Card',
  'tackle': 'Tackle',
  'interception': 'Interception',
  'cross': 'Cross',
  'clearance': 'Clearance'
};

const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId }) => {
  const { user } = useAuth();
  const [assignedEventTypes, setAssignedEventTypes] = useState<EventType[]>([]);
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<AssignedPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pressedButtons, setPressedButtons] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id || !matchId) return;

    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch tracker assignments for this user and match
        const { data: assignments, error: assignmentsError } = await supabase
          .from('match_tracker_assignments')
          .select('assigned_event_types, player_id, player_team_id')
          .eq('tracker_user_id', user.id)
          .eq('match_id', matchId);

        if (assignmentsError) throw assignmentsError;

        if (!assignments || assignments.length === 0) {
          setError('No assignments found for this match');
          return;
        }

        // Process assigned event types
        const eventTypesSet = new Set<string>();
        const playerIds = new Set<number>();
        
        assignments.forEach(assignment => {
          if (assignment.assigned_event_types) {
            assignment.assigned_event_types.forEach(eventType => {
              eventTypesSet.add(eventType);
            });
          }
          if (assignment.player_id) {
            playerIds.add(assignment.player_id);
          }
        });

        const eventTypes: EventType[] = Array.from(eventTypesSet).map(key => ({
          key,
          label: EVENT_TYPE_LABELS[key] || key
        }));

        setAssignedEventTypes(eventTypes);

        // Fetch match data to get player details
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('home_team_players, away_team_players')
          .eq('id', matchId)
          .single();

        if (matchError) throw matchError;

        // Parse player data and filter assigned players
        const homeTeamPlayers = typeof matchData.home_team_players === 'string' 
          ? JSON.parse(matchData.home_team_players) 
          : matchData.home_team_players || [];
        
        const awayTeamPlayers = typeof matchData.away_team_players === 'string' 
          ? JSON.parse(matchData.away_team_players) 
          : matchData.away_team_players || [];

        const allPlayers = [
          ...homeTeamPlayers.map((p: any) => ({ ...p, team_context: 'home' as const })),
          ...awayTeamPlayers.map((p: any) => ({ ...p, team_context: 'away' as const }))
        ];

        const filteredPlayers = allPlayers
          .filter(player => playerIds.has(Number(player.id)))
          .map(player => ({
            id: String(player.id),
            player_name: player.name || player.player_name,
            jersey_number: player.number || player.jersey_number,
            team_context: player.team_context
          }));

        setAssignedPlayers(filteredPlayers);

        // Auto-select first player if only one is assigned
        if (filteredPlayers.length === 1) {
          setSelectedPlayer(filteredPlayers[0]);
        }

      } catch (err: any) {
        console.error('Error fetching tracker assignments:', err);
        setError(err.message || 'Failed to load assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user?.id, matchId]);

  const handleEventRecord = async (eventType: EventType) => {
    if (!selectedPlayer) {
      toast.error('Please select a player first');
      return;
    }

    try {
      // Ensure player_id is properly converted to integer
      const playerId = parseInt(String(selectedPlayer.id), 10);
      
      // Validate player_id is a valid integer
      if (isNaN(playerId)) {
        console.error("Invalid player ID:", selectedPlayer.id);
        toast.error('Invalid player ID');
        return;
      }

      // Use seconds since epoch for timestamp to fit in bigint
      const timestampInSeconds = Math.floor(Date.now() / 1000);

      const eventData = {
        match_id: matchId,
        event_type: eventType.key,
        timestamp: timestampInSeconds,
        player_id: playerId,
        team: selectedPlayer.team_context,
        created_by: user?.id || ''
      };

      console.log('TrackerPianoInput - Inserting event data:', eventData);
      console.log('TrackerPianoInput - Data types:', {
        match_id: typeof eventData.match_id,
        event_type: typeof eventData.event_type,
        timestamp: typeof eventData.timestamp,
        player_id: typeof eventData.player_id,
        team: typeof eventData.team,
        created_by: typeof eventData.created_by
      });

      const { error } = await supabase
        .from('match_events')
        .insert([eventData]);

      if (error) throw error;

      // Keep the button pressed by adding it to pressedButtons set
      setPressedButtons(prev => new Set([...prev, eventType.key]));

      toast.success(`${eventType.label} recorded for ${selectedPlayer.player_name}`);
    } catch (err: any) {
      console.error('Error recording event:', err);
      toast.error('Failed to record event');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading your assignments...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Tracker Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Player Selection */}
          <div>
            <h3 className="font-medium mb-2">Assigned Players</h3>
            <div className="flex flex-wrap gap-2">
              {assignedPlayers.map((player) => (
                <Button
                  key={player.id}
                  variant={selectedPlayer?.id === player.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPlayer(player)}
                  className="flex items-center gap-2"
                >
                  <Badge variant={player.team_context === 'home' ? 'default' : 'secondary'}>
                    {player.team_context.toUpperCase()}
                  </Badge>
                  #{player.jersey_number} {player.player_name}
                </Button>
              ))}
            </div>
            {assignedPlayers.length === 0 && (
              <p className="text-muted-foreground text-sm">No players assigned</p>
            )}
          </div>

          {/* Event Type Buttons */}
          <div>
            <h3 className="font-medium mb-2">Event Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {assignedEventTypes.map((eventType) => (
                <Button
                  key={eventType.key}
                  onClick={() => handleEventRecord(eventType)}
                  disabled={!selectedPlayer}
                  variant="default"
                  className="h-16 flex flex-col gap-1"
                >
                  <span className="font-medium">{eventType.label}</span>
                  {selectedPlayer && (
                    <span className="text-xs text-muted-foreground">
                      {selectedPlayer.player_name}
                    </span>
                  )}
                </Button>
              ))}
            </div>
            {assignedEventTypes.length === 0 && (
              <p className="text-muted-foreground text-sm">No event types assigned</p>
            )}
          </div>

          {!selectedPlayer && assignedPlayers.length > 1 && (
            <div className="text-center text-muted-foreground text-sm">
              Select a player to record events
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerPianoInput;
