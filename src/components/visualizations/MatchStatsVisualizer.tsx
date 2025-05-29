
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team, BallTrackingPoint, TimeSegmentStatistics } from '@/types';
import TeamTimeSegmentCharts from './TeamTimeSegmentCharts';
import PlayerStatsTable from './PlayerStatsTable';
import BallFlowVisualization from './BallFlowVisualization';
import { useBreakpoint, useCurrentBreakpoint } from '@/hooks/use-mobile';

interface MatchStatsVisualizerProps {
  homeTeam: Team;
  awayTeam: Team;
  ballTrackingPoints: BallTrackingPoint[];
  timeSegments: TimeSegmentStatistics[];
  events: any[];
  ballTrackingData: any[];
}

const MatchStatsVisualizer: React.FC<MatchStatsVisualizerProps> = ({
  homeTeam,
  awayTeam,
  ballTrackingPoints,
  timeSegments,
  events,
  ballTrackingData
}) => {
  const isMobile = useBreakpoint('md');
  const isSmall = useBreakpoint('sm');
  const currentBreakpoint = useCurrentBreakpoint();
  const [flowDimensions, setFlowDimensions] = useState({ width: 800, height: 600 });
  
  // Adjust visualization dimensions based on screen size
  useEffect(() => {
    const updateDimensions = () => {
      const containerWidth = document.getElementById('visualization-container')?.clientWidth || 800;
      
      // Set dimensions based on breakpoint
      switch(currentBreakpoint) {
        case 'xs':
          setFlowDimensions({
            width: Math.min(containerWidth - 20, 400),
            height: Math.min(containerWidth * 0.8, 320)
          });
          break;
        case 'sm':
          setFlowDimensions({
            width: Math.min(containerWidth - 30, 500),
            height: Math.min(containerWidth * 0.75, 375)
          });
          break;
        default:
          setFlowDimensions({
            width: Math.min(containerWidth - 40, 800),
            height: Math.min(containerWidth * 0.75, 600)
          });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [currentBreakpoint]);

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
          <CardTitle className="text-lg sm:text-xl md:text-2xl">Match Statistics Visualizer</CardTitle>
          <CardDescription>Comprehensive visualization of match data</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="time" className="w-full">
            <TabsList className={`grid ${isSmall ? "grid-cols-1" : isMobile ? "grid-cols-2" : "grid-cols-3"} gap-2 mb-4`}>
              <TabsTrigger value="time" className="text-xs sm:text-sm">Time Analysis</TabsTrigger>
              <TabsTrigger value="player" className="text-xs sm:text-sm">Player Stats</TabsTrigger>
              <TabsTrigger value="flow" className="text-xs sm:text-sm">Ball Flow</TabsTrigger>
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
                  stats={[
                    { name: 'Total Events', value: events.length },
                    { name: 'Home Team Events', value: events.filter(e => e.team === 'home').length },
                    { name: 'Away Team Events', value: events.filter(e => e.team === 'away').length }
                  ]}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="flow">
              <div id="visualization-container" className="flex justify-center">
                <BallFlowVisualization
                  ballTrackingPoints={ballTrackingData}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
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
