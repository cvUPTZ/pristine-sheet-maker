
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DetailedStatsTable from '@/components/DetailedStatsTable';
import TeamPerformanceRadar from '@/components/analytics/TeamPerformanceRadar';
import ShotMap from '@/components/analytics/ShotMap';
import PassingNetworkMap from '@/components/analytics/PassingNetworkMap';
import AdvancedStatsTable from '@/components/analytics/AdvancedStatsTable';
import EventTimelineChart from '@/components/analytics/EventTimelineChart';
import { PlayerForPianoInput } from '@/components/TrackerPianoInput';
import { MatchEvent } from '@/types/index';
import { ShotEventData, PassEventData } from '@/types/eventData';

interface MatchData {
  id: string;
  name: string;
  home_team_name: string;
  away_team_name: string;
  home_team_players: PlayerForPianoInput[];
  away_team_players: PlayerForPianoInput[];
  match_date: string;
  status: string;
}

interface DatabaseMatchEvent {
  id: string;
  match_id: string;
  event_type: string;
  timestamp: number | null;
  player_id: number | null;
  team: string | null;
  coordinates: any;
  created_at: string;
  created_by: string;
  type?: string;
  event_data?: any;
}

interface PlayerStatSummary {
  playerId: string | number;
  playerName: string;
  team: 'home' | 'away';
  jerseyNumber: number;
  passesAttempted: number;
  passesCompleted: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  assists: number;
  tackles: number;
  tacklesWon: number;
  foulsCommitted: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  distanceCovered: number;
  sprints: number;
  heatmapData: Array<{ x: number; y: number; intensity: number }>;
  passAccuracy: number;
  pressureApplied: number;
  pressureRegains: number;
  interceptions: number;
  crosses: number;
  clearances: number;
  blocks: number;
  dribbles: number;
}

const Statistics: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [events, setEvents] = useState<DatabaseMatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matchId) {
      fetchMatchData();
      fetchEvents();
    }
  }, [matchId]);

  const fetchMatchData = async () => {
    if (!matchId) return;
    
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;

      if (data) {
        setMatchData({
          id: data.id,
          name: data.name || '',
          home_team_name: data.home_team_name,
          away_team_name: data.away_team_name,
          home_team_players: Array.isArray(data.home_team_players) ? (data.home_team_players as unknown as PlayerForPianoInput[]) : [],
          away_team_players: Array.isArray(data.away_team_players) ? (data.away_team_players as unknown as PlayerForPianoInput[]) : [],
          match_date: data.match_date || '',
          status: data.status,
        });
      }
    } catch (error) {
      console.error('Error fetching match data:', error);
    }
  };

  const fetchEvents = async () => {
    if (!matchId) return;
    
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventsByType = useMemo(() => {
    return events.reduce((acc, event) => {
      const type = event.type || event.event_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(event);
      return acc;
    }, {} as Record<string, DatabaseMatchEvent[]>);
  }, [events]);

  const teamStats = useMemo(() => {
    const homeEvents = events.filter(e => e.team === 'home');
    const awayEvents = events.filter(e => e.team === 'away');

    const calculateTeamStats = (teamEvents: DatabaseMatchEvent[]) => {
      const shots = teamEvents.filter(e => (e.type || e.event_type) === 'shot');
      const passes = teamEvents.filter(e => (e.type || e.event_type) === 'pass');
      const goals = teamEvents.filter(e => (e.type || e.event_type) === 'goal');
      
      const shotsOnTarget = shots.filter(e => {
        try {
          const eventData = e.event_data as ShotEventData;
          return eventData && eventData.on_target === true;
        } catch {
          return false;
        }
      });

      const successfulPasses = passes.filter(e => {
        try {
          const eventData = e.event_data as PassEventData;
          return eventData && eventData.success === true;
        } catch {
          return false;
        }
      });

      return {
        shots: shots.length,
        shotsOnTarget: shotsOnTarget.length,
        goals: goals.length,
        passes: passes.length,
        passAccuracy: passes.length > 0 ? (successfulPasses.length / passes.length) * 100 : 0,
        possession: 0, // This would need to be calculated differently
      };
    };

    return {
      home: calculateTeamStats(homeEvents),
      away: calculateTeamStats(awayEvents),
    };
  }, [events]);

  const playerStatsSummaries = useMemo((): PlayerStatSummary[] => {
    if (!matchData) return [];

    const allPlayers = [
      ...(matchData.home_team_players || []).map(p => ({ ...p, team: 'home' as const })),
      ...(matchData.away_team_players || []).map(p => ({ ...p, team: 'away' as const }))
    ];

    return allPlayers.map(player => {
      const playerEvents = events.filter(e => e.player_id === player.id);
      
      const passes = playerEvents.filter(e => (e.type || e.event_type) === 'pass');
      const shots = playerEvents.filter(e => (e.type || e.event_type) === 'shot');
      const tackles = playerEvents.filter(e => (e.type || e.event_type) === 'tackle');
      const goals = playerEvents.filter(e => (e.type || e.event_type) === 'goal');
      const pressure = playerEvents.filter(e => (e.type || e.event_type) === 'pressure');

      const successfulPasses = passes.filter(e => {
        try {
          const eventData = e.event_data as PassEventData;
          return eventData && eventData.success === true;
        } catch {
          return false;
        }
      });

      const shotsOnTarget = shots.filter(e => {
        try {
          const eventData = e.event_data as ShotEventData;
          return eventData && eventData.on_target === true;
        } catch {
          return false;
        }
      });

      const successfulTackles = tackles.filter(e => {
        try {
          const eventData = e.event_data;
          return eventData && eventData.success === true;
        } catch {
          return false;
        }
      });

      return {
        playerId: player.id,
        playerName: player.name,
        team: player.team,
        jerseyNumber: player.jersey_number || 0,
        passesAttempted: passes.length,
        passesCompleted: successfulPasses.length,
        shots: shots.length,
        shotsOnTarget: shotsOnTarget.length,
        goals: goals.length,
        assists: 0,
        tackles: tackles.length,
        tacklesWon: successfulTackles.length,
        foulsCommitted: playerEvents.filter(e => (e.type || e.event_type) === 'foul').length,
        yellowCards: playerEvents.filter(e => (e.type || e.event_type) === 'yellowCard').length,
        redCards: playerEvents.filter(e => (e.type || e.event_type) === 'redCard').length,
        minutesPlayed: 90,
        distanceCovered: 0,
        sprints: 0,
        heatmapData: [],
        passAccuracy: passes.length > 0 ? (successfulPasses.length / passes.length) * 100 : 0,
        pressureApplied: pressure.length,
        pressureRegains: pressure.filter(e => {
          try {
            const eventData = e.event_data;
            return eventData && (eventData.outcome === 'regain_possession' || eventData.outcome === 'forced_turnover_error');
          } catch {
            return false;
          }
        }).length,
        interceptions: playerEvents.filter(e => (e.type || e.event_type) === 'interception').length,
        crosses: playerEvents.filter(e => (e.type || e.event_type) === 'cross').length,
        clearances: playerEvents.filter(e => (e.type || e.event_type) === 'clearance').length,
        blocks: playerEvents.filter(e => (e.type || e.event_type) === 'block').length,
        dribbles: playerEvents.filter(e => (e.type || e.event_type) === 'dribble').length,
      };
    });
  }, [matchData, events]);

  // Convert database events to MatchEvent format for components
  const convertedEvents: MatchEvent[] = useMemo(() => {
    return events
      .filter(event => event.timestamp !== null)
      .map(event => ({
        id: event.id,
        match_id: event.match_id,
        timestamp: event.timestamp || 0,
        event_data: event.event_data,
        created_at: event.created_at,
        tracker_id: null,
        team_id: null,
        player_id: event.player_id,
        team: event.team as 'home' | 'away',
        coordinates: event.coordinates,
        created_by: event.created_by,
        type: (event.type || event.event_type) as any,
        status: 'confirmed',
      }));
  }, [events]);

  if (loading || !matchData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <p>{loading ? 'Loading match statistics...' : 'Match not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Match Statistics</h1>
          <p className="text-gray-600">
            {matchData.home_team_name} vs {matchData.away_team_name}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(matchData.match_date).toLocaleDateString()} - {events.length} events recorded
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="players">Player Stats</TabsTrigger>
            <TabsTrigger value="shots">Shot Analysis</TabsTrigger>
            <TabsTrigger value="passing">Passing Network</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{events.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {teamStats.home.goals} - {teamStats.away.goals}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Shots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {teamStats.home.shots} - {teamStats.away.shots}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pass Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {teamStats.home.passAccuracy.toFixed(1)}% - {teamStats.away.passAccuracy.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TeamPerformanceRadar 
                statistics={{
                  possession: { home: teamStats.home.possession, away: teamStats.away.possession },
                  shots: { home: teamStats.home, away: teamStats.away },
                  passes: { home: teamStats.home, away: teamStats.away },
                  corners: { home: 0, away: 0 },
                  fouls: { home: 0, away: 0 },
                  offsides: { home: 0, away: 0 },
                  ballsPlayed: { home: 0, away: 0 },
                  ballsLost: { home: 0, away: 0 },
                  duels: { home: {}, away: {} },
                  crosses: { home: {}, away: {} }
                }}
                homeTeamName={matchData.home_team_name}
                awayTeamName={matchData.away_team_name}
              />
              <AdvancedStatsTable 
                statistics={{
                  possession: { home: teamStats.home.possession, away: teamStats.away.possession },
                  shots: { home: teamStats.home, away: teamStats.away },
                  passes: { home: teamStats.home, away: teamStats.away },
                  corners: { home: 0, away: 0 },
                  fouls: { home: 0, away: 0 },
                  offsides: { home: 0, away: 0 },
                  ballsPlayed: { home: 0, away: 0 },
                  ballsLost: { home: 0, away: 0 },
                  duels: { home: {}, away: {} },
                  crosses: { home: {}, away: {} }
                }}
                homeTeamName={matchData.home_team_name}
                awayTeamName={matchData.away_team_name}
              />
            </div>
          </TabsContent>

          <TabsContent value="players" className="mt-6">
            <DetailedStatsTable 
              statistics={{
                possession: { home: teamStats.home.possession, away: teamStats.away.possession },
                shots: { home: teamStats.home, away: teamStats.away },
                passes: { home: teamStats.home, away: teamStats.away },
                corners: { home: 0, away: 0 },
                fouls: { home: 0, away: 0 },
                offsides: { home: 0, away: 0 },
                ballsPlayed: { home: 0, away: 0 },
                ballsLost: { home: 0, away: 0 },
                duels: { home: {}, away: {} },
                crosses: { home: {}, away: {} }
              }}
              homeTeamName={matchData.home_team_name}
              awayTeamName={matchData.away_team_name}
            />
          </TabsContent>

          <TabsContent value="shots" className="mt-6">
            <ShotMap 
              shots={convertedEvents.filter(e => e.type === 'shot')}
              homeTeamName={matchData.home_team_name}
              awayTeamName={matchData.away_team_name}
            />
          </TabsContent>

          <TabsContent value="passing" className="mt-6">
            <PassingNetworkMap 
              passes={convertedEvents.filter(e => e.type === 'pass')}
              homePlayers={matchData.home_team_players || []}
              awayPlayers={matchData.away_team_players || []}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <EventTimelineChart 
              events={convertedEvents}
              homeTeamName={matchData.home_team_name}
              awayTeamName={matchData.away_team_name}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Statistics;
