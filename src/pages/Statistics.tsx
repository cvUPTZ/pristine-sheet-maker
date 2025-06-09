import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, Users, Activity, Target, BarChart3, PieChart, Share2, ShieldCheck } from 'lucide-react'; // Added Share2, ShieldCheck
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
import ShotMap from '@/components/analytics/ShotMap';
import PassingNetworkMap from '@/components/analytics/PassingNetworkMap';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Statistics as StatisticsType, MatchEvent, PlayerStatistics, EventType, ShotStats as TeamShotStats, Player, Team } from '@/types/index';
import { aggregateMatchEvents, AggregatedStats, PlayerStatSummary as AggPlayerStatSummary } from '@/lib/analytics/eventAggregator';

const Statistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [selectedMatchFullData, setSelectedMatchFullData] = useState<any>(null);
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
  const [allPlayersForMatch, setAllPlayersForMatch] = useState<Player[]>([]);


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
      
      const { data: matchDetailData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      setSelectedMatchFullData(matchDetailData);

      const { data: eventsData, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        setEvents([]);
      } else {
        const homePlayersList: Player[] = matchDetailData.home_team_players || [];
        const awayPlayersList: Player[] = matchDetailData.away_team_players || [];
        const allPlayers = [...homePlayersList, ...awayPlayersList];
        setAllPlayersForMatch(allPlayers);

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
            player: allPlayers.find((p: Player) => String(p.id) === String(event.player_id) || p.jersey_number === event.player_id) // Simplified lookup
          };
        });
        setEvents(formattedEvents);

        const aggregatedData: AggregatedStats = aggregateMatchEvents(formattedEvents, homePlayersList, awayPlayersList);

        const homeTeamEventsCount = formattedEvents.filter(e => e.team === 'home').length;
        const awayTeamEventsCount = formattedEvents.filter(e => e.team === 'away').length;
        const totalEventsCount = homeTeamEventsCount + awayTeamEventsCount;
        const homePossession = totalEventsCount > 0 ? Math.round((homeTeamEventsCount / totalEventsCount) * 100) : 50;

        setStatistics({
            possession: { home: homePossession, away: 100 - homePossession },
            shots: {
                home: { onTarget: aggregatedData.homeTeamStats.shotsOnTarget, offTarget: aggregatedData.homeTeamStats.shots - aggregatedData.homeTeamStats.shotsOnTarget, total: aggregatedData.homeTeamStats.shots, totalXg: aggregatedData.homeTeamStats.totalXg },
                away: { onTarget: aggregatedData.awayTeamStats.shotsOnTarget, offTarget: aggregatedData.awayTeamStats.shots - aggregatedData.awayTeamStats.shotsOnTarget, total: aggregatedData.awayTeamStats.shots, totalXg: aggregatedData.awayTeamStats.totalXg }
            },
            passes: {
                home: { successful: aggregatedData.homeTeamStats.passesCompleted, attempted: aggregatedData.homeTeamStats.passesAttempted },
                away: { successful: aggregatedData.awayTeamStats.passesCompleted, attempted: aggregatedData.awayTeamStats.passesAttempted }
            },
            fouls: { home: aggregatedData.homeTeamStats.foulsCommitted, away: aggregatedData.awayTeamStats.foulsCommitted },
            corners: { home: aggregatedData.homeTeamStats.corners, away: aggregatedData.awayTeamStats.corners },
            offsides: { home: aggregatedData.homeTeamStats.offsides, away: aggregatedData.awayTeamStats.offsides },
            ballsPlayed: { home: homeTeamEventsCount, away: awayTeamEventsCount },
            ballsLost: { home: 0, away: 0 },
            duels: { home: {}, away: {} },
            crosses: { home: {}, away: {} }
        });

        const pagePlayerStats: PlayerStatistics[] = aggregatedData.playerStats.map((aggPlayer: AggPlayerStatSummary) => ({
            playerId: aggPlayer.playerId,
            playerName: aggPlayer.playerName,
            team: aggPlayer.team,
            teamId: aggPlayer.team,
            player: allPlayersForMatch.find(p => String(p.id) === String(aggPlayer.playerId) || p.jersey_number === aggPlayer.jersey_number),
            events: {
                passes: { successful: aggPlayer.passesCompleted, attempted: aggPlayer.passesAttempted },
                shots: { onTarget: aggPlayer.shotsOnTarget, offTarget: aggPlayer.shots - aggPlayer.shotsOnTarget },
                goals: aggPlayer.goals,
                assists: aggPlayer.assists,
                fouls: aggPlayer.foulsCommitted,
                cards: { yellow: aggPlayer.yellowCards, red: aggPlayer.redCards },
                tackles: { successful: aggPlayer.tackles, attempted: aggPlayer.tackles }
            },
            totalXg: aggPlayer.totalXg,
            progressivePasses: aggPlayer.progressivePasses,
            passesToFinalThird: aggPlayer.passesToFinalThird,
            passNetworkSent: aggPlayer.passNetworkSent,
            totalPressures: aggPlayer.totalPressures,
            successfulPressures: aggPlayer.successfulPressures,
            pressureRegains: aggPlayer.pressureRegains,
        }));
        setPlayerStats(pagePlayerStats);
      }

      if (matchDetailData?.ball_tracking_data) {
        const ballTrackingArray = Array.isArray(matchDetailData.ball_tracking_data)
          ? matchDetailData.ball_tracking_data
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

  const selectedMatchInfo = matches.find(m => m.id === selectedMatch);

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

      {selectedMatchFullData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{selectedMatchFullData.name || `${selectedMatchFullData.home_team_name} vs ${selectedMatchFullData.away_team_name}`}</CardTitle>
              <CardDescription>
                {selectedMatchFullData.match_date && `Match Date: ${new Date(selectedMatchFullData.match_date).toLocaleDateString()}`}
                {selectedMatchFullData.status && ` • Status: ${selectedMatchFullData.status}`}
                {` • ${events.length} events recorded`}
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Key Metrics Cards as before */}
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
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="shotmap">Shot Map / xG</TabsTrigger>
              <TabsTrigger value="passingnetwork">Passing Network</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="passes">Pass Matrix</TabsTrigger>
              <TabsTrigger value="flow">Ball Flow</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MatchRadarChart 
                  statistics={statistics}
                  homeTeamName={selectedMatchFullData.home_team_name}
                  awayTeamName={selectedMatchFullData.away_team_name}
                />
                <StatisticsDisplay
                  statistics={statistics}
                  homeTeamName={selectedMatchFullData.home_team_name}
                  awayTeamName={selectedMatchFullData.away_team_name}
                />
              </div>
              <EventTimelineChart
                events={events}
                homeTeamName={selectedMatchFullData.home_team_name}
                awayTeamName={selectedMatchFullData.away_team_name}
              />
            </TabsContent>

            {/* Detailed Tab */}
            <TabsContent value="detailed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Detailed Match Statistics</CardTitle>
                  <CardDescription>Comprehensive breakdown of match statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <DetailedStatsTable
                    statistics={statistics}
                    homeTeamName={selectedMatchFullData.home_team_name}
                    awayTeamName={selectedMatchFullData.away_team_name}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <PlayerPerformanceChart
                playerStats={playerStats}
                homeTeamName={selectedMatchFullData.home_team_name}
                awayTeamName={selectedMatchFullData.away_team_name}
              />
              <TeamPerformanceRadar
                statistics={statistics}
                homeTeamName={selectedMatchFullData.home_team_name}
                awayTeamName={selectedMatchFullData.away_team_name}
              />
            </TabsContent>

            {/* Shot Map / xG Tab */}
            <TabsContent value="shotmap" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Shot Analysis & Expected Goals (xG)</CardTitle>
                  <CardDescription>Shot locations, outcomes, and Expected Goals (xG) values for each team.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-md">{selectedMatchFullData?.home_team_name || 'Home'} - Total Expected Goals (xG)</CardTitle></CardHeader>
                      <CardContent><p className="text-2xl font-bold">{statistics.shots?.home?.totalXg?.toFixed(2) || '0.00'}</p></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-md">{selectedMatchFullData?.away_team_name || 'Away'} - Total Expected Goals (xG)</CardTitle></CardHeader>
                      <CardContent><p className="text-2xl font-bold">{statistics.shots?.away?.totalXg?.toFixed(2) || '0.00'}</p></CardContent>
                    </Card>
                  </div>
                  <ShotMap
                    shots={events.filter(event => event.type === 'shot')}
                    homeTeamName={selectedMatchFullData?.home_team_name}
                    awayTeamName={selectedMatchFullData?.away_team_name}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Passing Network Tab */}
            <TabsContent value="passingnetwork" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" />Passing Network Analysis</CardTitle>
                  <CardDescription>Visualization of team passing patterns and player connections.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PassingNetworkMap
                    playerStats={playerStats}
                    allPlayers={allPlayersForMatch}
                    homeTeam={selectedMatchFullData ? { id: 'home', name: selectedMatchFullData.home_team_name, players: selectedMatchFullData.home_team_players || [], formation: (selectedMatchFullData.home_team_formation || '4-4-2') } as Team : undefined}
                    awayTeam={selectedMatchFullData ? { id: 'away', name: selectedMatchFullData.away_team_name, players: selectedMatchFullData.away_team_players || [], formation: (selectedMatchFullData.away_team_formation || '4-3-3') } as Team : undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <MatchHeatMap
                events={events}
                homeTeamName={selectedMatchFullData.home_team_name}
                awayTeamName={selectedMatchFullData.away_team_name}
              />
              <AdvancedStatsTable
                statistics={statistics}
                homeTeamName={selectedMatchFullData.home_team_name}
                awayTeamName={selectedMatchFullData.away_team_name}
              />
            </TabsContent>

            {/* Players Tab */}
            <TabsContent value="players" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Player Performance</CardTitle>
                  <CardDescription>Individual player statistics and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-1">Player</th>
                          <th className="text-center py-2 px-1">Team</th>
                          <th className="text-center py-2 px-1">Passes</th>
                          <th className="text-center py-2 px-1">Pass Acc.</th>
                          <th className="text-center py-2 px-1">Prog. Passes</th>
                          <th className="text-center py-2 px-1">Passes Final 1/3</th>
                          <th className="text-center py-2 px-1">Shots</th>
                          <th className="text-center py-2 px-1">Goals</th>
                          <th className="text-center py-2 px-1">Assists</th>
                          <th className="text-center py-2 px-1">xG</th>
                          <th className="text-center py-2 px-1">Pressures</th>
                          <th className="text-center py-2 px-1">Successful Press.</th>
                          <th className="text-center py-2 px-1">Pressure Regains</th>
                          <th className="text-center py-2 px-1">Fouls</th>
                          <th className="text-center py-2 px-1">Cards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerStats.map((player) => (
                          <tr key={player.playerId} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-1 font-medium">{player.playerName}</td>
                            <td className="text-center py-2 px-1">
                              <span className={`px-2 py-1 rounded text-xs ${
                                player.team === 'home' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {player.team === 'home' ? selectedMatchFullData.home_team_name : selectedMatchFullData.away_team_name}
                              </span>
                            </td>
                            <td className="text-center py-2 px-1">{player.events.passes.successful}/{player.events.passes.attempted}</td>
                            <td className="text-center py-2 px-1">{player.events.passes.attempted > 0 ? `${Math.round((player.events.passes.successful / player.events.passes.attempted) * 100)}%` : '0%'}</td>
                            <td className="text-center py-2 px-1">{player.progressivePasses || 0}</td>
                            <td className="text-center py-2 px-1">{player.passesToFinalThird || 0}</td>
                            <td className="text-center py-2 px-1">{player.events.shots.onTarget + player.events.shots.offTarget}</td>
                            <td className="text-center py-2 px-1">{player.events.goals}</td>
                            <td className="text-center py-2 px-1">{player.events.assists}</td>
                            <td className="text-center py-2 px-1">{player.totalXg?.toFixed(2) || '0.00'}</td>
                            <td className="text-center py-2 px-1">{player.totalPressures || 0}</td>
                            <td className="text-center py-2 px-1">{player.successfulPressures || 0}</td>
                            <td className="text-center py-2 px-1">{player.pressureRegains || 0}</td>
                            <td className="text-center py-2 px-1">{player.events.fouls}</td>
                            <td className="text-center py-2 px-1">
                              <div className="flex justify-center gap-1">
                                {player.events.cards.yellow > 0 && <span className="bg-yellow-400 text-white px-1 py-0.5 rounded text-xs">{player.events.cards.yellow}Y</span>}
                                {player.events.cards.red > 0 && <span className="bg-red-500 text-white px-1 py-0.5 rounded text-xs">{player.events.cards.red}R</span>}
                                {player.events.cards.yellow === 0 && player.events.cards.red === 0 && <span className="text-gray-400">-</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {playerStats.length === 0 && (
                          <tr>
                            <td colSpan={15} className="text-center py-8 text-gray-500">No player statistics available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pass Matrix Tab */}
            <TabsContent value="passes" className="space-y-6">
              <PassMatrixTable
                events={events}
                homeTeamName={selectedMatchFullData.home_team_name}
                awayTeamName={selectedMatchFullData.away_team_name}
                homeTeamPlayers={selectedMatchFullData.home_team_players || []}
                awayTeamPlayers={selectedMatchFullData.away_team_players || []}
              />
            </TabsContent>

            {/* Ball Flow Tab */}
            <TabsContent value="flow" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Ball Flow Analysis</CardTitle>
                  <CardDescription>Visualization of ball movement and flow patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  {ballData.length > 0 ? (
                    <BallFlowVisualization
                      ballTrackingPoints={ballData}
                      homeTeam={{ id: 'home', name: selectedMatchFullData.home_team_name, players: selectedMatchFullData.home_team_players || [], formation: (selectedMatchFullData.home_team_formation || '4-4-2') } as Team}
                      awayTeam={{ id: 'away', name: selectedMatchFullData.away_team_name, players: selectedMatchFullData.away_team_players || [], formation: (selectedMatchFullData.away_team_formation || '4-3-3') } as Team}
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