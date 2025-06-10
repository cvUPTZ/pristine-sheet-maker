import React from 'react';
import { AggregatedStats } from '@/lib/analytics/eventAggregator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface RecoveryTimelineChartProps {
  statsSegments: AggregatedStats[];
  intervalMinutes: number;
  homeTeamName: string;
  awayTeamName: string;
}

interface ChartDataPoint {
  name: string; // e.g., "0-5 min", "5-10 min"
  [teamKey: string]: number | string;
}

const RecoveryTimelineChart: React.FC<RecoveryTimelineChartProps> = ({
  statsSegments,
  intervalMinutes,
  homeTeamName,
  awayTeamName,
}) => {
  if (!statsSegments || statsSegments.length === 0) {
    return <Card><CardHeader><CardTitle>Recovery Timeline</CardTitle></CardHeader><CardContent><p>No segmented data available.</p></CardContent></Card>;
  }

  const chartConfig = {
    [homeTeamName]: { label: homeTeamName, color: "hsl(var(--chart-3))" }, // Example color
    [awayTeamName]: { label: awayTeamName, color: "hsl(var(--chart-4))" }, // Example color
  };

  const recoveryData: ChartDataPoint[] = statsSegments.map((segment, index) => ({
    name: `${index * intervalMinutes}-${(index + 1) * intervalMinutes} min`,
    [homeTeamName]: segment.homeTeamStats.ballsRecovered || 0,
    [awayTeamName]: segment.awayTeamStats.ballsRecovered || 0,
  }));

  // Removed SimpleTimelineBarChart placeholder

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ball Recoveries Timeline</CardTitle>
        <CardDescription>Balls recovered per {intervalMinutes}-minute interval by each team.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full aspect-[3/1]">
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={recoveryData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" hideLabel />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey={homeTeamName} fill={chartConfig[homeTeamName].color} radius={4} />
                    <Bar dataKey={awayTeamName} fill={chartConfig[awayTeamName].color} radius={4} />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default RecoveryTimelineChart;
