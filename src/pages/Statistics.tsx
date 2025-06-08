import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, Users, Activity, Target, BarChart3, PieChart } from 'lucide-react';
// import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer'; // Not used, can remove
// import TeamTimeSegmentCharts from '@/components/visualizations/TeamTimeSegmentCharts'; // Not used
// import PlayerHeatmap from '@/components/visualizations/PlayerHeatmap'; // Not used
import BallFlowVisualization from '@/components/visualizations/BallFlowVisualization';
import MatchRadarChart from '@/components/visualizations/MatchRadarChart';
import TeamPerformanceRadar from '@/components/analytics/TeamPerformanceRadar';
import AdvancedStatsTable from '@/components/analytics/AdvancedStatsTable';
import PlayerPerformanceChart from '@/components/analytics/PlayerPerformanceChart';
import EventTimelineChart from '@/components/analytics/EventTimelineChart';
import MatchHeatMap from '@/components/analytics/MatchHeatMap';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import DetailedStatsTable from '@/components/DetailedStatsTable';
import PassMatrixTable from '@/components/analytics/PassMatrixTable';
import ShotMap from '@/components/analytics/ShotMap'; // Import ShotMap
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Statistics as StatisticsType, MatchEvent, PlayerStatistics, EventType, ShotStats as TeamShotStats } from '@/types/index';
import { ShotEventData, PassEventData } from '@/types/eventData';
import { calculateXg } from '@/lib/analytics/xgCalculator';

const Statistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [statistics, setStatistics] = useState<StatisticsType>({
    possession: { home: 0, away: 0 },
    passes: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
    shots: { home: { onTarget: 0, offTarget: 0, total: 0, totalXg: 0 }, away: { onTarget: 0, offTarget: 0, total: 0, totalXg: 0 } },
    fouls: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    ballsPlayed: { home: 0, away: 0 },
    ballsLost: { home: 0, away: 0 },
    duels: { home: {}, away: {} },
    crosses: { home: {}, away: {} }
  });
  const [ballData, setBallData] = useState<any[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatistics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      fetchMatchData(selectedMatch);
    }
  }, [selectedMatch]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, name, home_team_name, away_team_name, match_date, status')
        .order('match_date', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
      
      if (data && data.length > 0) {
        setSelectedMatch(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchData = async (matchId: string) => {
    try {
      setLoading(true);
      
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('match_statistics, ball_tracking_data, home_team_name, away_team_name, home_team_players, away_team_players')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      const { data: eventsData, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
      } else {
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
          if (!coordinates.x) coordinates.x = 0;
          if (!coordinates.y) coordinates.y = 0;

          return {
            id: event.id,
            match_id: event.match_id,
            timestamp: event.timestamp || 0,
            type: event.event_type as EventType,
            event_data: event.event_data,
            created_at: event.created_at,
            tracker_id: null,
            team_id: null,
            player_id: event.player_id,
            team: event.team === 'home' || event.team === 'away' ? event.team : undefined,
            coordinates,
            created_by: event.created_by,
          };
        });
        setEvents(formattedEvents);

        // Always recalculate stats client-side to ensure xG is included
        const calculatedStats = calculateStatisticsFromEvents(formattedEvents);
        setStatistics(calculatedStats);

        const calculatedPlayerStats = calculatePlayerStatistics(formattedEvents, matchData);
        setPlayerStats(calculatedPlayerStats);
      }

      if (matchData?.ball_tracking_data) {
        const ballTrackingArray = Array.isArray(matchData.ball_tracking_data) 
          ? matchData.ball_tracking_data 
          : [];
        const ballDataFiltered = ballTrackingArray.filter((point: any) => 
          point && typeof point.x === 'number' && typeof point.y === 'number' &&
          !isNaN(point.x) && !isNaN(point.y)
        );
        setBallData(ballDataFiltered);
      } else {
        setBallData([]);
      }

    } catch (error) {
      console.error('Error fetching match data:', error);
      toast({
        title: "Error",
        description: "Failed to load match data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatisticsFromEvents = (currentEvents: MatchEvent[]): StatisticsType => {
    const homeEvents = currentEvents.filter(e => e.team === 'home');
    const awayEvents = currentEvents.filter(e => e.team === 'away');

    const calculateTeamShotStats = (teamFilteredEvents: MatchEvent[]): TeamShotStats => {
      const shots = teamFilteredEvents.filter(e => e.type === 'shot');
      let totalXgForTeam = 0;
      shots.forEach(shot => {
        if (shot.event_data) {
          const shotData = shot.event_data as ShotEventData;
          if (typeof shotData.on_target === 'boolean') {
            totalXgForTeam += calculateXg(shotData, shot.coordinates);
          }
        }
      });
      return {
        onTarget: shots.filter(e => e.event_data && (e.event_data as ShotEventData).on_target === true).length,
        offTarget: shots.filter(e => e.event_data && (e.event_data as ShotEventData).on_target === false).length,
        total: shots.length,
        totalXg: totalXgForTeam,
      };
    };

    const calculateTeamPassStats = (teamFilteredEvents: MatchEvent[]) => {
        const passes = teamFilteredEvents.filter(e => e.type === 'pass');
        return {
            successful: passes.filter(e => e.event_data && (e.event_data as PassEventData).success === true).length,
            attempted: passes.length,
        };
    };

    const homePassStats = calculateTeamPassStats(homeEvents);
    const awayPassStats = calculateTeamPassStats(awayEvents);
    const homeShotStats = calculateTeamShotStats(homeEvents);
    const awayShotStats = calculateTeamShotStats(awayEvents);

    const totalEventsCount = homeEvents.length + awayEvents.length;
    const homePossession = totalEventsCount > 0 ? Math.round((homeEvents.length / totalEventsCount) * 100) : 50;
    const awayPossession = 100 - homePossession;

    return {
      possession: { home: homePossession, away: awayPossession },
      passes: { home: homePassStats, away: awayPassStats },
      shots: { home: homeShotStats, away: awayShotStats },
      fouls: { home: homeEvents.filter(e => e.type === 'foul').length, away: awayEvents.filter(e => e.type === 'foul').length },
      corners: { home: homeEvents.filter(e => e.type === 'corner').length, away: awayEvents.filter(e => e.type === 'corner').length },
      offsides: { home: homeEvents.filter(e => e.type === 'offside').length, away: awayEvents.filter(e => e.type === 'offside').length },
      ballsPlayed: { home: homeEvents.length, away: awayEvents.length },
      ballsLost: { home: homeEvents.filter(e => e.type === 'ballLost').length, away: awayEvents.filter(e => e.type === 'ballLost').length },
      duels: { home: {won: 0, total:0}, away: {won:0, total:0} }, // Placeholder
      crosses: { home: {total:0, successful:0}, away: {total:0, successful:0} } // Placeholder
    };
  };

  const calculatePlayerStatistics = (currentEvents: MatchEvent[], matchDetailData: any): PlayerStatistics[] => {
    const playerStatsMap = new Map<string | number, PlayerStatistics>();

    const getPlayerName = (playerId: string | number, teamSide: 'home' | 'away') => {
      const playersList = teamSide === 'home' ? matchDetailData?.home_team_players : matchDetailData?.away_team_players;
      const player = (playersList || []).find((p: any) => String(p.id) === String(playerId) || String(p.player_id) === String(playerId) || String(p.jersey_number) === String(playerId));
      return player?.name || player?.player_name || `Player ${playerId}`;
    };

    currentEvents.forEach(event => {
      if (!event.player_id) return;
      const playerId = event.player_id;
      const playerTeam = event.team || 'home';

      if (!playerStatsMap.has(playerId)) {
        const playerName = getPlayerName(playerId, playerTeam);
        playerStatsMap.set(playerId, {
          playerId,
          playerName: playerName,
          team: playerTeam,
          events: {
            passes: { successful: 0, attempted: 0 },
            shots: { onTarget: 0, offTarget: 0 },
            tackles: { successful: 0, attempted: 0 },
            fouls: 0,
            cards: { yellow: 0, red: 0 },
            goals: 0,
            assists: 0,
          },
          totalXg: 0,
        });
      }

      const currentPlayerStats = playerStatsMap.get(playerId)!;

      switch (event.type) {
        case 'pass':
          currentPlayerStats.events.passes.attempted++;
          if (event.event_data && (event.event_data as PassEventData).success === true) {
            currentPlayerStats.events.passes.successful++;
          }
          break;
        case 'shot':
          let xgValue = 0;
          if (event.event_data) {
            const shotData = event.event_data as ShotEventData;
            if (typeof shotData.on_target === 'boolean') {
              xgValue = calculateXg(shotData, event.coordinates);
              if (shotData.on_target === true) {
                currentPlayerStats.events.shots.onTarget++;
              } else {
                currentPlayerStats.events.shots.offTarget++;
              }
            }
          }
          currentPlayerStats.totalXg = (currentPlayerStats.totalXg || 0) + xgValue;
          break;
        case 'goal':
          currentPlayerStats.events.goals++;
          break;
        case 'foul':
          currentPlayerStats.events.fouls++;
          break;
        case 'yellowCard':
          currentPlayerStats.events.cards.yellow++;
          break;
        case 'redCard':
          currentPlayerStats.events.cards.red++;
          break;
      }
    });

    return Array.from(playerStatsMap.values());
  };

  const selectedMatchData = matches.find(m => m.id === selectedMatch);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Match Statistics</h1>
        </div>
        <div className="text-center py-8">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Match Statistics & Analytics</h1>
        </div>
        <Select value={selectedMatch} onValueChange={setSelectedMatch}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Select a match" />
          </SelectTrigger>
          <SelectContent>
            {matches.map((match) => (
              <SelectItem key={match.id} value={match.id}>
                {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                {match.match_date && ` - ${new Date(match.match_date).toLocaleDateString()}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedMatchData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{selectedMatchData.name || `${selectedMatchData.home_team_name} vs ${selectedMatchData.away_team_name}`}</CardTitle>
              <CardDescription>
                {selectedMatchData.match_date && `Match Date: ${new Date(selectedMatchData.match_date).toLocaleDateString()}`}
                {selectedMatchData.status && ` • Status: ${selectedMatchData.status}`}
                {` • ${events.length} events recorded`}
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{events.length}</div>
                <p className="text-xs text-muted-foreground">
                  Home: {events.filter(e => e.team === 'home').length} • Away: {events.filter(e => e.team === 'away').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Passes</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(statistics.passes?.home?.attempted || 0) + (statistics.passes?.away?.attempted || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Home: {statistics.passes?.home?.attempted || 0} • Away: {statistics.passes?.away?.attempted || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Shots</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((statistics.shots?.home?.total || 0)) + ((statistics.shots?.away?.total || 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Home: {statistics.shots?.home?.total || 0} • Away: {statistics.shots?.away?.total || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ball Tracking Points</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ballData.length}</div>
                <p className="text-xs text-muted-foreground">
                  Tracked ball positions
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-8"> {/* Updated to grid-cols-8 */}
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="shotmap">Shot Map / xG</TabsTrigger> {/* New Tab */}
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="passes">Passes</TabsTrigger>
              <TabsTrigger value="flow">Ball Flow</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MatchRadarChart 
                  statistics={statistics}
                  homeTeamName={selectedMatchData.home_team_name}
                  awayTeamName={selectedMatchData.away_team_name}
                />
                <StatisticsDisplay
                  statistics={statistics}
                  homeTeamName={selectedMatchData.home_team_name}
                  awayTeamName={selectedMatchData.away_team_name}
                />
              </div>
              <EventTimelineChart
                events={events}
                homeTeamName={selectedMatchData.home_team_name}
                awayTeamName={selectedMatchData.away_team_name}
              />
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Detailed Match Statistics
                  </CardTitle>
                  <CardDescription>Comprehensive breakdown of match statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <DetailedStatsTable
                    statistics={statistics}
                    homeTeamName={selectedMatchData.home_team_name}
                    awayTeamName={selectedMatchData.away_team_name}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <PlayerPerformanceChart
                playerStats={playerStats}
                homeTeamName={selectedMatchData.home_team_name}
                awayTeamName={selectedMatchData.away_team_name}
              />
              <TeamPerformanceRadar
                statistics={statistics}
                homeTeamName={selectedMatchData.home_team_name}
                awayTeamName={selectedMatchData.away_team_name}
              />
            </TabsContent>

            <TabsContent value="shotmap" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Shot Analysis & Expected Goals (xG)
                  </CardTitle>
                  <CardDescription>
                    Shot locations, outcomes, and Expected Goals (xG) values for each team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-md">
                          {selectedMatchData?.home_team_name || 'Home'} - Total Expected Goals (xG)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {statistics.shots?.home?.totalXg?.toFixed(2) || '0.00'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-md">
                          {selectedMatchData?.away_team_name || 'Away'} - Total Expected Goals (xG)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {statistics.shots?.away?.totalXg?.toFixed(2) || '0.00'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <ShotMap
                    shots={events.filter(event => event.type === 'shot')}
                    homeTeamName={selectedMatchData?.home_team_name}
                    awayTeamName={selectedMatchData?.away_team_name}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <MatchHeatMap
                events={events}
                homeTeamName={selectedMatchData.home_team_name}
                awayTeamName={selectedMatchData.away_team_name}
              />
              <AdvancedStatsTable
                statistics={statistics}
                homeTeamName={selectedMatchData.home_team_name}
                awayTeamName={selectedMatchData.away_team_name}
              />
            </TabsContent>

            <TabsContent value="players" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Player Performance
                  </CardTitle>
                  <CardDescription>Individual player statistics and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Player</th>
                          <th className="text-center py-2">Team</th>
                          <th className="text-center py-2">Passes</th>
                          <th className="text-center py-2">Pass Accuracy</th>
                          <th className="text-center py-2">Shots</th>
                          <th className="text-center py-2">Goals</th>
                          <th className="text-center py-2">Assists</th>
                          <th className="text-center py-2">xG</th> {/* New Header */}
                          <th className="text-center py-2">Fouls</th>
                          <th className="text-center py-2">Cards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerStats.map((player) => (
                          <tr key={player.playerId} className="border-b hover:bg-gray-50">
                            <td className="py-2 font-medium">{player.playerName}</td>
                            <td className="text-center py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                player.team === 'home' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {player.team === 'home' ? selectedMatchData.home_team_name : selectedMatchData.away_team_name}
                              </span>
                            </td>
                            <td className="text-center py-2">
                              {player.events.passes.successful}/{player.events.passes.attempted}
                            </td>
                            <td className="text-center py-2">
                              {player.events.passes.attempted > 0 
                                ? `${Math.round((player.events.passes.successful / player.events.passes.attempted) * 100)}%`
                                : '0%'
                              }
                            </td>
                            <td className="text-center py-2">
                              {player.events.shots.onTarget + player.events.shots.offTarget}
                            </td>
                            <td className="text-center py-2">{player.events.goals}</td>
                            <td className="text-center py-2">{player.events.assists}</td>
                            <td className="text-center py-2">{player.totalXg?.toFixed(2) || '0.00'}</td> {/* xG Value */}
                            <td className="text-center py-2">{player.events.fouls}</td>
                            <td className="text-center py-2">
                              <div className="flex justify-center gap-1">
                                {player.events.cards.yellow > 0 && (
                                  <span className="bg-yellow-400 text-white px-1 py-0.5 rounded text-xs">
                                    {player.events.cards.yellow}Y
                                  </span>
                                )}
                                {player.events.cards.red > 0 && (
                                  <span className="bg-red-500 text-white px-1 py-0.5 rounded text-xs">
                                    {player.events.cards.red}R
                                  </span>
                                )}
                                {player.events.cards.yellow === 0 && player.events.cards.red === 0 && (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {playerStats.length === 0 && (
                          <tr>
                            <td colSpan={10} className="text-center py-8 text-gray-500"> {/* Updated colSpan */}
                              No player statistics available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="passes" className="space-y-6">
              <PassMatrixTable
                events={events}
                homeTeamName={selectedMatchData.home_team_name}
                awayTeamName={selectedMatchData.away_team_name}
                homeTeamPlayers={selectedMatchData.home_team_players || []}
                awayTeamPlayers={selectedMatchData.away_team_players || []}
              />
            </TabsContent>

            <TabsContent value="flow" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Ball Flow Analysis
                  </CardTitle>
                  <CardDescription>Visualization of ball movement and flow patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  {ballData.length > 0 ? (
                    <BallFlowVisualization
                      ballTrackingPoints={ballData}
                      homeTeam={{ id: 'home', name: selectedMatchData.home_team_name, players: [], formation: '4-4-2' }}
                      awayTeam={{ id: 'away', name: selectedMatchData.away_team_name, players: [], formation: '4-4-2' }}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No ball tracking data available for visualization</p>
                      <p className="text-sm">Use ball tracking mode during matches to see flow patterns</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Statistics;
