
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Statistics as StatisticsType, TeamDetailedStats } from '@/types'; // Use StatisticsType for clarity
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart'; // Import missing chart components

interface TeamPerformanceRadarProps {
  statistics: StatisticsType; // This now contains home: TeamDetailedStats, away: TeamDetailedStats
  homeTeamName: string;
  awayTeamName: string;
}

const TeamPerformanceRadar: React.FC<TeamPerformanceRadarProps> = ({
  statistics,
  homeTeamName,
  awayTeamName,
}) => {
  if (!statistics || !statistics.home || !statistics.away) {
    return (
      <Card className="col-span-full">
        <CardHeader><CardTitle>Team Performance Radar</CardTitle></CardHeader>
        <CardContent><p className="text-center text-muted-foreground">Not enough data for radar chart.</p></CardContent>
      </Card>
    );
  }

  const { home: homeStats, away: awayStats } = statistics;

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  // Metrics for Radar - ensure they are somewhat normalized (e.g., percentages or scaled)
  const radarData = [
    {
      metric: 'Pass Acc.',
      [homeTeamName]: calculatePercentage(homeStats.passesCompleted, homeStats.passesAttempted),
      [awayTeamName]: calculatePercentage(awayStats.passesCompleted, awayStats.passesAttempted),
      fullMark: 100,
    },
    {
      metric: 'Shot Acc. (on Target/Total)',
      [homeTeamName]: calculatePercentage(homeStats.shotsOnTarget, homeStats.shots),
      [awayTeamName]: calculatePercentage(awayStats.shotsOnTarget, awayStats.shots),
      fullMark: 100,
    },
    {
      metric: 'Goal Conv. (Goals/Shots)',
      [homeTeamName]: calculatePercentage(homeStats.goals, homeStats.shots),
      [awayTeamName]: calculatePercentage(awayStats.goals, awayStats.shots),
      fullMark: Math.max(30, calculatePercentage(homeStats.goals, homeStats.shots), calculatePercentage(awayStats.goals, awayStats.shots)), // Max expected ~30-40%
    },
    {
      metric: 'Duel Win %',
      [homeTeamName]: calculatePercentage(homeStats.duelsWon, homeStats.duelsWon + homeStats.duelsLost),
      [awayTeamName]: calculatePercentage(awayStats.duelsWon, awayStats.duelsWon + awayStats.duelsLost),
      fullMark: 100,
    },
    {
      metric: 'Possession %',
      [homeTeamName]: homeStats.possessionPercentage || 0,
      [awayTeamName]: awayStats.possessionPercentage || 0,
      fullMark: 100,
    },
    { // Higher is better for radar, so 100 - (fouls * scale factor)
      metric: 'Discipline (Fouls based)',
      [homeTeamName]: Math.max(0, 100 - (homeStats.foulsCommitted || 0) * 5), // Example scaling
      [awayTeamName]: Math.max(0, 100 - (awayStats.foulsCommitted || 0) * 5),
      fullMark: 100,
    },
  ];

  const chartConfig = {
    [homeTeamName]: { label: homeTeamName, color: "hsl(var(--chart-1))" },
    [awayTeamName]: { label: awayTeamName, color: "hsl(var(--chart-2))" },
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Team Performance Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96 aspect-video"> {/* Ensure aspect ratio or fixed height */}
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Radar
                  name={homeTeamName}
                  dataKey={homeTeamName}
                  stroke={chartConfig[homeTeamName].color}
                  fill={chartConfig[homeTeamName].color}
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
                <Radar
                  name={awayTeamName}
                  dataKey={awayTeamName}
                  stroke={chartConfig[awayTeamName].color}
                  fill={chartConfig[awayTeamName].color}
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamPerformanceRadar;
