
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchEvent, Statistics, PlayerStatistics, EventType } from '@/types';
import { aggregateMatchEvents } from '@/lib/analytics/eventAggregator';

export interface MatchState {
  events: MatchEvent[];
  statistics: Statistics;
  playerStats: PlayerStatistics[];
  loading: boolean;
  error: string | null;
}

export const useMatchState = (matchId: string | undefined) => {
  const [state, setState] = useState<MatchState>({
    events: [],
    statistics: {
      home: {
        shots: 0,
        shotsOnTarget: 0,
        goals: 0,
        assists: 0,
        passesAttempted: 0,
        passesCompleted: 0,
        foulsCommitted: 0,
        yellowCards: 0,
        redCards: 0,
        corners: 0,
        offsides: 0,
        tackles: 0,
        interceptions: 0,
        crosses: 0,
        clearances: 0,
        blocks: 0,
        possession: 0,
        totalXg: 0,
        supportPasses: 0,
        offensivePasses: 0,
        ballsRecovered: 0,
        ballsLost: 0,
        ballsPlayed: 0,
        contacts: 0,
        freeKicks: 0,
        sixMeterViolations: 0,
        possessionMinutes: 0,
        possessionPercentage: 0,
        dangerousFootShots: 0,
        nonDangerousFootShots: 0,
        footShotsOnTarget: 0,
        footShotsOffTarget: 0,
        footShotsPostHits: 0,
        footShotsBlocked: 0,
        dangerousHeaderShots: 0,
        nonDangerousHeaderShots: 0,
        headerShotsOnTarget: 0,
        headerShotsOffTarget: 0,
        headerShotsPostHits: 0,
        headerShotsBlocked: 0,
        duelsWon: 0,
        duelsLost: 0,
        aerialDuelsWon: 0,
        aerialDuelsLost: 0,
        decisivePasses: 0,
        successfulCrosses: 0,
        successfulDribbles: 0,
        longPasses: 0,
        forwardPasses: 0,
        backwardPasses: 0,
        lateralPasses: 0,
      },
      away: {
        shots: 0,
        shotsOnTarget: 0,
        goals: 0,
        assists: 0,
        passesAttempted: 0,
        passesCompleted: 0,
        foulsCommitted: 0,
        yellowCards: 0,
        redCards: 0,
        corners: 0,
        offsides: 0,
        tackles: 0,
        interceptions: 0,
        crosses: 0,
        clearances: 0,
        blocks: 0,
        possession: 0,
        totalXg: 0,
        supportPasses: 0,
        offensivePasses: 0,
        ballsRecovered: 0,
        ballsLost: 0,
        ballsPlayed: 0,
        contacts: 0,
        freeKicks: 0,
        sixMeterViolations: 0,
        possessionMinutes: 0,
        possessionPercentage: 0,
        dangerousFootShots: 0,
        nonDangerousFootShots: 0,
        footShotsOnTarget: 0,
        footShotsOffTarget: 0,
        footShotsPostHits: 0,
        footShotsBlocked: 0,
        dangerousHeaderShots: 0,
        nonDangerousHeaderShots: 0,
        headerShotsOnTarget: 0,
        headerShotsOffTarget: 0,
        headerShotsPostHits: 0,
        headerShotsBlocked: 0,
        duelsWon: 0,
        duelsLost: 0,
        aerialDuelsWon: 0,
        aerialDuelsLost: 0,
        decisivePasses: 0,
        successfulCrosses: 0,
        successfulDribbles: 0,
        longPasses: 0,
        forwardPasses: 0,
        backwardPasses: 0,
        lateralPasses: 0,
      },
    },
    playerStats: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!matchId) {
      return;
    }

    const fetchMatchData = async () => {
      setState(prevState => ({ ...prevState, loading: true, error: null }));

      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('match_events')
          .select('*')
          .eq('match_id', matchId)
          .order('timestamp', { ascending: true });

        if (eventsError) {
          throw new Error(`Error fetching events: ${eventsError.message}`);
        }

        // Fetch match details to get home_team_players and away_team_players
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('home_team_players, away_team_players')
          .eq('id', matchId)
          .single();

        if (matchError) {
          throw new Error(`Error fetching match details: ${matchError.message}`);
        }

        // Parse player data from the match details
        const homeTeamPlayers = matchData?.home_team_players 
          ? (typeof matchData.home_team_players === 'string' 
              ? JSON.parse(matchData.home_team_players) 
              : matchData.home_team_players)
          : [];
        const awayTeamPlayers = matchData?.away_team_players 
          ? (typeof matchData.away_team_players === 'string' 
              ? JSON.parse(matchData.away_team_players) 
              : matchData.away_team_players)
          : [];

        // Transform raw events data to MatchEvent format
        const formattedEvents: MatchEvent[] = (eventsData || []).map(event => {
          let coordinates = { x: 0, y: 0 };
          if (event.coordinates) {
            try {
              if (typeof event.coordinates === 'string') {
                coordinates = JSON.parse(event.coordinates);
              } else if (typeof event.coordinates === 'object' && event.coordinates !== null) {
                coordinates = event.coordinates as { x: number; y: number };
              }
            } catch (e) {
              console.warn('Failed to parse coordinates:', event.coordinates);
            }
          }

          // Type cast to access the full event structure
          const fullEvent = event as any;

          return {
            id: event.id,
            match_id: event.match_id,
            timestamp: event.timestamp || 0,
            type: (event.event_type || 'pass') as EventType,
            event_data: fullEvent.event_data || null,
            created_at: event.created_at,
            tracker_id: fullEvent.tracker_id || null,
            team_id: fullEvent.team_id || null,
            player_id: event.player_id,
            team: event.team === 'home' || event.team === 'away' ? event.team : undefined,
            coordinates,
            created_by: event.created_by,
          };
        });

        const aggregatedData = aggregateMatchEvents(formattedEvents, homeTeamPlayers, awayTeamPlayers);

        setState(prevState => ({
          ...prevState,
          events: formattedEvents,
          statistics: {
            home: aggregatedData.homeTeamStats,
            away: aggregatedData.awayTeamStats,
          },
          playerStats: aggregatedData.playerStats,
          loading: false,
        }));

      } catch (error: any) {
        setState(prevState => ({ ...prevState, loading: false, error: error.message }));
      }
    };

    fetchMatchData();
  }, [matchId]);

  return state;
};
