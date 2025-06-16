import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchEvent, Statistics, PlayerStatistics } from '@/types';
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
        const homeTeamPlayers = matchData?.home_team_players ? JSON.parse(matchData.home_team_players) : [];
        const awayTeamPlayers = matchData?.away_team_players ? JSON.parse(matchData.away_team_players) : [];

        const aggregatedData = aggregateMatchEvents(eventsData || [], homeTeamPlayers, awayTeamPlayers);

        setState(prevState => ({
          ...prevState,
          events: eventsData || [],
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
