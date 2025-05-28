"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types'; // Assuming this path is correct
import {
  EventType,
  EventType,
  PlayerForPianoInput,
  AssignedPlayers,
  // UserEventAssignment, // Not directly used as a type here, inferred from Supabase response
  // MatchTrackerPlayerAssignment, // Not directly used as a type here, inferred from Supabase response
  MatchRosterPlayer,
} from './types';
import { PianoInput } from './PianoInput';

// This defines all possible event types in the system.
// PianoInput will use this as the base for display labels if needed,
// but will filter based on assignedEventTypes prop.

// Placeholder: This would typically come from a global config or be fetched.
const ALL_EVENT_TYPES_CONFIG: EventType[] = [
  { key: 'pass', label: 'Pass' },
  { key: 'shot', label: 'Shot' },
  { key: 'foul', label: 'Foul' },
  { key: 'goal', label: 'Goal' },
  { key: 'save', label: 'Save' },
  { key: 'offside', label: 'Offside' },
  { key: 'corner', label: 'Corner Kick' },
  { key: 'sub', label: 'Substitution' },
];


interface TrackerInterfaceProps {
  trackerUserId: string;
  matchId: string;
}

export function TrackerInterface({ trackerUserId, matchId }: TrackerInterfaceProps) {
  const supabase = createClientComponentClient<Database>();

  const [assignedEventTypes, setAssignedEventTypes] = useState<EventType[] | null>(null);
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayers | null>(null);
  const [fullMatchRoster, setFullMatchRoster] = useState<AssignedPlayers | null>(null); // To hold all players for the match

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
        // 0. Fetch all players for the match to serve as the base for PianoInput
        const { data: allMatchPlayersData, error: allMatchPlayersError } = await supabase
          .from('match_rosters')
          .select('id, player_name, jersey_number, team_context')
          .eq('match_id', matchId);

        if (allMatchPlayersError) {
          console.error('Error fetching full match roster:', allMatchPlayersError);
          throw new Error(`Failed to fetch full match roster: ${allMatchPlayersError.message}`);
        }

        const currentFullRoster: AssignedPlayers = { home: [], away: [] };
        (allMatchPlayersData as MatchRosterPlayer[])?.forEach(player => {
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

        // 1. Fetch Event Type Assignments for the current tracker
        const { data: eventAssignmentsData, error: eventAssignmentsError } = await supabase
          .from('user_event_assignments')
          .select('event_type_key')
          .eq('user_id', trackerUserId);

        if (eventAssignmentsError) {
          console.error('Error fetching event type assignments:', eventAssignmentsError);
          // Decide if this is a critical error or if tracker can proceed with no event types assigned
          // For now, we'll let them proceed but they won't see any event types.
          setAssignedEventTypes([]); // Explicitly empty if error
        } else {
          const processedEventTypes: EventType[] = eventAssignmentsData
            ? eventAssignmentsData.map(assignment => {
                const foundConfig = ALL_EVENT_TYPES_CONFIG.find(et => et.key === assignment.event_type_key);
                return foundConfig || { key: assignment.event_type_key, label: assignment.event_type_key }; // Fallback
              })
            : [];
          setAssignedEventTypes(processedEventTypes);
        }
        
        // 2. Fetch Player Assignments (IDs from match_tracker_assignments) for the current tracker and match
        const { data: playerAssignmentIdsData, error: playerAssignmentIdsError } = await supabase
          .from('match_tracker_assignments')
          .select('player_roster_id')
          .eq('tracker_user_id', trackerUserId)
          .eq('match_id', matchId)
          .not('player_roster_id', 'is', null);

        if (playerAssignmentIdsError) {
          console.error('Error fetching player assignment IDs:', playerAssignmentIdsError);
          // Decide if this is a critical error or if tracker can proceed with no players assigned
          setAssignedPlayers({ home: [], away: [] }); // Explicitly empty if error
        } else if (playerAssignmentIdsData && playerAssignmentIdsData.length > 0) {
          const playerRosterIds = playerAssignmentIdsData.map(pa => pa.player_roster_id).filter(id => id !== null) as string[];

          if (playerRosterIds.length > 0 && currentFullRoster) {
            // Filter the fullMatchRoster based on the fetched playerRosterIds
            const assignedHomePlayers = currentFullRoster.home.filter(p => playerRosterIds.includes(p.id));
            const assignedAwayPlayers = currentFullRoster.away.filter(p => playerRosterIds.includes(p.id));
            setAssignedPlayers({ home: assignedHomePlayers, away: assignedAwayPlayers });
          } else {
             setAssignedPlayers({ home: [], away: [] }); // No valid player roster IDs assigned or full roster missing
          }
        } else {
          setAssignedPlayers({ home: [], away: [] }); // No player assignments found for this tracker/match
        }

      } catch (e: any) {
        console.error("Overall assignment fetching error:", e);
        setError(e.message || "An unexpected error occurred while fetching assignments.");
        setAssignedEventTypes([]);
        setAssignedPlayers({ home: [], away: [] });
        if (!fullMatchRoster) setFullMatchRoster({ home: [], away: [] }); // Ensure fullMatchRoster is not null
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [trackerUserId, matchId, supabase]);

  const handleEventRecord = (eventType: EventType, player?: PlayerForPianoInput, details?: Record<string, any>) => {
    // This is where the event would be saved to the database
    console.log('Event Recorded:', {
      trackerUserId,
      matchId,
      eventTypeKey: eventType.key,
      playerId: player?.id,
      teamContext: player?.team_context,
      recordedAt: new Date().toISOString(),
      details,
    });
    // Potentially send to Supabase table 'match_events' or similar
  };

  if (loading) {
    return <div className="p-4">Loading tracker assignments...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error loading assignments: {error}</div>;
  }
  
  
  if (!fullMatchRoster && !loading) { // Ensure fullMatchRoster is loaded or error occurred
     return <div className="p-4 text-orange-600">Match roster data is unavailable. Cannot initialize tracker.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Match Tracking Interface</h1>
      <p className="text-sm text-gray-600 mb-1">Tracker: {trackerUserId}</p>
      <p className="text-sm text-gray-600 mb-4">Match: {matchId}</p>
      
      <PianoInput
        fullMatchRoster={fullMatchRoster} // Pass the complete roster for the match
        assignedEventTypes={assignedEventTypes} 
        assignedPlayers={assignedPlayers} 
        onEventRecord={handleEventRecord}
      />
    </div>
  );
}
