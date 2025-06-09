
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
import { MatchEvent, Player } from '@/types/index';
import { ShotEventData, PassEventData } from '@/types/eventData';
import { PlayerStatSummary, aggregateMatchEvents } from '@/lib/analytics/eventAggregator';

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

  // Convert PlayerForPianoInput to Player format
  const convertToPlayer = (player: PlayerForPianoInput): Player => ({
    id: player.id,
    name: player.name,
    position: player.position || 'Unknown',
    number: player.jersey_number || 0,
    jersey_number: player.jersey_number,
  });

  // Get aggregated stats using the event aggregator
  const aggregatedStats = useMemo(() => {
    if (!matchData) return null;
    
    const homePlayers = (matchData.home_team_players || []).map(convertToPlayer);
    const awayPlayers = (matchData.away_team_players || []).map(convertToPlayer);
    
    return aggregateMatchEvents(convertedEvents, homePlayers, awayPlayers);
  }, [matchData, convertedEvents]);

  // Create proper Statistics interface data for components
  const statisticsData = useMemo(() => {
    return {
      possession: { home: teamStats.home.possession, away: teamStats.away.possession },
      shots: { 
        home: { 
          onTarget: teamStats.home.shotsOnTarget, 
          offTarget: teamStats.home.shots - teamStats.home.shotsOnTarget,
          total: teamStats.home.shots,
          totalXg: aggregatedStats?.homeTeamStats.totalXg || 0
        }, 
        away: { 
          onTarget: teamStats.away.shotsOnTarget, 
          offTarget: teamStats.away.shots - teamStats.away.shotsOnTarget,
          total: teamStats.away.shots,
          totalXg: aggregatedStats?.awayTeamStats.totalXg || 0
        } 
      },
      passes: { 
        home: { 
          successful: Math.round(teamStats.home.passes * (teamStats.home.passAccuracy / 100)), 
          attempted: teamStats.home.passes 
        }, 
        away: { 
          successful: Math.round(teamStats.away.passes * (teamStats.away.passAccuracy / 100)), 
          attempted: teamStats.away.passes 
        } 
      },
      corners: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      offsides: { home: 0, away: 0 },
      ballsPlayed: { home: 0, away: 0 },
      ballsLost: { home: 0, away: 0 },
      duels: { home: {}, away: {} },
      crosses: { home: {}, away: {} }
    };
  }, [teamStats, aggregatedStats]);

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
                statistics={statisticsData}
                homeTeamName={matchData.home_team_name}
                awayTeamName={matchData.away_team_name}
              />
              <AdvancedStatsTable 
                statistics={statisticsData}
                homeTeamName={matchData.home_team_name}
                awayTeamName={matchData.away_team_name}
              />
            </div>
          </TabsContent>

          <TabsContent value="players" className="mt-6">
            <DetailedStatsTable 
              statistics={statisticsData}
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
            {aggregatedStats && (
              <PassingNetworkMap 
                playerStats={aggregatedStats.playerStats}
                allPlayers={[
                  ...(matchData.home_team_players || []).map(convertToPlayer), 
                  ...(matchData.away_team_players || []).map(convertToPlayer)
                ]}
                homeTeam={{ 
                  id: 'home', 
                  name: matchData.home_team_name, 
                  formation: '4-4-2', 
                  players: (matchData.home_team_players || []).map(convertToPlayer)
                }}
                awayTeam={{ 
                  id: 'away', 
                  name: matchData.away_team_name, 
                  formation: '4-3-3', 
                  players: (matchData.away_team_players || []).map(convertToPlayer)
                }}
              />
            )}
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
