
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team, BallTrackingPoint, TimeSegmentStatistics } from '@/types';
import TeamTimeSegmentCharts from './TeamTimeSegmentCharts';
import PlayerStatsTable from './PlayerStatsTable';
import BallFlowVisualization from './BallFlowVisualization';
import { useBreakpoint, useCurrentBreakpoint, useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const isSmall = useBreakpoint('sm');
  const isMedium = useBreakpoint('md');
  const currentBreakpoint = useCurrentBreakpoint();
  const [flowDimensions, setFlowDimensions] = useState({ width: 800, height: 600 });
  
  // Adjust visualization dimensions based on screen size
  useEffect(() => {
    const updateDimensions = () => {
      const containerWidth = document.getElementById('visualization-container')?.clientWidth || 
                           window.innerWidth - 32; // Account for padding
      
      // Set dimensions based on breakpoint
      switch(currentBreakpoint) {
        case 'xs':
          setFlowDimensions({
            width: Math.min(containerWidth - 16, 340),
            height: Math.min(containerWidth * 0.75, 255)
          });
          break;
        case 'sm':
          setFlowDimensions({
            width: Math.min(containerWidth - 24, 480),
            height: Math.min(containerWidth * 0.7, 336)
          });
          break;
        case 'md':
          setFlowDimensions({
            width: Math.min(containerWidth - 32, 640),
            height: Math.min(containerWidth * 0.65, 416)
          });
          break;
        default:
          setFlowDimensions({
            width: Math.min(containerWidth - 40, 800),
            height: Math.min(containerWidth * 0.6, 480)
          });
      }
    };
    
    updateDimensions();
    
    const debounceTimer = setTimeout(() => {
      window.addEventListener('resize', updateDimensions);
    }, 100);
    
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [currentBreakpoint]);

  if (!ballTrackingPoints.length) {
    return (
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Match Statistics Visualizer</CardTitle>
          <CardDescription className="text-sm">No data available for visualization</CardDescription>
        </CardHeader>
        <CardContent className="h-[150px] sm:h-[200px] flex items-center justify-center text-muted-foreground p-4 sm:p-6">
          <div className="text-center space-y-2">
            <p className="text-sm sm:text-base">Use the ball tracking mode to record match data</p>
            <p className="text-xs sm:text-sm text-gray-500">Then visualize detailed statistics and patterns here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl">
            Match Statistics Visualizer
          </CardTitle>
          <CardDescription className="text-sm">
            Comprehensive visualization of match data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <Tabs defaultValue="time" className="w-full">
            <TabsList className={`
              grid gap-1 mb-3 sm:mb-4 h-auto p-1
              ${isMobile ? "grid-cols-1" : isSmall ? "grid-cols-2" : "grid-cols-3"}
            `}>
              <TabsTrigger 
                value="time" 
                className="text-xs sm:text-sm py-2 px-2 sm:px-4"
              >
                {isMobile ? "Time" : "Time Analysis"}
              </TabsTrigger>
              <TabsTrigger 
                value="player" 
                className="text-xs sm:text-sm py-2 px-2 sm:px-4"
              >
                {isMobile ? "Stats" : "Player Stats"}
              </TabsTrigger>
              <TabsTrigger 
                value="flow" 
                className="text-xs sm:text-sm py-2 px-2 sm:px-4"
              >
                {isMobile ? "Flow" : "Ball Flow"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="time">
              <div className="space-y-4 sm:space-y-6" id="visualization-container">
                <TeamTimeSegmentCharts 
                  timeSegments={timeSegments}
                  homeTeamName={homeTeam.name}
                  awayTeamName={awayTeam.name}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="player">
              <div className="space-y-4 sm:space-y-6" id="visualization-container">
                <div className="overflow-x-auto">
                  <PlayerStatsTable
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    events={events}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="flow">
              <div 
                id="visualization-container" 
                className="flex justify-center items-center min-h-[200px] sm:min-h-[300px]"
              >
                <div className="w-full max-w-full overflow-hidden">
                  <BallFlowVisualization
                    ballTrackingPoints={ballTrackingData}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchStatsVisualizer;
