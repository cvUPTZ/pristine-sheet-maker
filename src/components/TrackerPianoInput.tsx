import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';
import { EventType } from '@/types';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';

// Define interfaces for type safety
interface TrackerPianoInputProps {
  matchId: string;
}

interface PlayerForPianoInput {
  id: number;
  name: string;
  position?: string;
  jersey_number?: number;
}

interface AssignedPlayers {
  home: PlayerForPianoInput[];
  away: PlayerForPianoInput[];
}

interface EnhancedEventType {
  key: string;
  label: string;
  category?: string;
  subcategory?: string;
  description?: string;
}

const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId }) => {
  const [assignedEventTypes, setAssignedEventTypes] = useState<EnhancedEventType[]>([]);
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayers | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerForPianoInput | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecordedEvent, setLastRecordedEvent] = useState<any>(null);
  const [fullMatchRoster, setFullMatchRoster] = useState<AssignedPlayers | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  // Use the centralized real-time system
  const { broadcastStatus } = useRealtimeMatch({
    matchId,
    onEventReceived: (event) => {
      console.log('[TrackerPianoInput] Event received via real-time:', event);
      if (event.created_by === user?.id) {
        setLastRecordedEvent({
          eventType: { key: event.type, label: event.type },
          player: selectedPlayer,
          timestamp: Date.now()
        });
      }
    }
  });

  const fetchMatchDetails = useCallback(async () => {
    if (!matchId) {
      console.error("Match ID is missing.");
      return;
    }

    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('home_team_players, away_team_players')
        .eq('id', matchId)
        .single();

      if (matchError) {
        console.error("Error fetching match details:", matchError);
        return;
      }

      const parsePlayerData = (data: any): PlayerForPianoInput[] => {
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch {
            return [];
          }
        }
        return Array.isArray(data) ? data : [];
      };

      const homePlayers = parsePlayerData(matchData.home_team_players);
      const awayPlayers = parsePlayerData(matchData.away_team_players);
      setFullMatchRoster({ home: homePlayers, away: awayPlayers });

    } catch (error: any) {
      console.error("Error fetching match details:", error);
    }
  }, [matchId]);

  const fetchAssignments = useCallback(async () => {
    if (!matchId || !user?.id) {
      console.error("Match ID or user ID is missing.");
      return;
    }

    console.log('=== TRACKER DEBUG: Starting fetchAssignments (User/Match specific) ===');
    console.log('User ID:', user.id);
    console.log('Match ID:', matchId);

    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId)
        .eq('tracker_user_id', user.id);

      console.log('=== RAW ASSIGNMENTS DATA ===');
      console.log('Assignments found:', data?.length || 0);
      console.log('Full assignments data:', data);

      if (error) {
        console.error("Error fetching tracker assignments:", error);
        setError("Failed to fetch tracker assignments");
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.log("No assignments found - setting error state");
        setError("No assignments found for this tracker and match. Please contact your administrator.");
        setAssignedEventTypes([]);
        setAssignedPlayers({ home: [], away: [] });
        setLoading(false);
        return;
      }

      const eventTypes = Array.from(new Set(data.flatMap(assignment => assignment.assigned_event_types || [])));
      const assignedEventTypesData: EnhancedEventType[] = eventTypes
        .filter(key => key)
        .map(key => ({ key, label: key }));
      setAssignedEventTypes(assignedEventTypesData);

      const homePlayers: PlayerForPianoInput[] = [];
      const awayPlayers: PlayerForPianoInput[] = [];

      data.forEach(assignment => {
        if (assignment.player_team_id === 'home') {
          const player = fullMatchRoster?.home?.find(p => String(p.id) === String(assignment.player_id));
          if (player && !homePlayers.some(p => p.id === player.id)) {
            homePlayers.push(player);
          }
        } else if (assignment.player_team_id === 'away') {
          const player = fullMatchRoster?.away?.find(p => String(p.id) === String(assignment.player_id));
          if (player && !awayPlayers.some(p => p.id === player.id)) {
            awayPlayers.push(player);
          }
        }
      });

      setAssignedPlayers({ home: homePlayers, away: awayPlayers });
      setError(null);

    } catch (error: any) {
      console.error("Error fetching tracker assignments:", error);
      setError("Failed to fetch tracker assignments");
    } finally {
      setLoading(false);
    }
  }, [matchId, user?.id, fullMatchRoster]);

  useEffect(() => {
    fetchMatchDetails();
  }, [fetchMatchDetails]);

  useEffect(() => {
    if (fullMatchRoster) {
      fetchAssignments();
    }
  }, [fetchAssignments, fullMatchRoster]);

  const recordEvent = async (eventType: EnhancedEventType, player?: PlayerForPianoInput, details?: Record<string, any>) => {
    console.log('TrackerPianoInput recordEvent called with:', { 
      eventType, 
      player, 
      details, 
      user: user?.id,
      matchId 
    });
    
    if (!matchId) {
      console.error("Match ID is missing.");
      throw new Error("Match ID is missing");
    }

    if (!user?.id) {
      console.error("User not authenticated");
      throw new Error("User not authenticated");
    }

    if (!eventType) {
      console.error("Event type is missing");
      throw new Error("Event type is missing");
    }

    setIsRecording(true);
    
    // Broadcast that we're recording
    broadcastStatus('recording', `recording_${eventType.key}`);

    try {
      let teamContext = null;
      if (player && assignedPlayers) {
        if (assignedPlayers.home?.some(p => p.id === player.id)) {
          teamContext = 'home';
        } else if (assignedPlayers.away?.some(p => p.id === player.id)) {
          teamContext = 'away';
        }
      }

      const playerId = player ? parseInt(String(player.id), 10) : null;
      
      if (player && (isNaN(playerId!) || playerId === null)) {
        console.error("Invalid player ID:", player.id);
        throw new Error("Invalid player ID");
      }

      const timestampInSeconds = Math.floor(Date.now() / 1000);

      const eventData = {
        match_id: matchId,
        event_type: eventType.key,
        timestamp: timestampInSeconds,
        player_id: playerId,
        team: teamContext,
        coordinates: details?.coordinates || null,
        created_by: user.id
      };

      console.log('Inserting event data:', eventData);

      const { data, error } = await supabase
        .from('match_events')
        .insert([eventData])
        .select();

      if (error) {
        console.error("Error recording event:", error);
        throw new Error(`Failed to record event: ${error.message}`);
      }

      console.log('Event recorded successfully:', data);
      
      // Broadcast that we're back to active status
      broadcastStatus('active', `recorded_${eventType.key}`);
      
      toast({
        title: "Event Recorded",
        description: `${eventType.label}${player ? ` by ${player.name}` : ''} recorded successfully`,
      });
      
    } catch (error: any) {
      console.error("Error in recordEvent:", error);
      broadcastStatus('active'); // Reset status on error
      toast({
        title: "Error",
        description: error.message || "Failed to record event",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsRecording(false);
    }
  };

  const handleEventTypeClick = async (eventType: EnhancedEventType) => {
    try {
      await recordEvent(eventType, selectedPlayer || undefined);
    } catch (error) {
      console.error('Error recording event:', error);
    }
  };

  const handlePlayerSelect = (player: PlayerForPianoInput, team: 'home' | 'away') => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading assignments...</div>
          <div className="text-sm text-gray-600">Please wait while we fetch your tracker assignments.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2 text-red-600">Assignment Error</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <Button onClick={fetchAssignments} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!assignedEventTypes.length && !assignedPlayers?.home?.length && !assignedPlayers?.away?.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">No Assignments</div>
          <div className="text-sm text-gray-600 mb-4">You have no event types or players assigned for this match.</div>
          <Button onClick={fetchAssignments} variant="outline">
            Refresh Assignments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Player Display */}
      {selectedPlayer && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-green-800 dark:text-green-200">
                  Selected: {selectedPlayer.name}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  Team: {selectedTeam === 'home' ? 'Home' : 'Away'} | 
                  {selectedPlayer.position && ` Position: ${selectedPlayer.position} |`}
                  {selectedPlayer.jersey_number && ` #${selectedPlayer.jersey_number}`}
                </div>
              </div>
              <Button 
                onClick={() => {
                  setSelectedPlayer(null);
                  setSelectedTeam(null);
                }}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Recorded Event */}
      {lastRecordedEvent && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Last Event:</strong> {lastRecordedEvent.eventType.label}
              {lastRecordedEvent.player && ` by ${lastRecordedEvent.player.name}`}
              <span className="ml-2 text-xs text-blue-600 dark:text-blue-300">
                {new Date(lastRecordedEvent.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Selection */}
      {(assignedPlayers?.home?.length || assignedPlayers?.away?.length) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Player</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignedPlayers?.home?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-sm text-gray-600 dark:text-gray-300">Home Team</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {assignedPlayers.home.map((player) => (
                    <Button
                      key={`home-${player.id}`}
                      onClick={() => handlePlayerSelect(player, 'home')}
                      variant={selectedPlayer?.id === player.id && selectedTeam === 'home' ? 'default' : 'outline'}
                      className="text-xs p-2 h-auto"
                    >
                      <div className="text-center">
                        <div className="font-semibold">{player.name}</div>
                        {player.jersey_number && (
                          <div className="text-xs opacity-75">#{player.jersey_number}</div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {assignedPlayers?.away?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-sm text-gray-600 dark:text-gray-300">Away Team</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {assignedPlayers.away.map((player) => (
                    <Button
                      key={`away-${player.id}`}
                      onClick={() => handlePlayerSelect(player, 'away')}
                      variant={selectedPlayer?.id === player.id && selectedTeam === 'away' ? 'default' : 'outline'}
                      className="text-xs p-2 h-auto"
                    >
                      <div className="text-center">
                        <div className="font-semibold">{player.name}</div>
                        {player.jersey_number && (
                          <div className="text-xs opacity-75">#{player.jersey_number}</div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Types */}
      {assignedEventTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Record Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {assignedEventTypes.map((eventType) => (
                <Button
                  key={eventType.key}
                  onClick={() => handleEventTypeClick(eventType)}
                  disabled={isRecording}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <EnhancedEventTypeIcon
                    eventType={eventType.key as EventType}
                    size="md"
                  />
                  <span className="text-xs font-medium text-center">
                    {eventType.label}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackerPianoInput;
