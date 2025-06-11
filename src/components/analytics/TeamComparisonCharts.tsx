

import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'; 

interface TeamComparisonChartsProps {
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeTeamName: string;
  awayTeamName: string;
}

const TeamComparisonCharts: React.FC<TeamComparisonChartsProps> = ({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}) => {
  const passData = [
    { name: 'Total Passes', [homeTeamName]: homeStats.passesAttempted || 0, [awayTeamName]: awayStats.passesAttempted || 0 },
    { name: 'Completed', [homeTeamName]: homeStats.passesCompleted || 0, [awayTeamName]: awayStats.passesCompleted || 0 },
    { name: 'Offensive', [homeTeamName]: homeStats.offensivePasses || 0, [awayTeamName]: awayStats.offensivePasses || 0 },
    { name: 'Support', [homeTeamName]: homeStats.supportPasses || 0, [awayTeamName]: awayStats.supportPasses || 0 },
  ];

  const ballControlData = [
    { name: 'Played', [homeTeamName]: homeStats.ballsPlayed || 0, [awayTeamName]: awayStats.ballsPlayed || 0 },
    { name: 'Recovered', [homeTeamName]: homeStats.ballsRecovered || 0, [awayTeamName]: awayStats.ballsRecovered || 0 },
    { name: 'Lost', [homeTeamName]: homeStats.ballsLost || 0, [awayTeamName]: awayStats.ballsLost || 0 },
  ];

  const shootingData = [
    { name: 'Total Shots', [homeTeamName]: homeStats.shots || 0, [awayTeamName]: awayStats.shots || 0 },
    { name: 'On Target', [homeTeamName]: homeStats.shotsOnTarget || 0, [awayTeamName]: awayStats.shotsOnTarget || 0 },
    { name: 'xG', [homeTeamName]: parseFloat((homeStats.totalXg || 0).toFixed(2)), [awayTeamName]: parseFloat((awayStats.totalXg || 0).toFixed(2)) },
  ];

  const duelData = [
    { name: 'Duels Won', [homeTeamName]: homeStats.duelsWon || 0, [awayTeamName]: awayStats.duelsWon || 0 },
    { name: 'Aerial Duels Won', [homeTeamName]: homeStats.aerialDuelsWon || 0, [awayTeamName]: awayStats.aerialDuelsWon || 0 },
  ];

  const chartConfig = {
    [homeTeamName]: { label: homeTeamName, color: "hsl(var(--chart-1))" },
    [awayTeamName]: { label: awayTeamName, color: "hsl(var(--chart-2))" },
  };

  const renderComparisonChart = (title: string, data: Array<{[key: string]: string | number }>) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full aspect-video">
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} interval={0} tick={{ fontSize: 12 }} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey={homeTeamName} fill={chartConfig[homeTeamName].color} radius={4} barSize={20} />
              <Bar dataKey={awayTeamName} fill={chartConfig[awayTeamName].color} radius={4} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Team Comparison Charts</h3>
      {renderComparisonChart("Passing Comparison", passData)}
      {renderComparisonChart("Ball Control Comparison", ballControlData)}
      {renderComparisonChart("Shooting Comparison", shootingData)}
      {renderComparisonChart("Duels Comparison", duelData)}
    </div>
  );
};

export default TeamComparisonCharts;
