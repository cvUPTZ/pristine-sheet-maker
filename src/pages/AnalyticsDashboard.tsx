
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BarChart3, TrendingUp, Zap, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Statistics, MatchEvent, PlayerStatSummary } from '@/types';
import { aggregateMatchEvents } from '@/lib/analytics/eventAggregator';
import AdvancedAnalyticsDashboard from '@/components/analytics/AdvancedAnalyticsDashboard';
import InteractiveMetricsGrid from '@/components/analytics/InteractiveMetricsGrid';
import RealTimeStatsWidget from '@/components/analytics/RealTimeStatsWidget';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { toast } = useToast();
  
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>(matchId || '');
  const [selectedMatchData, setSelectedMatchData] = useState<any>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      fetchMatchAnalytics(selectedMatch);
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
      
      if (data && data.length > 0 && !selectedMatch) {
        setSelectedMatch(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive"
      });
    }
  };

  const fetchMatchAnalytics = async (matchId: string) => {
    try {
      setLoading(true);
      
      // Fetch match details
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      setSelectedMatchData(matchData);

      // Fetch match events
      const { data: eventsData, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (eventsError) throw eventsError;

      // Parse player data safely
      const parsePlayerData = (data: any) => {
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch {
            return [];
          }
        }
        return Array.isArray(data) ? data : [];
      };

      const homePlayersList = parsePlayerData(matchData.home_team_players);
      const awayPlayersList = parsePlayerData(matchData.away_team_players);

      // Format events
      const formattedEvents: MatchEvent[] = (eventsData || []).map(event => ({
        id: event.id,
        match_id: event.match_id,
        timestamp: event.timestamp || 0,
        type: event.event_type,
        event_data: event.event_data || {},
        created_at: event.created_at,
        tracker_id: null,
        team_id: null,
        player_id: event.player_id,
        team: event.team,
        coordinates: event.coordinates || { x: 0, y: 0 },
        created_by: event.created_by,
      }));

      setEvents(formattedEvents);

      // Aggregate statistics
      const aggregatedData = aggregateMatchEvents(formattedEvents, homePlayersList, awayPlayersList);
      setStatistics({
        home: aggregatedData.homeTeamStats,
        away: aggregatedData.awayTeamStats,
      });
      setPlayerStats(aggregatedData.playerStats);

    } catch (error) {
      console.error('Error fetching match analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load match analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="text-center py-8">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">Advanced match analytics and insights</p>
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

      {selectedMatchData && statistics && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Analytics Dashboard */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="advanced" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Advanced
                </TabsTrigger>
                <TabsTrigger value="metrics" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Insights
                </TabsTrigger>
              </TabsList>

              <TabsContent value="advanced" className="mt-6">
                <AdvancedAnalyticsDashboard
                  statistics={statistics}
                  playerStats={playerStats}
                  homeTeamName={selectedMatchData.home_team_name}
                  awayTeamName={selectedMatchData.away_team_name}
                />
              </TabsContent>

              <TabsContent value="metrics" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Interactive Metrics Analysis
                    </CardTitle>
                    <CardDescription>
                      Explore detailed team performance metrics with interactive comparisons
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InteractiveMetricsGrid
                      statistics={statistics}
                      homeTeamName={selectedMatchData.home_team_name}
                      awayTeamName={selectedMatchData.away_team_name}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-blue-900">Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-white/50 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Possession Dominance</h4>
                        <p className="text-sm text-blue-700">
                          {selectedMatchData.home_team_name} controlled {statistics.home?.possessionPercentage || 0}% 
                          of ball possession, showing strong midfield control.
                        </p>
                      </div>
                      <div className="p-4 bg-white/50 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Attacking Efficiency</h4>
                        <p className="text-sm text-blue-700">
                          Shot conversion rate analysis shows tactical effectiveness in the final third.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-green-900">Performance Highlights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-white/50 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Top Performer</h4>
                        <p className="text-sm text-green-700">
                          {playerStats[0]?.playerName || 'Player'} leads with {playerStats[0]?.ballsPlayed || 0} ball interactions.
                        </p>
                      </div>
                      <div className="p-4 bg-white/50 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Match Flow</h4>
                        <p className="text-sm text-green-700">
                          Total of {events.length} recorded events showing high-intensity gameplay.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Real-time Stats Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Live Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RealTimeStatsWidget
                  statistics={statistics}
                  events={events}
                  homeTeamName={selectedMatchData.home_team_name}
                  awayTeamName={selectedMatchData.away_team_name}
                  isLive={selectedMatchData.status === 'live'}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
