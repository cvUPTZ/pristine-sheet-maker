import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, TrendingUp, Users, Activity, Target, BarChart3, PieChart, Share2, ShieldCheck,
  LayoutDashboard, ListChecks, Clock, Grid, Crosshair, BarChartBig
} from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import MatchAnalysisSidebar from '@/components/match/MatchAnalysisSidebar';
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
import EnhancedShotMap from '@/components/analytics/EnhancedShotMap';
import EnhancedPassingNetwork from '@/components/analytics/EnhancedPassingNetwork';
import EnhancedBallFlow from '@/components/analytics/EnhancedBallFlow';
import AdvancedAnalyticsDashboard from '@/components/analytics/AdvancedAnalyticsDashboard';
import TeamComparisonCharts from '@/components/analytics/TeamComparisonCharts';
import {
  PerformanceDifferenceAnalysis,
  AdvancedEfficiencyRatioCharts,
  PerformanceComparisonGraphs,
  EfficiencyMetricsRatios,
  TargetOffTargetComparison,
  ShootingAccuracyCharts,
  ShotDistributionAnalysis,
  DuelSuccessRateCharts,
  PassDirectionAnalysis,
  ActionEffectivenessMetrics,
  IndividualPlayerCharts,
  PlayerBallHandlingStats,
  PlayerPassingStatsTable,
  PlayerBallLossRatioTable,
  PlayerBallRecoveryStats,
  BallControlTimelineChart,
  CumulativeBallControlChart,
  RecoveryTimelineChart,
  PossessionTimelineChart,
  CumulativePossessionChart
} from '@/components/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Statistics as StatisticsType, MatchEvent, PlayerStatistics, EventType, Player, Team, TeamDetailedStats, PlayerStatSummary } from '@/types/index'; // Updated imports
import { aggregateMatchEvents, AggregatedStats } from '@/lib/analytics/eventAggregator'; // AggregatedStats import
import { segmentEventsByTime } from '@/lib/analytics/timeSegmenter';
import { aggregateStatsForSegments } from '@/lib/analytics/timeSegmentedStatsAggregator';

const Statistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [selectedMatchFullData, setSelectedMatchFullData] = useState<any>(null);
  const [statistics, setStatistics] = useState<StatisticsType | null>(null); // Will hold home: TeamDetailedStats, away: TeamDetailedStats
  const [ballData, setBallData] = useState<any[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatSummary[]>([]); // Use PlayerStatSummary directly
  const [loading, setLoading] = useState(true);
  const [allPlayersForMatch, setAllPlayersForMatch] = useState<Player[]>([]);
  const [selectedPlayerForChart, setSelectedPlayerForChart] = useState<string | number | null>(null);

  // State for time-based analysis
  const [statsSegments, setStatsSegments] = useState<AggregatedStats[] | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<number>(15); // Default interval
  const [matchDuration, setMatchDuration] = useState<number>(90); // Default match duration
  const [activeView, setActiveView] = useState('overview');

  // No longer needed if PlayerStatSummary is used directly by new components
  // and PlayerPerformanceChart is updated or replaced.
  // const convertToPlayerStatistics = (playerStats: AggPlayerStatSummary[]): PlayerStatistics[] => { ... }

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      fetchMatchData(selectedMatch); // This will now also trigger time segmentation
    }
  }, [selectedMatch, selectedInterval, matchDuration]); // Re-fetch if interval or duration changes

  const handleIntervalChange = (value: string) => {
    setSelectedInterval(Number(value));
    // Re-fetching is handled by useEffect dependency on selectedInterval
  };

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
        // Safely parse player data
        const parsePlayerData = (data: any): Player[] => {
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch {
              return [];
            }
          }
          return Array.isArray(data) ? data : [];
        };

        const homePlayersList: Player[] = parsePlayerData(matchDetailData.home_team_players);
        const awayPlayersList: Player[] = parsePlayerData(matchDetailData.away_team_players);
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

          // Safely get event_data or default to empty object
          const eventData = (event as any).event_data || {};

          return {
            id: event.id,
            match_id: event.match_id,
            timestamp: event.timestamp || 0,
            type: event.event_type as EventType,
            event_data: eventData,
            created_at: event.created_at,
            tracker_id: null,
            team_id: null,
            player_id: event.player_id,
            team: event.team === 'home' || event.team === 'away' ? event.team : undefined,
            coordinates,
            created_by: event.created_by,
            player: allPlayers.find((p: Player) => String(p.id) === String(event.player_id) || p.jersey_number === event.player_id)
          };
        });
        setEvents(formattedEvents);

        const aggregatedData: AggregatedStats = aggregateMatchEvents(formattedEvents, homePlayersList, awayPlayersList);

        setStatistics({
            home: aggregatedData.homeTeamStats,
            away: aggregatedData.awayTeamStats,
        });

        setPlayerStats(aggregatedData.playerStats); // This is already PlayerStatSummary[]

        // Set first player as default for chart, or null if no players
        if (aggregatedData.playerStats && aggregatedData.playerStats.length > 0) {
            setSelectedPlayerForChart(aggregatedData.playerStats[0].playerId);
        } else {
            setSelectedPlayerForChart(null);
        }

        // --- Time Segmentation ---
        if (formattedEvents.length > 0 && homePlayersList.length > 0 && awayPlayersList.length > 0) {
          const segmentedMatchEvents = segmentEventsByTime(formattedEvents, selectedInterval, matchDuration);
          const aggregatedSegmentStats = aggregateStatsForSegments(segmentedMatchEvents, homePlayersList, awayPlayersList);
          setStatsSegments(aggregatedSegmentStats);
        } else {
          setStatsSegments(null); // Clear segments if no events or player lists
        }
        // --- End Time Segmentation ---
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

  const menuItems = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'detailed', label: 'Detailed', icon: ListChecks },
    { value: 'teamAnalysis', label: 'Team Analysis', icon: ShieldCheck },
    { value: 'shootingActions', label: 'Shooting & Actions', icon: Target },
    { value: 'timeAnalysis', label: 'Time Analysis', icon: Clock },
    { value: 'players', label: 'Players', icon: Users },
    { value: 'passingNetwork', label: 'Passing Network', icon: Share2 },
    { value: 'passMatrix', label: 'Pass Matrix', icon: Grid },
    { value: 'shotmap', label: 'Shot Map', icon: Crosshair },
    { value: 'advancedViz', label: 'Advanced Viz', icon: BarChartBig },
    { value: 'flow', label: 'Ball Flow', icon: TrendingUp },
  ];

  const CurrentViewComponent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            {statistics && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <StatisticsDisplay
                    statistics={statistics}
                    homeTeamName={selectedMatchFullData.home_team_name}
                    awayTeamName={selectedMatchFullData.away_team_name}
                  />
                  <MatchRadarChart
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
              </>
            )}
          </div>
        );
      case 'detailed':
        return (
          <div className="space-y-6">
            {statistics && (
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
            )}
          </div>
        );
      case 'teamAnalysis':
        return (
          <div className="space-y-6">
            {statistics && statistics.home && statistics.away && (
              <>
                <TeamComparisonCharts homeStats={statistics.home} awayStats={statistics.away} homeTeamName={selectedMatchFullData.home_team_name} awayTeamName={selectedMatchFullData.away_team_name} />
                <PerformanceDifferenceAnalysis homeStats={statistics.home} awayStats={statistics.away} homeTeamName={selectedMatchFullData.home_team_name} awayTeamName={selectedMatchFullData.away_team_name} />
                <AdvancedEfficiencyRatioCharts homeStats={statistics.home} awayStats={statistics.away} homeTeamName={selectedMatchFullData.home_team_name} awayTeamName={selectedMatchFullData.away_team_name} />
                <PerformanceComparisonGraphs homeStats={statistics.home} awayStats={statistics.away} homeTeamName={selectedMatchFullData.home_team_name} awayTeamName={selectedMatchFullData.away_team_name} />
                <Card><CardHeader><CardTitle>Home Team Efficiency</CardTitle></CardHeader><CardContent><EfficiencyMetricsRatios teamStats={statistics.home} teamName={selectedMatchFullData.home_team_name} /></CardContent></Card>
                <Card><CardHeader><CardTitle>Away Team Efficiency</CardTitle></CardHeader><CardContent><EfficiencyMetricsRatios teamStats={statistics.away} teamName={selectedMatchFullData.away_team_name} /></CardContent></Card>
              </>
            )}
          </div>
        );
      case 'shootingActions':
        return (
          <div className="space-y-6">
            {statistics && statistics.home && statistics.away && (
              <>
                <TargetOffTargetComparison homeStats={statistics.home} awayStats={statistics.away} homeTeamName={selectedMatchFullData.home_team_name} awayTeamName={selectedMatchFullData.away_team_name} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ShootingAccuracyCharts teamStats={statistics.home} teamName={selectedMatchFullData.home_team_name} />
                  <ShootingAccuracyCharts teamStats={statistics.away} teamName={selectedMatchFullData.away_team_name} />
                  <ShotDistributionAnalysis teamStats={statistics.home} teamName={selectedMatchFullData.home_team_name} />
                  <ShotDistributionAnalysis teamStats={statistics.away} teamName={selectedMatchFullData.away_team_name} />
                  <DuelSuccessRateCharts teamStats={statistics.home} teamName={selectedMatchFullData.home_team_name} />
                  <DuelSuccessRateCharts teamStats={statistics.away} teamName={selectedMatchFullData.away_team_name} />
                  <PassDirectionAnalysis teamStats={statistics.home} teamName={selectedMatchFullData.home_team_name} />
                  <PassDirectionAnalysis teamStats={statistics.away} teamName={selectedMatchFullData.away_team_name} />
                  <ActionEffectivenessMetrics teamStats={statistics.home} teamName={selectedMatchFullData.home_team_name} />
                  <ActionEffectivenessMetrics teamStats={statistics.away} teamName={selectedMatchFullData.away_team_name} />
                </div>
              </>
            )}
          </div>
        );
      case 'timeAnalysis':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Time-Based Analysis</CardTitle>
                <CardDescription>
                  Statistics broken down by {selectedInterval}-minute intervals over {matchDuration} minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label htmlFor="interval-select" className="text-sm font-medium">Select Interval (minutes):</label>
                  <Select value={String(selectedInterval)} onValueChange={handleIntervalChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="45">Half-time (45 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading && <p>Loading segmented data...</p>}
                {!loading && statsSegments && statsSegments.length > 0 && selectedMatchFullData && (
                  <>
                    <BallControlTimelineChart statsSegments={statsSegments} intervalMinutes={selectedInterval} homeTeamName={selectedMatchFullData.home_team_name} awayTeamName={selectedMatchFullData.away_team_name} />
                    <CumulativeBallControlChart statsSegments={statsSegments} intervalMinutes={selectedInterval} homeTeamName={selectedMatchFullData.home_team_name} awayTeamName={selectedMatchFullData.away_team_name} />
                    <RecoveryTimelineChart statsSegments={statsSegments} intervalMinutes={selectedInterval} homeTeamName={selectedMatchFullData.home_team_name} awayTeamName={selectedMatchFullData.away_team_name} />
                    <PossessionTimelineChart 
                      events={events}
                      playerStats={playerStats}
                      homeTeamName={selectedMatchFullData.home_team_name} 
                      awayTeamName={selectedMatchFullData.away_team_name} 
                    />
                    <CumulativePossessionChart statsSegments={statsSegments} intervalMinutes={selectedInterval} homeTeamName={selectedMatchFullData.home_team_name} awayTeamName={selectedMatchFullData.away_team_name} />
                  </>
                )}
                {!loading && (!statsSegments || statsSegments.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No data available for selected time segmentation or match.</p>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 'players':
        return (
          <div className="space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Player Performance</CardTitle>
                      <CardDescription>Select a player to view detailed charts, and browse player statistics tables.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="mb-4">
                          <Select onValueChange={(value) => setSelectedPlayerForChart(value)} defaultValue={selectedPlayerForChart?.toString()}>
                              <SelectTrigger className="w-full md:w-1/2 lg:w-1/3">
                                  <SelectValue placeholder="Select a player for detailed charts..." />
                              </SelectTrigger>
                              <SelectContent>
                                  {allPlayersForMatch.map(player => (
                                      <SelectItem key={player.id} value={String(player.id)}>
                                          {player.name || player.player_name || `ID: ${player.id}`} ({playerStats.find(p=>p.playerId === player.id)?.team || 'N/A'})
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      {selectedPlayerForChart && playerStats.length > 0 && (
                          <IndividualPlayerCharts playerStats={playerStats} selectedPlayerId={selectedPlayerForChart} />
                      )}

                      <PlayerBallHandlingStats playerStats={playerStats} />
                      <PlayerPassingStatsTable playerStats={playerStats} />
                      <PlayerBallLossRatioTable playerStats={playerStats} />
                      <PlayerBallRecoveryStats playerStats={playerStats} />
                  </CardContent>
              </Card>
          </div>
        );
      case 'passingNetwork':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" />Passing Network Analysis</CardTitle>
                <CardDescription>Interactive passing networks and connection analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedPassingNetwork
                  playerStats={playerStats}
                  homeTeamName={selectedMatchFullData.home_team_name}
                  awayTeamName={selectedMatchFullData.away_team_name}
                />
              </CardContent>
            </Card>
          </div>
        );
      case 'passMatrix':
        return (
          <div className="space-y-6">
            <PassMatrixTable
              events={events}
              homeTeamName={selectedMatchFullData.home_team_name}
              awayTeamName={selectedMatchFullData.away_team_name}
              homeTeamPlayers={selectedMatchFullData.home_team_players || []}
              awayTeamPlayers={selectedMatchFullData.away_team_players || []}
            />
          </div>
        );
      case 'shotmap':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Shot Analysis</CardTitle>
                <CardDescription>Interactive shot map with detailed shooting statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedShotMap
                  events={events}
                  homeTeamName={selectedMatchFullData.home_team_name}
                  awayTeamName={selectedMatchFullData.away_team_name}
                />
              </CardContent>
            </Card>
          </div>
        );
      case 'advancedViz':
        return (
          <div className="space-y-6">
            {statistics && playerStats.length > 0 && (
              <AdvancedAnalyticsDashboard
                statistics={statistics}
                playerStats={playerStats}
                homeTeamName={selectedMatchFullData.home_team_name}
                awayTeamName={selectedMatchFullData.away_team_name}
              />
            )}
          </div>
        );
      case 'flow':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Ball Flow Analysis</CardTitle>
                <CardDescription>Advanced ball movement visualization and heatmaps</CardDescription>
              </CardHeader>
              <CardContent>
                {ballData.length > 0 && selectedMatchFullData ? (
                  <EnhancedBallFlow
                    ballTrackingPoints={ballData}
                    homeTeam={{ id: 'home', name: selectedMatchFullData.home_team_name, players: selectedMatchFullData.home_team_players || [], formation: (selectedMatchFullData.home_team_formation || '4-4-2') } as Team}
                    awayTeam={{ id: 'away', name: selectedMatchFullData.away_team_name, players: selectedMatchFullData.away_team_players || [], formation: (selectedMatchFullData.away_team_formation || '4-3-3') } as Team}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Ball Tracking Data</h3>
                    <p className="text-gray-500">Use ball tracking mode during matches to see advanced flow patterns and heatmaps</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

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
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex w-full">
        <MatchAnalysisSidebar
          activeView={activeView}
          setActiveView={setActiveView}
          menuItems={menuItems}
          groupLabel="Analytics Tools"
        />
        <SidebarInset>
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Match Statistics & Analytics</h1>
                </div>
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
                <Card className="relative overflow-hidden text-white">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=1200&q=80')` }} />
                  <div className="absolute inset-0 bg-black/60" />
                  <CardHeader className="relative z-10">
                    <CardTitle>{selectedMatchFullData.name || `${selectedMatchFullData.home_team_name} vs ${selectedMatchFullData.away_team_name}`}</CardTitle>
                    <CardDescription className="text-gray-200">
                      {selectedMatchFullData.match_date && `Match Date: ${new Date(selectedMatchFullData.match_date).toLocaleDateString()}`}
                      {selectedMatchFullData.status && ` • Status: ${selectedMatchFullData.status}`}
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
                        {statistics ? (statistics.home.passesAttempted || 0) + (statistics.away.passesAttempted || 0) : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Home: {statistics?.home.passesAttempted || 0} • Away: {statistics?.away.passesAttempted || 0}
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
                        {statistics ? (statistics.home.shots || 0) + (statistics.away.shots || 0) : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Home: {statistics?.home.shots || 0} • Away: {statistics?.away.shots || 0}
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

                <div className="bg-white rounded-lg border border-gray-200 min-h-[500px] sm:min-h-[600px] p-3 sm:p-4 lg:p-6">
                    <CurrentViewComponent />
                </div>
              </>
            )}
            {!selectedMatchFullData && !loading && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">Please select a match to view analytics.</p>
                    </CardContent>
                </Card>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Statistics;
