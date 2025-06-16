
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BarChart3, TrendingUp, Zap, Target, LayoutDashboard, Play, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Statistics, MatchEvent, PlayerStatSummary, EventType, Player } from '@/types';
import { aggregateMatchEvents } from '@/lib/analytics/eventAggregator';
import AdvancedAnalyticsDashboard from '@/components/analytics/AdvancedAnalyticsDashboard';
import InteractiveMetricsGrid from '@/components/analytics/InteractiveMetricsGrid';
import RealTimeStatsWidget from '@/components/analytics/RealTimeStatsWidget';
import { usePermissionChecker } from '@/hooks/usePermissionChecker';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import MatchAnalysisSidebar from '@/components/match/MatchAnalysisSidebar';
import PermissionDebugger from '@/components/PermissionDebugger';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { toast } = useToast();
  // Get both role and permission checker from the central hook
  const { role, hasPermission, isLoading: permissionsLoading } = usePermissionChecker();
  
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>(matchId || '');
  const [selectedMatchData, setSelectedMatchData] = useState<any>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // --- HYBRID (ROLE + PERMISSION) MENU GENERATION ---
  const menuItems = useMemo(() => {
    const items = [{ value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' }];
    
    // Show if user has a default role OR the specific permission
    if (['admin'].includes(role || '') || hasPermission('canCreateMatches')) {
      items.push({ value: 'new-match', label: 'New Match', icon: Play, path: '/match' });
    }
    if (['admin', 'manager'].includes(role || '') || hasPermission('canViewMatches')) {
      items.push({ value: 'match-history', label: 'Match History', icon: Calendar, path: '/matches' });
    }
    if (['admin', 'manager', 'teacher'].includes(role || '') || hasPermission('canViewStatistics')) {
      items.push({ value: 'statistics', label: 'Statistics', icon: BarChart3, path: '/statistics' });
    }
    if (['admin', 'manager', 'tracker'].includes(role || '') || hasPermission('canViewAnalytics')) {
      items.push({ value: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/analytics' });
    }
    if (role === 'admin' || hasPermission('canAccessAdmin')) {
      items.push({ value: 'admin', label: 'Admin Panel', icon: Target, path: '/admin' });
    }
    return items;
  }, [role, hasPermission]);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      fetchMatchAnalytics(selectedMatch);
    } else if (matches.length > 0 && !matchId) {
      // If no match is selected but matches exist, select the first one
      setSelectedMatch(matches[0].id);
    }
  }, [selectedMatch, matches, matchId]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, name, home_team_name, away_team_name, match_date, status')
        .order('match_date', { ascending: false });
      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({ title: "Error", description: "Failed to load matches", variant: "destructive" });
    }
  };

  const fetchMatchAnalytics = async (currentMatchId: string) => {
    try {
      setLoading(true);
      
      const { data: matchData, error: matchError } = await supabase.from('matches').select('*').eq('id', currentMatchId).single();
      if (matchError) throw matchError;
      setSelectedMatchData(matchData);

      const { data: eventsData, error: eventsError } = await supabase.from('match_events').select('*').eq('match_id', currentMatchId).order('timestamp', { ascending: true });
      if (eventsError) throw eventsError;

      const parsePlayerData = (data: any): Player[] => {
        if (typeof data === 'string') { try { return JSON.parse(data); } catch { return []; } }
        return Array.isArray(data) ? data : [];
      };

      const homePlayersList = parsePlayerData(matchData.home_team_players);
      const awayPlayersList = parsePlayerData(matchData.away_team_players);
      const allPlayers = [...homePlayersList, ...awayPlayersList];

      const formattedEvents: MatchEvent[] = (eventsData || []).map(event => ({
        id: event.id, match_id: event.match_id, timestamp: event.timestamp || 0,
        type: event.event_type as EventType, event_data: {},
        created_at: event.created_at, tracker_id: null, team_id: null,
        player_id: event.player_id, team: event.team === 'home' || event.team === 'away' ? event.team : undefined,
        coordinates: typeof event.coordinates === 'object' && event.coordinates !== null ? event.coordinates as { x: number; y: number } : { x: 0, y: 0 },
        created_by: event.created_by, player: allPlayers.find(p => p.id === event.player_id),
      }));
      setEvents(formattedEvents);

      const aggregatedData = aggregateMatchEvents(formattedEvents, homePlayersList, awayPlayersList);
      setStatistics({ home: aggregatedData.homeTeamStats, away: aggregatedData.awayTeamStats });
      setPlayerStats(aggregatedData.playerStats.sort((a, b) => (b.ballsPlayed || 0) - (a.ballsPlayed || 0)));

    } catch (error) {
      console.error('Error fetching match analytics:', error);
      toast({ title: "Error", description: "Failed to load match analytics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || permissionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg font-medium">Loading Analytics...</span>
      </div>
    );
  }

  const topPerformer = playerStats.length > 0 ? playerStats[0] : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex w-full">
        {/* Add Permission Debugger in development mode */}
        <PermissionDebugger />
        
        <MatchAnalysisSidebar menuItems={menuItems} groupLabel="Navigation" />
        <SidebarInset>
            <div className="container mx-auto p-6 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Analytics Dashboard
                    </h1>
                    <p className="text-muted-foreground">Advanced match analytics and insights</p>
                  </div>
                </div>
                <div className="w-full sm:w-80">
                    <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a match to analyze..." />
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
              </div>

              {selectedMatchData && statistics ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    <Tabs defaultValue="advanced" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="advanced" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Advanced</TabsTrigger>
                        <TabsTrigger value="metrics" className="flex items-center gap-2"><Target className="h-4 w-4" />Metrics</TabsTrigger>
                        <TabsTrigger value="insights" className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Insights</TabsTrigger>
                      </TabsList>
                      <TabsContent value="advanced" className="mt-6">
                        <AdvancedAnalyticsDashboard
                          statistics={statistics} playerStats={playerStats}
                          homeTeamName={selectedMatchData.home_team_name} awayTeamName={selectedMatchData.away_team_name}
                        />
                      </TabsContent>
                      <TabsContent value="metrics" className="mt-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Interactive Metrics Analysis</CardTitle>
                            <CardDescription>Explore detailed team performance metrics with interactive comparisons</CardDescription>
                          </CardHeader>
                          <CardContent><InteractiveMetricsGrid statistics={statistics} homeTeamName={selectedMatchData.home_team_name} awayTeamName={selectedMatchData.away_team_name} /></CardContent>
                        </Card>
                      </TabsContent>
                      <TabsContent value="insights" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
                            <CardHeader><CardTitle className="text-blue-900">Key Insights</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                              <div className="p-4 bg-white/50 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">Possession Dominance</h4>
                                <p className="text-sm text-blue-700">
                                  {statistics.home.possessionPercentage > statistics.away.possessionPercentage
                                    ? `${selectedMatchData.home_team_name} controlled ${statistics.home.possessionPercentage.toFixed(1)}% of ball possession.`
                                    : `${selectedMatchData.away_team_name} led with ${statistics.away.possessionPercentage.toFixed(1)}% of possession.`
                                  }
                                </p>
                              </div>
                              <div className="p-4 bg-white/50 rounded-lg">
                                <h4 className="font-semibold text-blue-800 mb-2">Attacking Efficiency</h4>
                                <p className="text-sm text-blue-700">
                                  {selectedMatchData.home_team_name} had a shot accuracy of {statistics.home.shots > 0 ? ((statistics.home.shotsOnTarget / statistics.home.shots) * 100).toFixed(1) : 0}%, 
                                  while {selectedMatchData.away_team_name} had {statistics.away.shots > 0 ? ((statistics.away.shotsOnTarget / statistics.away.shots) * 100).toFixed(1) : 0}%.
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
                            <CardHeader><CardTitle className="text-green-900">Performance Highlights</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                              <div className="p-4 bg-white/50 rounded-lg">
                                <h4 className="font-semibold text-green-800 mb-2">Top Performer</h4>
                                <p className="text-sm text-green-700">
                                  {topPerformer ? `${topPerformer.playerName} (${topPerformer.team}) was most involved with ${topPerformer.ballsPlayed} actions.` : 'No player data available.'}
                                </p>
                              </div>
                              <div className="p-4 bg-white/50 rounded-lg">
                                <h4 className="font-semibold text-green-800 mb-2">Match Intensity</h4>
                                <p className="text-sm text-green-700">A total of {events.length} recorded events indicates a high-intensity game.</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                      <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Match Vitals</CardTitle></CardHeader>
                      <CardContent>
                        <RealTimeStatsWidget
                          statistics={statistics} events={events}
                          homeTeamName={selectedMatchData.home_team_name} awayTeamName={selectedMatchData.away_team_name}
                          isLive={selectedMatchData.status === 'live'}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
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

export default AnalyticsDashboard;
