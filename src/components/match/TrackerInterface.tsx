
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EventType, PlayerForPianoInput, AssignedPlayers } from '@/components/match/types';
import { PianoInput } from './PianoInput';

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
  const [assignedEventTypes, setAssignedEventTypes] = useState<EventType[] | null>(null);
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
        console.log('TrackerInterface - Fetching assignments for:', { trackerUserId, matchId });

        // Fetch match data for full roster
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('home_team_players, away_team_players')
          .eq('id', matchId)
          .single();

        if (matchError) {
          console.error('Error fetching match data:', matchError);
          throw new Error(`Failed to fetch match data: ${matchError.message}`);
        }

        // Parse the player data from the match
        const homeTeamPlayers = typeof matchData.home_team_players === 'string' 
          ? JSON.parse(matchData.home_team_players) 
          : matchData.home_team_players || [];
        
        const awayTeamPlayers = typeof matchData.away_team_players === 'string' 
          ? JSON.parse(matchData.away_team_players) 
          : matchData.away_team_players || [];

        const currentFullRoster: AssignedPlayers = { 
          home: homeTeamPlayers.map((p: any, index: number) => ({
            id: p.id || `home-${index}`,
            player_name: p.name || `Player ${index + 1}`,
            jersey_number: p.number || index + 1,
            team_context: 'home'
          })), 
          away: awayTeamPlayers.map((p: any, index: number) => ({
            id: p.id || `away-${index}`,
            player_name: p.name || `Player ${index + 1}`,
            jersey_number: p.number || index + 1,
            team_context: 'away'
          }))
        };
        setFullMatchRoster(currentFullRoster);
        console.log('TrackerInterface - Full match roster:', currentFullRoster);

        // Fetch assigned event types
        const { data: eventAssignmentsData, error: eventAssignmentsError } = await supabase
          .from('user_event_assignments')
          .select('event_type')
          .eq('user_id', trackerUserId);

        if (eventAssignmentsError) {
          console.error('Error fetching event type assignments:', eventAssignmentsError);
          setAssignedEventTypes([]);
        } else {
          const processedEventTypes: EventType[] = eventAssignmentsData
            ? eventAssignmentsData.map((assignment: any) => {
                const foundConfig = ALL_EVENT_TYPES_CONFIG.find(et => et.key === assignment.event_type);
                return foundConfig ? { key: foundConfig.key, label: foundConfig.label } : { key: assignment.event_type, label: assignment.event_type };
              })
            : [];
          setAssignedEventTypes(processedEventTypes);
          console.log('TrackerInterface - Assigned event types:', processedEventTypes);
        }
        
        // Fetch assigned player IDs
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
          console.log('TrackerInterface - Assigned player IDs:', playerIds);

          if (playerIds.length > 0 && currentFullRoster) {
            const assignedHomePlayers = currentFullRoster.home.filter(p => playerIds.includes(p.id.toString()));
            const assignedAwayPlayers = currentFullRoster.away.filter(p => playerIds.includes(p.id.toString()));
            const assignedPlayersData = { home: assignedHomePlayers, away: assignedAwayPlayers };
            setAssignedPlayers(assignedPlayersData);
            console.log('TrackerInterface - Assigned players:', assignedPlayersData);
          } else {
             setAssignedPlayers({ home: [], away: [] });
          }
        } else {
          console.log('TrackerInterface - No player assignments found');
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

  const handleEventRecord = (eventType: EventType, player?: PlayerForPianoInput, details?: Record<string, any>) => {
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Match Tracking Interface</h1>
      <p className="text-sm text-gray-600 mb-1">Tracker: {trackerUserId}</p>
      <p className="text-sm text-gray-600 mb-4">Match: {matchId}</p>
      
      <PianoInput
        fullMatchRoster={fullMatchRoster}
        assignedEventTypes={assignedEventTypes}
        assignedPlayers={assignedPlayers}
        onEventRecord={handleEventRecord}
      />
    </div>
  );
}
