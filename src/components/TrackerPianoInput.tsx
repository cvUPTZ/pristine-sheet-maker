import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { EVENT_TYPE_LABELS } from '@/constants/eventTypes';

const LOCAL_STORAGE_KEY_MATCH_EVENTS = 'matchEventsQueue';

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

interface TrackerPianoInputProps {
  matchId: string;
}

const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId }) => {
  const { user } = useAuth();
  const [assignedEventTypes, setAssignedEventTypes] = useState<EventType[]>([]);
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<AssignedPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unsavedEventCount, setUnsavedEventCount] = useState<number>(0);
  const [toggleBehaviorEnabled, setToggleBehaviorEnabled] = useState<boolean>(false);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);

  const getLocalEvents = (): any[] => {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY_MATCH_EVENTS);
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error("Error parsing local events:", e);
        return [];
      }
    }
    return [];
  };

  const addLocalEvent = (eventData: any) => {
    const events = getLocalEvents();
    events.push(eventData);
    localStorage.setItem(LOCAL_STORAGE_KEY_MATCH_EVENTS, JSON.stringify(events));
    setUnsavedEventCount(events.length);
  };

  const clearLocalEvents = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_MATCH_EVENTS);
    setUnsavedEventCount(0);
  };

  useEffect(() => {
    if (!user?.id || !matchId) return;

    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching assignments for user:', user.id, 'match:', matchId);

        // Fetch tracker assignments for this user and match
        const { data: assignments, error: assignmentsError } = await supabase
          .from('match_tracker_assignments')
          .select('*')
          .eq('tracker_user_id', user.id)
          .eq('match_id', matchId);

        if (assignmentsError) {
          console.error('Assignments error:', assignmentsError);
          throw assignmentsError;
        }

        console.log('Raw assignments data:', assignments);

        if (!assignments || assignments.length === 0) {
          setError('No assignments found for this match');
          setAssignedEventTypes([]);
          setAssignedPlayers([]);
          return;
        }

        // Process assigned event types - aggregate all unique event types
        const allEventTypes = new Set<string>();
        assignments.forEach(assignment => {
          if (assignment.assigned_event_types && Array.isArray(assignment.assigned_event_types)) {
            assignment.assigned_event_types.forEach(eventType => {
              allEventTypes.add(eventType);
            });
          }
        });

        const eventTypes: EventType[] = Array.from(allEventTypes).map(key => ({
          key,
          label: EVENT_TYPE_LABELS[key as keyof typeof EVENT_TYPE_LABELS] || key
        }));

        console.log('Processed event types:', eventTypes);
        setAssignedEventTypes(eventTypes);

        // Fetch match data to get player details
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('home_team_players, away_team_players')
          .eq('id', matchId)
          .single();

        if (matchError) {
          console.error('Match data error:', matchError);
          throw matchError;
        }

        console.log('Match data:', matchData);

        // Parse player data safely
        const parsePlayerData = (data: any): any[] => {
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch {
              return [];
            }
          }
          return Array.isArray(data) ? data : [];
        };

        const homeTeamPlayers = parsePlayerData(matchData.home_team_players);
        const awayTeamPlayers = parsePlayerData(matchData.away_team_players);

        console.log('Home team players:', homeTeamPlayers);
        console.log('Away team players:', awayTeamPlayers);

        // Get assigned player IDs and team contexts from assignments
        const assignedPlayerData: AssignedPlayer[] = [];
        
        assignments.forEach(assignment => {
          const playerId = assignment.player_id;
          const teamContext = assignment.player_team_id;
          
          if (playerId && teamContext) {
            let player = null;
            
            if (teamContext === 'home') {
              player = homeTeamPlayers.find(p => String(p.id) === String(playerId));
            } else if (teamContext === 'away') {
              player = awayTeamPlayers.find(p => String(p.id) === String(playerId));
            }
            
            if (player) {
              const assignedPlayer: AssignedPlayer = {
                id: String(player.id),
                player_name: player.name || player.player_name,
                jersey_number: player.number || player.jersey_number,
                team_context: teamContext as 'home' | 'away'
              };
              
              // Avoid duplicates
              if (!assignedPlayerData.some(p => p.id === assignedPlayer.id)) {
                assignedPlayerData.push(assignedPlayer);
              }
            }
          }
        });

        console.log('Processed assigned players:', assignedPlayerData);
        setAssignedPlayers(assignedPlayerData);

        // Auto-select first player if only one is assigned
        if (assignedPlayerData.length === 1) {
          setSelectedPlayer(assignedPlayerData[0]);
        }

      } catch (err: any) {
        console.error('Error fetching tracker assignments:', err);
        setError(err.message || 'Failed to load assignments');
      } finally {
        setLoading(false);
        const localEvents = getLocalEvents();
        setUnsavedEventCount(localEvents.length);
      }
    };

    fetchAssignments();
  }, [user?.id, matchId]);

  const handleEventRecord = (eventType: EventType) => {
    if (!selectedPlayer) {
      toast.error('Please select a player first');
      return;
    }

    if (toggleBehaviorEnabled) {
      if (selectedEventType === null) {
        // First click in two-click mode: select the event type
        setSelectedEventType(eventType.key);
      } else {
        // Second click in two-click mode
        if (selectedEventType === eventType.key) {
          // Clicked the same event type again: record it and reset selection
          recordEvent(eventType);
          setSelectedEventType(null);
        } else {
          // Clicked a different event type: record the previously selected event, then select the new one
          const previousEventKey = selectedEventType;
          const previousEventTypeObj = assignedEventTypes.find(et => et.key === previousEventKey) || { key: previousEventKey, label: EVENT_TYPE_LABELS[previousEventKey as keyof typeof EVENT_TYPE_LABELS] || previousEventKey };
          recordEvent(previousEventTypeObj);
          setSelectedEventType(eventType.key);
        }
      }
    } else {
      // One-click mode: record immediately
      recordEvent(eventType);
    }
  };

  const recordEvent = (eventType: EventType) => {
    if (!selectedPlayer) return;

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

    addLocalEvent(eventData);
    toast.info(`${eventType.label} logged locally for ${selectedPlayer.player_name}`);
    
    // Clear selection after recording if toggle behavior is enabled
    if (toggleBehaviorEnabled) {
      setSelectedEventType(null);
    }
  };

  const handleSyncEvents = async () => {
    const localEvents = getLocalEvents();

    if (localEvents.length === 0) {
      toast.info("No events to sync.");
      return;
    }

    toast.loading("Syncing events to database...", { id: "sync-toast" });

    try {
      const { error } = await supabase
        .from('match_events')
        .insert(localEvents);

      if (error) {
        throw error;
      }

      toast.success(`${localEvents.length} event(s) synced successfully!`, { id: "sync-toast" });
      clearLocalEvents();

    } catch (err: any) {
      console.error('Error syncing events:', err);
      toast.error(`Failed to sync events: ${err.message || 'Unknown error'}. Please try again.`, { id: "sync-toast" });
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
          {/* Toggle Behavior Control */}
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">Click Behavior</span>
                  <Badge variant={toggleBehaviorEnabled ? "default" : "secondary"}>
                    {toggleBehaviorEnabled ? "Two-Click Mode" : "One-Click Mode"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {toggleBehaviorEnabled 
                    ? "First click selects event type, second click records it" 
                    : "Single click records event immediately"
                  }
                </p>
              </div>
              <Button
                onClick={() => setToggleBehaviorEnabled(!toggleBehaviorEnabled)}
                variant={toggleBehaviorEnabled ? "default" : "outline"}
                size="lg"
                className="px-6"
              >
                {toggleBehaviorEnabled ? "Switch to One-Click" : "Switch to Two-Click"}
              </Button>
            </div>
          </div>

          {/* Assignment Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Assigned Event Types</h4>
              <p className="text-lg font-semibold">{assignedEventTypes.length}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Assigned Players</h4>
              <p className="text-lg font-semibold">{assignedPlayers.length}</p>
            </div>
          </div>

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
            <h3 className="font-medium mb-2">Assigned Event Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {assignedEventTypes.map((eventType) => {
                const isSelected = toggleBehaviorEnabled && selectedEventType === eventType.key;
                return (
                  <Button
                    key={eventType.key}
                    onClick={() => handleEventRecord(eventType)}
                    disabled={!selectedPlayer}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-16 flex flex-col gap-1 transition-colors duration-75 ${
                      isSelected 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-primary hover:text-primary-foreground"
                    }`}
                    type="button"
                  >
                    <span className="font-medium">{eventType.label}</span>
                    {selectedPlayer && (
                      <span className="text-xs opacity-70">
                        {selectedPlayer.player_name}
                      </span>
                    )}
                    {toggleBehaviorEnabled && isSelected && (
                      <span className="text-xs">Click to record</span>
                    )}
                  </Button>
                );
              })}
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

          {/* Sync Button */}
          <div className="mt-6">
            <Button
              onClick={handleSyncEvents}
              disabled={unsavedEventCount === 0}
              className="w-full"
            >
              Sync {unsavedEventCount} Event{unsavedEventCount !== 1 ? 's' : ''} to Database
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerPianoInput;
