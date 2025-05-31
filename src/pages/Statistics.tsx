
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BallTrackingPoint, Statistics as StatisticsType, Team } from '@/types';
import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer';
import BallFlowVisualization from '@/components/visualizations/BallFlowVisualization';

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<StatisticsType | null>(null);
  const [ballTrackingData, setBallTrackingData] = useState<BallTrackingPoint[]>([]);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const { data: matches, error } = await supabase
          .from('matches')
          .select('match_statistics, ball_tracking_data, home_team_name, away_team_name, home_team_players, away_team_players, home_team_formation, away_team_formation')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching statistics:', error);
          return;
        }

        if (matches) {
          const matchStats = matches.match_statistics;
          const ballData = matches.ball_tracking_data;
          
          if (matchStats && typeof matchStats === 'object') {
            // Type cast with validation
            const stats = matchStats as unknown;
            if (typeof stats === 'object' && stats !== null) {
              setStats(stats as StatisticsType);
            }
          }
          
          if (ballData && Array.isArray(ballData)) {
            // Type cast with validation
            const validBallData: BallTrackingPoint[] = ballData
              .filter((item): item is any => item !== null && typeof item === 'object')
              .map(item => item as BallTrackingPoint);
            setBallTrackingData(validBallData);
          }

          // Set team data for BallFlowVisualization
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
        }
      } catch (error) {
        console.error('Error in fetchStatistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Match Statistics</h1>
      
      {stats ? (
        <>
          <MatchStatsVisualizer 
            homeTeam={homeTeam || { id: 'home', name: 'Home', formation: '4-4-2', players: [] }}
            awayTeam={awayTeam || { id: 'away', name: 'Away', formation: '4-3-3', players: [] }}
            events={[]}
          />
          {ballTrackingData.length > 0 && homeTeam && awayTeam && (
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
        </>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No statistics available. Start tracking a match to see data here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Statistics;
