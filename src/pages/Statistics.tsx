
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BallTrackingPoint } from '@/types';
import type { Statistics as StatisticsType } from '@/types';
import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer';
import BallFlowVisualization from '@/components/visualizations/BallFlowVisualization';

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<StatisticsType | null>(null);
  const [ballTrackingData, setBallTrackingData] = useState<BallTrackingPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const { data: matches, error } = await supabase
          .from('matches')
          .select('match_statistics, ball_tracking_data')
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
            setStats(matchStats as StatisticsType);
          }
          
          if (ballData && Array.isArray(ballData)) {
            setBallTrackingData(ballData as BallTrackingPoint[]);
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
          <MatchStatsVisualizer statistics={stats} />
          {ballTrackingData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ball Movement Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <BallFlowVisualization ballTrackingPoints={ballTrackingData} />
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
