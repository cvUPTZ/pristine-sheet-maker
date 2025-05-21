
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team, BallTrackingPoint, TimeSegmentStatistics } from '@/types';
import TeamTimeSegmentCharts from './TeamTimeSegmentCharts';
import PlayerStatsTable from './PlayerStatsTable';
import BallFlowVisualization from './BallFlowVisualization';

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
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="time">Time Analysis</TabsTrigger>
              <TabsTrigger value="player">Player Stats</TabsTrigger>
              <TabsTrigger value="flow">Ball Flow</TabsTrigger>
            </TabsList>
            
            <TabsContent value="time">
              <div className="space-y-6">
                <TeamTimeSegmentCharts 
                  timeSegments={timeSegments}
                  homeTeamName={homeTeam.name}
                  awayTeamName={awayTeam.name}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="player">
              <div className="space-y-6">
                <PlayerStatsTable
                  ballTrackingPoints={ballTrackingPoints}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="flow">
              <BallFlowVisualization
                ballTrackingPoints={ballTrackingPoints}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                width={800}
                height={600}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchStatsVisualizer;
