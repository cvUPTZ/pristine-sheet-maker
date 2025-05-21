
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeSegmentStatistics } from '@/types';
import TimeSegmentChart from './TimeSegmentChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TeamTimeSegmentChartsProps {
  timeSegments: TimeSegmentStatistics[];
  homeTeamName: string;
  awayTeamName: string;
}

const TeamTimeSegmentCharts: React.FC<TeamTimeSegmentChartsProps> = ({ 
  timeSegments,
  homeTeamName,
  awayTeamName
}) => {
  if (!timeSegments || timeSegments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time Segment Analysis</CardTitle>
          <CardDescription>No time segment data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[100px] flex items-center justify-center text-muted-foreground">
          Record match data with time segments to view detailed analysis
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Time Segment Analysis</CardTitle>
        <CardDescription>Detailed statistics broken down by 5-minute intervals</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="possession" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
            <TabsTrigger value="possession">Possession</TabsTrigger>
            <TabsTrigger value="ballsPlayed">Balls Played</TabsTrigger>
            <TabsTrigger value="ballsLost">Balls Lost</TabsTrigger>
            <TabsTrigger value="ballsRecovered">Balls Recovered</TabsTrigger>
          </TabsList>
          
          <TabsContent value="possession" className="space-y-6">
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="possession"
              title="Ball Possession per 5 Minutes"
              description="Percentage of possession in each 5-minute segment"
            />
            
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="cumulativePossession"
              title="Cumulative Ball Possession"
              description="Total ball possession time over the match"
            />
            
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="possessionDifference"
              title="Possession Difference"
              description="Difference in possession time between teams"
            />
          </TabsContent>
          
          <TabsContent value="ballsPlayed" className="space-y-6">
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="ballsPlayed"
              title="Balls Played per 5 Minutes"
              description="Number of balls played in each 5-minute segment"
            />
            
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="cumulativeBallsPlayed"
              title="Cumulative Balls Played"
              description="Total balls played over the match"
            />
            
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="ballsPlayedDifference"
              title="Balls Played Difference"
              description="Difference in balls played between teams"
            />
          </TabsContent>
          
          <TabsContent value="ballsLost" className="space-y-6">
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="ballsGiven"
              title="Balls Lost per 5 Minutes"
              description="Number of balls lost in each 5-minute segment"
            />
            
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="cumulativeBallsGiven"
              title="Cumulative Balls Lost"
              description="Total balls lost over the match"
            />
            
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="ballsGivenDifference"
              title="Balls Lost Difference"
              description="Difference in balls lost between teams"
            />
          </TabsContent>
          
          <TabsContent value="ballsRecovered" className="space-y-6">
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="ballsRecovered"
              title="Balls Recovered per 5 Minutes"
              description="Number of balls recovered in each 5-minute segment"
            />
            
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="cumulativeBallsRecovered"
              title="Cumulative Balls Recovered"
              description="Total balls recovered over the match"
            />
            
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="recoveryTime"
              title="Recovery Time per 5 Minutes"
              description="Average time to recover the ball in each 5-minute segment (seconds)"
            />
            
            <TimeSegmentChart
              timeSegments={timeSegments}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              dataKey="cumulativeRecoveryTime"
              title="Cumulative Recovery Time"
              description="Total time spent recovering the ball (seconds)"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TeamTimeSegmentCharts;
