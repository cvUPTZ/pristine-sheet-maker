
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team, BallTrackingPoint, TimeSegmentStatistics } from '@/types';
import TeamTimeSegmentCharts from './TeamTimeSegmentCharts';
import PlayerStatsTable from './PlayerStatsTable';
import BallFlowVisualization from './BallFlowVisualization';
import { useBreakpoint } from '@/hooks/use-mobile';

interface MatchStatsVisualizerProps {
  homeTeam: Team;
  awayTeam: Team;
  ballTrackingPoints: BallTrackingPoint[];
  timeSegments: TimeSegmentStatistics[];
}

const MatchStatsVisualizer: React.FC<MatchStatsVisualizerProps> = ({
  homeTeam,
  awayTeam,
  ballTrackingPoints,
  timeSegments
}) => {
  const isMobile = useBreakpoint('md');
  const [flowDimensions, setFlowDimensions] = useState({ width: 800, height: 600 });
  
  // Adjust visualization dimensions based on screen size
  useEffect(() => {
    const updateDimensions = () => {
      const containerWidth = document.getElementById('visualization-container')?.clientWidth || 800;
      setFlowDimensions({
        width: Math.min(containerWidth - 40, 800),
        height: Math.min(containerWidth * 0.75, 600)
      });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  if (!ballTrackingPoints.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Statistics Visualizer</CardTitle>
          <CardDescription>No data available for visualization</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="mb-2">Use the ball tracking mode to record match data</p>
            <p>Then visualize detailed statistics and patterns here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match Statistics Visualizer</CardTitle>
          <CardDescription>Comprehensive visualization of match data</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="time" className="w-full">
            <TabsList className={`grid ${isMobile ? "grid-cols-1 gap-2" : "grid-cols-3"} mb-4`}>
              <TabsTrigger value="time">Time Analysis</TabsTrigger>
              <TabsTrigger value="player">Player Stats</TabsTrigger>
              <TabsTrigger value="flow">Ball Flow</TabsTrigger>
            </TabsList>
            
            <TabsContent value="time">
              <div className="space-y-6" id="visualization-container">
                <TeamTimeSegmentCharts 
                  timeSegments={timeSegments}
                  homeTeamName={homeTeam.name}
                  awayTeamName={awayTeam.name}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="player">
              <div className="space-y-6 overflow-x-auto" id="visualization-container">
                <PlayerStatsTable
                  ballTrackingPoints={ballTrackingPoints}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="flow">
              <div id="visualization-container">
                <BallFlowVisualization
                  ballTrackingPoints={ballTrackingPoints}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  width={flowDimensions.width}
                  height={flowDimensions.height}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchStatsVisualizer;
