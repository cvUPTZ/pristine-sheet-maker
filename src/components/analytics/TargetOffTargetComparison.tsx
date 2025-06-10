import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface TargetOffTargetComparisonProps {
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeTeamName: string;
  awayTeamName: string;
}

// Removed SimpleComparisonBar placeholder

const TargetOffTargetComparison: React.FC<TargetOffTargetComparisonProps> = ({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}) => {
  const comparisonData = [
    {
      metric: 'Foot On Target',
      [homeTeamName]: homeStats.footShotsOnTarget || 0,
      [awayTeamName]: awayStats.footShotsOnTarget || 0,
    },
    {
      metric: 'Foot Off Target',
      [homeTeamName]: homeStats.footShotsOffTarget || 0,
      [awayTeamName]: awayStats.footShotsOffTarget || 0,
    },
    {
      metric: 'Foot Hit Post',
      [homeTeamName]: homeStats.footShotsPostHits || 0,
      [awayTeamName]: awayStats.footShotsPostHits || 0,
    },
    {
      metric: 'Foot Blocked',
      [homeTeamName]: homeStats.footShotsBlocked || 0,
      [awayTeamName]: awayStats.footShotsBlocked || 0,
    },
    {
      metric: 'Header On Target',
      [homeTeamName]: homeStats.headerShotsOnTarget || 0,
      [awayTeamName]: awayStats.headerShotsOnTarget || 0,
    },
    {
      metric: 'Header Off Target',
      [homeTeamName]: homeStats.headerShotsOffTarget || 0,
      [awayTeamName]: awayStats.headerShotsOffTarget || 0,
    },
    {
      metric: 'Header Hit Post',
      [homeTeamName]: homeStats.headerShotsPostHits || 0,
      [awayTeamName]: awayStats.headerShotsPostHits || 0,
    },
    {
      metric: 'Header Blocked',
      [homeTeamName]: homeStats.headerShotsBlocked || 0,
      [awayTeamName]: awayStats.headerShotsBlocked || 0,
    },
  ];

  const chartConfig = {
    [homeTeamName]: { label: homeTeamName, color: "hsl(var(--chart-1))" },
    [awayTeamName]: { label: awayTeamName, color: "hsl(var(--chart-2))" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shot Outcome Comparison: {homeTeamName} vs {awayTeamName}</CardTitle>
        <CardDescription>Comparing shots on target, off target, post hits, and blocked shots for foot and header.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full aspect-[4/3]">
          <ResponsiveContainer width="100%" height={Math.max(300, comparisonData.length * 60)}>
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 70, bottom: 5 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                dataKey="metric"
                type="category"
                width={120}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey={homeTeamName} name={homeTeamName} fill={chartConfig[homeTeamName].color} radius={4} barSize={15} />
              <Bar dataKey={awayTeamName} name={awayTeamName} fill={chartConfig[awayTeamName].color} radius={4} barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default TargetOffTargetComparison;
