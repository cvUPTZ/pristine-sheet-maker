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

interface BallControlTimelineChartProps {
  statsSegments: AggregatedStats[];
  intervalMinutes: number;
  homeTeamName: string;
  awayTeamName: string;
}

interface ChartDataPoint {
  name: string; // e.g., "0-5 min", "5-10 min"
  [teamKey: string]: number | string; // Allows for dynamic team name keys and the 'name' key
}


const BallControlTimelineChart: React.FC<BallControlTimelineChartProps> = ({
  statsSegments,
  intervalMinutes,
  homeTeamName,
  awayTeamName,
}) => {
  if (!statsSegments || statsSegments.length === 0) {
    return <Card><CardHeader><CardTitle>Ball Control Timeline</CardTitle></CardHeader><CardContent><p>No segmented data available.</p></CardContent></Card>;
  }

  const chartConfig = {
    [homeTeamName]: { label: homeTeamName, color: "hsl(var(--chart-1))" },
    [awayTeamName]: { label: awayTeamName, color: "hsl(var(--chart-2))" },
  };

  const playedData: ChartDataPoint[] = statsSegments.map((segment, index) => ({
    name: `${index * intervalMinutes}-${(index + 1) * intervalMinutes} min`,
    [homeTeamName]: segment.homeTeamStats.ballsPlayed || 0,
    [awayTeamName]: segment.awayTeamStats.ballsPlayed || 0,
  }));

  const lostData: ChartDataPoint[] = statsSegments.map((segment, index) => ({
    name: `${index * intervalMinutes}-${(index + 1) * intervalMinutes} min`,
    [homeTeamName]: segment.homeTeamStats.ballsLost || 0,
    [awayTeamName]: segment.awayTeamStats.ballsLost || 0,
  }));

  const renderTimelineChart = (data: ChartDataPoint[], title: string) => (
     <div className="mb-6">
        <h4 className="text-md font-semibold text-center mb-3">{title}</h4>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full aspect-[3/1]">
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
    </div>
  );


  return (
    <Card>
      <CardHeader>
        <CardTitle>Ball Control Timeline</CardTitle>
        <CardDescription>Balls played and lost per {intervalMinutes}-minute interval.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderTimelineChart(playedData, "Balls Played per Interval")}
        {renderTimelineChart(lostData, "Balls Lost per Interval")}
      </CardContent>
    </Card>
  );
};

export default BallControlTimelineChart;
