import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, TrendingUp, Users, Activity, Target } from 'lucide-react';
import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer';
import TeamTimeSegmentCharts from '@/components/visualizations/TeamTimeSegmentCharts';
import PlayerHeatmap from '@/components/visualizations/PlayerHeatmap';
import BallFlowVisualization from '@/components/visualizations/BallFlowVisualization';
import MatchRadarChart from '@/components/visualizations/MatchRadarChart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Statistics {
  possession: { home: number; away: number };
  passes: { home: { total: number; successful: number }; away: { total: number; successful: number } };
  shots: { home: { total: number; onTarget: number; offTarget: number }; away: { total: number; onTarget: number; offTarget: number } };
  fouls: { home: number; away: number };
  corners: { home: number; away: number };
  offsides: { home: number; away: number };
  throws: { home: number; away: number };
  cards: { home: { yellow: number; red: number }; away: { yellow: number; red: number } };
}

const Statistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [statistics, setStatistics] = useState<Statistics>({
    possession: { home: 0, away: 0 },
    passes: { home: { total: 0, successful: 0 }, away: { total: 0, successful: 0 } },
    shots: { home: { total: 0, onTarget: 0, offTarget: 0 }, away: { total: 0, onTarget: 0, offTarget: 0 } },
    fouls: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    throws: { home: 0, away: 0 },
    cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } }
  });
  const [ballData, setBallData] = useState<any[]>([]);
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
      
      // Fetch match details with statistics and ball tracking data
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('match_statistics, ball_tracking_data, home_team_name, away_team_name')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      if (matchData?.match_statistics) {
        // Safely cast the JSON data to Statistics type
        const stats = matchData.match_statistics as unknown as Statistics;
        setStatistics(stats);
      }

      // Process ball tracking data
      if (matchData?.ball_tracking_data) {
        const ballTrackingArray = Array.isArray(matchData.ball_tracking_data) 
          ? matchData.ball_tracking_data 
          : [];
        
        const ballDataFiltered = ballTrackingArray.filter((point: any) => 
          point && 
          typeof point.x === 'number' && 
          typeof point.y === 'number' &&
          !isNaN(point.x) && 
          !isNaN(point.y)
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Match Statistics</h1>
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
          {/* Match Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedMatchData.name || `${selectedMatchData.home_team_name} vs ${selectedMatchData.away_team_name}`}</CardTitle>
              <CardDescription>
                {selectedMatchData.match_date && `Match Date: ${new Date(selectedMatchData.match_date).toLocaleDateString()}`}
                {selectedMatchData.status && ` • Status: ${selectedMatchData.status}`}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Passes</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(statistics.passes?.home?.total || 0) + (statistics.passes?.away?.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Home: {statistics.passes?.home?.total || 0} • Away: {statistics.passes?.away?.total || 0}
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
                  {(statistics.shots?.home?.total || 0) + (statistics.shots?.away?.total || 0)}
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Fouls</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(statistics.fouls?.home || 0) + (statistics.fouls?.away || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Home: {statistics.fouls?.home || 0} • Away: {statistics.fouls?.away || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MatchRadarChart 
              statistics={statistics}
              homeTeamName={selectedMatchData.home_team_name}
              awayTeamName={selectedMatchData.away_team_name}
            />
          </div>

          {ballData.length > 0 && (
            <>
              <BallFlowVisualization 
                ballTrackingPoints={ballData}
                homeTeam={{ id: 'home', name: selectedMatchData.home_team_name, players: [], formation: '4-4-2' }}
                awayTeam={{ id: 'away', name: selectedMatchData.away_team_name, players: [], formation: '4-4-2' }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Statistics;
