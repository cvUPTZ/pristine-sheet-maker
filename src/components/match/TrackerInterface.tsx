
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EventType, PlayerForPianoInput, AssignedPlayers, MatchRosterPlayer } from '@/components/match/types';

interface EventTypeConfig {
  key: string;
  label: string;
}

const ALL_EVENT_TYPES_CONFIG: EventTypeConfig[] = [
  { key: 'pass', label: 'Pass' },
  { key: 'shot', label: 'Shot' },
  { key: 'foul', label: 'Foul' },
  { key: 'goal', label: 'Goal' },
  { key: 'save', label: 'Save' },
  { key: 'offside', label: 'Offside' },
  { key: 'corner', label: 'Corner Kick' },
  { key: 'substitution', label: 'Substitution' },
];

interface TrackerInterfaceProps {
  trackerUserId: string;
  matchId: string;
}

export function TrackerInterface({ trackerUserId, matchId }: TrackerInterfaceProps) {
  const [assignedEventTypes, setAssignedEventTypes] = useState<EventTypeConfig[] | null>(null);
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayers | null>(null);
  const [fullMatchRoster, setFullMatchRoster] = useState<AssignedPlayers | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackerUserId || !matchId) {
      setLoading(false);
      setError("Tracker user ID or Match ID is missing.");
      return;
    }

    async function fetchAssignments() {
      setLoading(true);
      setError(null);

      try {
        const { data: allMatchPlayersData, error: allMatchPlayersError } = await supabase
          .from('match_rosters')
          .select('id, player_name, jersey_number, team_context')
          .eq('match_id', matchId);

        if (allMatchPlayersError) {
          console.error('Error fetching full match roster:', allMatchPlayersError);
          throw new Error(`Failed to fetch full match roster: ${allMatchPlayersError.message}`);
        }

        const currentFullRoster: AssignedPlayers = { home: [], away: [] };
        (allMatchPlayersData as MatchRosterPlayer[])?.forEach((player: MatchRosterPlayer) => {
          const pScoped: PlayerForPianoInput = {
            id: player.id,
            player_name: player.player_name,
            jersey_number: player.jersey_number,
            team_context: player.team_context,
          };
          if (player.team_context === 'home') {
            currentFullRoster.home.push(pScoped);
          } else {
            currentFullRoster.away.push(pScoped);
          }
        });
        setFullMatchRoster(currentFullRoster);

        const { data: eventAssignmentsData, error: eventAssignmentsError } = await supabase
          .from('user_event_assignments')
          .select('event_type')
          .eq('user_id', trackerUserId);

        if (eventAssignmentsError) {
          console.error('Error fetching event type assignments:', eventAssignmentsError);
          setAssignedEventTypes([]);
        } else {
          const processedEventTypes: EventTypeConfig[] = eventAssignmentsData
            ? eventAssignmentsData.map((assignment: any) => {
                const foundConfig = ALL_EVENT_TYPES_CONFIG.find(et => et.key === assignment.event_type);
                return foundConfig || { key: assignment.event_type, label: assignment.event_type };
              })
            : [];
          setAssignedEventTypes(processedEventTypes);
        }
        
        const { data: playerAssignmentIdsData, error: playerAssignmentIdsError } = await supabase
          .from('match_tracker_assignments')
          .select('player_id')
          .eq('tracker_user_id', trackerUserId)
          .eq('match_id', matchId)
          .not('player_id', 'is', null);

        if (playerAssignmentIdsError) {
          console.error('Error fetching player assignment IDs:', playerAssignmentIdsError);
          setAssignedPlayers({ home: [], away: [] });
        } else if (playerAssignmentIdsData && playerAssignmentIdsData.length > 0) {
          const playerIds = playerAssignmentIdsData.map((pa: any) => pa.player_id?.toString()).filter((id: any) => id !== null) as string[];

          if (playerIds.length > 0 && currentFullRoster) {
            const assignedHomePlayers = currentFullRoster.home.filter(p => playerIds.includes(p.id));
            const assignedAwayPlayers = currentFullRoster.away.filter(p => playerIds.includes(p.id));
            setAssignedPlayers({ home: assignedHomePlayers, away: assignedAwayPlayers });
          } else {
             setAssignedPlayers({ home: [], away: [] });
          }
        } else {
          setAssignedPlayers({ home: [], away: [] });
        }

      } catch (e: any) {
        console.error("Overall assignment fetching error:", e);
        setError(e.message || "An unexpected error occurred while fetching assignments.");
        setAssignedEventTypes([]);
        setAssignedPlayers({ home: [], away: [] });
        if (!fullMatchRoster) setFullMatchRoster({ home: [], away: [] });
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [trackerUserId, matchId]);

  const handleEventRecord = (eventType: EventTypeConfig, player?: PlayerForPianoInput, details?: Record<string, any>) => {
    console.log('Event Recorded:', {
      trackerUserId,
      matchId,
      eventTypeKey: eventType.key,
      playerId: player?.id,
      teamContext: player?.team_context,
      recordedAt: new Date().toISOString(),
      details,
    });
  };

  if (loading) {
    return <div className="p-4">Loading tracker assignments...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error loading assignments: {error}</div>;
  }
  
  if (!fullMatchRoster && !loading) {
     return <div className="p-4 text-orange-600">Match roster data is unavailable. Cannot initialize tracker.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Match Tracking Interface</h1>
      <p className="text-sm text-gray-600 mb-1">Tracker: {trackerUserId}</p>
      <p className="text-sm text-gray-600 mb-4">Match: {matchId}</p>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Assigned Event Types</h3>
          {assignedEventTypes && assignedEventTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assignedEventTypes.map(eventType => (
                <span key={eventType.key} className="px-2 py-1 bg-blue-100 rounded text-sm">
                  {eventType.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No event types assigned</p>
          )}
        </div>

        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Assigned Players</h3>
          {assignedPlayers && (assignedPlayers.home.length > 0 || assignedPlayers.away.length > 0) ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Home Team</h4>
                {assignedPlayers.home.map(player => (
                  <div key={player.id} className="p-2 bg-green-50 rounded mb-1">
                    #{player.jersey_number} {player.player_name}
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-medium mb-2">Away Team</h4>
                {assignedPlayers.away.map(player => (
                  <div key={player.id} className="p-2 bg-blue-50 rounded mb-1">
                    #{player.jersey_number} {player.player_name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No players assigned</p>
          )}
        </div>
      </div>
    </div>
  );
}
