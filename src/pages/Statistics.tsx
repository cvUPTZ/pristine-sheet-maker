
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BallTrackingPoint, Statistics as StatisticsType, Team, TimeSegmentStatistics } from '@/types';
import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer';
import BallFlowVisualization from '@/components/visualizations/BallFlowVisualization';
import AdvancedMetricsCard from '@/components/analytics/AdvancedMetricsCard';
import TeamPerformanceRadar from '@/components/analytics/TeamPerformanceRadar';
import KeyInsightsPanel from '@/components/analytics/KeyInsightsPanel';
import AdvancedStatsTable from '@/components/analytics/AdvancedStatsTable';
import TimeSeriesChart from '@/components/analytics/TimeSeriesChart';
import { useIsMobile } from '@/hooks/use-mobile';

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<StatisticsType | null>(null);
  const [ballTrackingData, setBallTrackingData] = useState<BallTrackingPoint[]>([]);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [timeSegments, setTimeSegments] = useState<TimeSegmentStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const { data: matches, error } = await supabase
          .from('matches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching statistics:', error);
          return;
        }

        if (matches) {
          setSelectedMatch(matches);
          
          const matchStats = matches.match_statistics;
          const ballData = matches.ball_tracking_data;
          
          if (matchStats && typeof matchStats === 'object') {
            const stats = matchStats as unknown;
            if (typeof stats === 'object' && stats !== null) {
              setStats(stats as StatisticsType);
            }
          }
          
          if (ballData && Array.isArray(ballData)) {
            const validBallData: BallTrackingPoint[] = ballData
              .filter((item): item is any => item !== null && typeof item === 'object')
              .map(item => item as BallTrackingPoint);
            setBallTrackingData(validBallData);
          }

          const homeTeamData: Team = {
            id: 'home',
            name: matches.home_team_name || 'Home Team',
            formation: (matches.home_team_formation || '4-4-2') as any,
            players: Array.isArray(matches.home_team_players) ? 
              (matches.home_team_players as unknown as any[]) : []
          };

          const awayTeamData: Team = {
            id: 'away',
            name: matches.away_team_name || 'Away Team',
            formation: (matches.away_team_formation || '4-3-3') as any,
            players: Array.isArray(matches.away_team_players) ? 
              (matches.away_team_players as unknown as any[]) : []
          };

          setHomeTeam(homeTeamData);
          setAwayTeam(awayTeamData);

          // Generate time segments from ball tracking data
          if (validBallData.length > 0) {
            const segments = generateTimeSegments(validBallData);
            setTimeSegments(segments);
          }
        }
      } catch (error) {
        console.error('Error in fetchStatistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  const generateTimeSegments = (ballData: BallTrackingPoint[]): TimeSegmentStatistics[] => {
    const segmentLength = 5 * 60 * 1000; // 5 minutes in milliseconds
    const segments: TimeSegmentStatistics[] = [];
    
    if (ballData.length === 0) return segments;

    const startTime = Math.min(...ballData.map(p => p.timestamp));
    const endTime = Math.max(...ballData.map(p => p.timestamp));
    const duration = endTime - startTime;
    const numSegments = Math.ceil(duration / segmentLength);

    for (let i = 0; i < numSegments; i++) {
      const segmentStart = startTime + (i * segmentLength);
      const segmentEnd = Math.min(segmentStart + segmentLength, endTime);
      
      const segmentData = ballData.filter(p => 
        p.timestamp >= segmentStart && p.timestamp < segmentEnd
      );

      const homeEvents = segmentData.filter(p => p.team === 'home');
      const awayEvents = segmentData.filter(p => p.team === 'away');
      
      const homePossession = segmentData.length > 0 ? 
        (homeEvents.length / segmentData.length) * 100 : 50;
      const awayPossession = 100 - homePossession;

      segments.push({
        startTime: segmentStart,
        endTime: segmentEnd,
        timeSegment: `${i * 5}-${(i + 1) * 5}min`,
        events: segmentData.map(p => ({ 
          team_id: p.team || 'unknown',
          timestamp: p.timestamp,
          coordinates: { x: p.x, y: p.y }
        })),
        possession: { home: homePossession, away: awayPossession },
        ballsPlayed: { home: homeEvents.length, away: awayEvents.length }
      });
    }

    return segments;
  };

  const calculateKPIs = () => {
    if (!stats) return [];

    const homeShots = stats.shots.home.onTarget + stats.shots.home.offTarget;
    const awayShots = stats.shots.away.onTarget + stats.shots.away.offTarget;
    
    return [
      {
        label: 'Total Shots',
        value: homeShots + awayShots,
        format: 'number' as const,
        description: 'Combined shots by both teams'
      },
      {
        label: 'Shot Accuracy',
        value: homeShots + awayShots > 0 ? 
          ((stats.shots.home.onTarget + stats.shots.away.onTarget) / (homeShots + awayShots)) * 100 : 0,
        format: 'percentage' as const,
        description: 'Overall shot accuracy'
      },
      {
        label: 'Pass Completion',
        value: (stats.passes.home.attempted + stats.passes.away.attempted) > 0 ? 
          ((stats.passes.home.successful + stats.passes.away.successful) / 
           (stats.passes.home.attempted + stats.passes.away.attempted)) * 100 : 0,
        format: 'percentage' as const,
        description: 'Combined pass accuracy'
      },
      {
        label: 'Match Intensity',
        value: ballTrackingData.length,
        format: 'number' as const,
        description: 'Total ball tracking points'
      }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading advanced statistics...</div>
      </div>
    );
  }

  if (!stats || !homeTeam || !awayTeam) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center">Advanced Match Analytics</h1>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No match data available for analysis. Start tracking a match to see detailed statistics and insights.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = calculateKPIs();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Advanced Match Analytics</h1>
        {selectedMatch && (
          <p className="text-muted-foreground mt-2">
            {selectedMatch.home_team_name} vs {selectedMatch.away_team_name}
            {selectedMatch.match_date && (
              <span className="ml-2">
                • {new Date(selectedMatch.match_date).toLocaleDateString()}
              </span>
            )}
          </p>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-1`}>
          <TabsTrigger value="overview" className={isMobile ? "text-xs" : ""}>
            {isMobile ? "Overview" : "Match Overview"}
          </TabsTrigger>
          <TabsTrigger value="performance" className={isMobile ? "text-xs" : ""}>
            {isMobile ? "Performance" : "Team Performance"}
          </TabsTrigger>
          <TabsTrigger value="insights" className={isMobile ? "text-xs" : ""}>
            {isMobile ? "Insights" : "Key Insights"}
          </TabsTrigger>
          <TabsTrigger value="flow" className={isMobile ? "text-xs" : ""}>
            {isMobile ? "Flow" : "Match Flow"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => (
              <AdvancedMetricsCard
                key={index}
                title="KPI"
                metrics={[kpi]}
                className="h-auto"
              />
            ))}
          </div>

          {/* Advanced Stats Table */}
          <AdvancedStatsTable
            statistics={stats}
            homeTeamName={homeTeam.name}
            awayTeamName={awayTeam.name}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TeamPerformanceRadar
              statistics={stats}
              homeTeamName={homeTeam.name}
              awayTeamName={awayTeam.name}
            />
            
            <MatchStatsVisualizer 
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              events={[]}
              ballTrackingPoints={ballTrackingData}
              timeSegments={timeSegments}
              ballTrackingData={ballTrackingData}
            />
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <KeyInsightsPanel
            statistics={stats}
            ballTrackingPoints={ballTrackingData}
            homeTeamName={homeTeam.name}
            awayTeamName={awayTeam.name}
          />
        </TabsContent>

        <TabsContent value="flow" className="space-y-6">
          <TimeSeriesChart
            timeSegments={timeSegments}
            homeTeamName={homeTeam.name}
            awayTeamName={awayTeam.name}
          />
          
          {ballTrackingData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ball Movement Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <BallFlowVisualization 
                  ballTrackingPoints={ballTrackingData} 
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Statistics;
