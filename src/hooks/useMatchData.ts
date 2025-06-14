
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EventType, MatchEvent } from '@/types';

export type Formation = 
  | '4-4-2' | '4-3-3' | '3-5-2' | '4-5-1' | '4-2-3-1' | '3-4-3' | '5-3-2'
  | 'Unknown';

export interface MatchDataInHook {
  id: string;
  name: string;
  status: string;
  home_team_name: string | null;
  away_team_name: string | null;
  home_team_formation: string | null;
  away_team_formation: string | null;
  home_team_flag_url?: string | null;
  away_team_flag_url?: string | null;
  created_at?: string;
  description?: string | null;
  match_type?: string | null;
  start_time?: string;
  end_time?: string;
}

export interface TeamHeaderData {
  name: string;
  formation: Formation;
  flagUrl?: string | null;
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

    console.log('[useMatchData] Attempting to fetch data for matchId:', matchId);

    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) {
        console.error('Error fetching match data:', matchError);
        throw new Error(matchError.message || 'Failed to fetch match data.');
      }

      if (!matchData) {
        throw new Error('Match not found.');
      }

      console.log('[useMatchData] Successfully fetched matchData:', matchData);

      setMatch(matchData as MatchDataInHook);

      const homeFormation = (matchData.home_team_formation || '4-4-2') as Formation;
      const awayFormation = (matchData.away_team_formation || '4-3-3') as Formation;

      const homeTeamData = {
        name: matchData.home_team_name || 'Home Team Default',
        formation: homeFormation,
        flagUrl: matchData.home_team_flag_url,
      };
      const awayTeamData = {
        name: matchData.away_team_name || 'Away Team Default',
        formation: awayFormation,
        flagUrl: matchData.away_team_flag_url,
      };
      console.log('[useMatchData] Constructed homeTeamData:', homeTeamData);
      console.log('[useMatchData] Constructed awayTeamData:', awayTeamData);
      setHomeTeam(homeTeamData);
      setAwayTeam(awayTeamData);

      console.log('Fetching match events for match ID:', matchId);

      const { data: eventsData, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (eventsError) {
        console.error('Error fetching match events:', eventsError);
        setEvents([]);
      } else {
        console.log('Events data fetched:', eventsData);
        const formattedEvents: MatchEvent[] = (eventsData || [])
          .filter(event => event.timestamp !== null)
          .map(event => ({
            id: event.id,
            match_id: event.match_id,
            timestamp: event.timestamp || 0,
            type: event.event_type as EventType,
            event_data: {},
            created_at: event.created_at,
            tracker_id: '',
            team_id: event.team,
            player_id: event.player_id || undefined,
            team: (event.team === 'home' || event.team === 'away') ? event.team : undefined,
            coordinates: event.coordinates ? 
              (event.coordinates as any)?.x !== undefined ? 
                event.coordinates as { x: number; y: number } : 
                { x: 0, y: 0 } : 
              { x: 0, y: 0 },
            created_by: event.created_by,
          }));
        setEvents(formattedEvents);
      }

    } catch (err: any) {
      console.error('[useMatchData] Error during fetch:', err);
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
  }, [fetchData]);

  return { match, homeTeam, awayTeam, events, isLoading, error };
};

export default useMatchData;
