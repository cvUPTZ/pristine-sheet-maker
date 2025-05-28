import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Assuming supabase client path

// Define or import necessary types
// Assuming these types would be defined in a central types file e.g., '@/types'
// For this example, let's define simplified versions here or assume their structure.

export type Formation = 
  | '4-4-2' | '4-3-3' | '3-5-2' | '4-5-1' | '4-2-3-1' | '3-4-3' | '5-3-2'
  | 'Unknown'; // Add more as needed or 'Unknown' for default

export interface MatchDataInHook {
  id: string;
  name: string;
  status: string;
  home_team_name: string | null;
  away_team_name: string | null;
  home_team_formation: string | null; // Should align with Formation type if possible
  away_team_formation: string | null; // Should align with Formation type if possible
  // Add any other fields from your 'matches' table that are relevant
  created_at?: string;
  description?: string | null;
  match_type?: string | null;
  // etc.
}

export interface MatchEvent {
  id: string;
  match_id: string;
  timestamp: number; // Or string if it's a timestampz
  event_type: string;
  event_data: Record<string, any> | null; // JSONB data for the event
  // Add other fields from your 'match_events' table
  created_at?: string;
  tracker_id?: string | null;
  team_id?: string | null; // If applicable
}

export interface TeamHeaderData {
  name: string;
  formation: Formation; // Using the Formation type
}

const useMatchData = (matchId: string | undefined) => {
  const [match, setMatch] = useState<MatchDataInHook | null>(null);
  const [homeTeam, setHomeTeam] = useState<TeamHeaderData | null>(null);
  const [awayTeam, setAwayTeam] = useState<TeamHeaderData | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!matchId) {
      setError('No match ID provided.');
      setMatch(null);
      setHomeTeam(null);
      setAwayTeam(null);
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMatch(null);
    setHomeTeam(null);
    setAwayTeam(null);
    setEvents([]);

    try {
      // Fetch Match Core Data
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*') // Consider specifying columns for optimization
        .eq('id', matchId)
        .single();

      if (matchError) {
        // .single() throws an error if no rows are found, or more than one row is found.
        // This error often has a code PGRST116 if no rows are found due to RLS or actual absence.
        console.error('Error fetching match data:', matchError);
        throw new Error(matchError.message || 'Failed to fetch match data.');
      }

      if (!matchData) {
        // This case should ideally be caught by matchError with .single(),
        // but as a safeguard or if .maybeSingle() were used.
        throw new Error('Match not found.');
      }

      setMatch(matchData as MatchDataInHook);

      // Derive and Set Team Data
      const homeFormation = (matchData.home_team_formation || '4-4-2') as Formation;
      const awayFormation = (matchData.away_team_formation || '4-3-3') as Formation;

      setHomeTeam({
        name: matchData.home_team_name || 'Home Team Default',
        formation: homeFormation,
      });
      setAwayTeam({
        name: matchData.away_team_name || 'Away Team Default',
        formation: awayFormation,
      });

      // Fetch Match Events
      const { data: eventsData, error: eventsError } = await supabase
        .from('match_events') // Ensure this table name is correct
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (eventsError) {
        console.error('Error fetching match events:', eventsError);
        // Not throwing here, as match data might still be useful.
        // Set events to empty array or handle more gracefully.
        setEvents([]);
        // Optionally, set a partial error state or log this specific error without failing all data
        // setError(prevError => prevError ? `${prevError}\nFailed to fetch events: ${eventsError.message}` : `Failed to fetch events: ${eventsError.message}`);
      } else {
        setEvents(eventsData || []);
      }

    } catch (err: any) {
      console.error('Full error in useMatchData:', err);
      setError(err.message || 'An unexpected error occurred while loading match data.');
      setMatch(null);
      setHomeTeam(null);
      setAwayTeam(null);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData is memoized with useCallback, dependency is matchId

  return { match, homeTeam, awayTeam, events, isLoading, error };
};

export default useMatchData;
