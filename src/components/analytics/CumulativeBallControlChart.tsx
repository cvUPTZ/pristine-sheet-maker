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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface CumulativeBallControlChartProps {
  statsSegments: AggregatedStats[];
  intervalMinutes: number;
  homeTeamName: string;
  awayTeamName: string;
}

interface CumulativeChartDataPoint {
  name: string; // Time interval end point, e.g., "5 min", "10 min"
  [teamKeyAndMetric: string]: number | string; // Allows dynamic keys like "Home Played", "Away Played", "Difference Played"
}

// Removed SimpleLineChartPlaceholder

const CumulativeBallControlChart: React.FC<CumulativeBallControlChartProps> = ({
  statsSegments,
  intervalMinutes,
  homeTeamName,
  awayTeamName,
}) => {
  if (!statsSegments || statsSegments.length === 0) {
    return <Card><CardHeader><CardTitle>Cumulative Ball Control</CardTitle></CardHeader><CardContent><p>No segmented data available.</p></CardContent></Card>;
  }

  const chartConfig = {
    [`${homeTeamName} Played`]: { label: `${homeTeamName} Played`, color: "hsl(var(--chart-1))" },
    [`${awayTeamName} Played`]: { label: `${awayTeamName} Played`, color: "hsl(var(--chart-2))" },
    [`${homeTeamName} Lost`]: { label: `${homeTeamName} Lost`, color: "hsl(var(--chart-1)/0.7)" },
    [`${awayTeamName} Lost`]: { label: `${awayTeamName} Lost`, color: "hsl(var(--chart-2)/0.7)" },
    differencePlayed: { label: 'Difference (Home - Away Balls Played)', color: "hsl(var(--chart-3))" },
  };


  let cumulativeHomePlayed = 0;
  let cumulativeAwayPlayed = 0;
  let cumulativeHomeLost = 0;
  let cumulativeAwayLost = 0;

  const cumulativeData: CumulativeChartDataPoint[] = statsSegments.map((segment, index) => {
    cumulativeHomePlayed += segment.homeTeamStats.ballsPlayed || 0;
    cumulativeAwayPlayed += segment.awayTeamStats.ballsPlayed || 0;
    cumulativeHomeLost += segment.homeTeamStats.ballsLost || 0;
    cumulativeAwayLost += segment.awayTeamStats.ballsLost || 0;

    return {
      name: `${(index + 1) * intervalMinutes} min`,
      [`${homeTeamName} Played`]: cumulativeHomePlayed,
      [`${awayTeamName} Played`]: cumulativeAwayPlayed,
      [`${homeTeamName} Lost`]: cumulativeHomeLost,
      [`${awayTeamName} Lost`]: cumulativeAwayLost,
      differencePlayed: cumulativeHomePlayed - cumulativeAwayPlayed,
    };
  });

  const renderLineChart = (
    data: CumulativeChartDataPoint[],
    title: string,
    yKeys: {key: string, name: string, color: string}[]
  ) => (
    <div className="mb-6">
      <h4 className="text-md font-semibold text-center mb-3">{title}</h4>
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full aspect-[3/1]">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <ChartTooltip
              cursor={true}
              content={<ChartTooltipContent indicator="line" hideLabel />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {yKeys.map(item => (
              <Line key={item.key} type="monotone" dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumulative Ball Control Over Time</CardTitle>
        <CardDescription>Tracking cumulative balls played and lost by each team.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderLineChart(cumulativeData, "Cumulative Balls Played", [
          { key: `${homeTeamName} Played`, name: `${homeTeamName} Played`, color: chartConfig[`${homeTeamName} Played`].color },
          { key: `${awayTeamName} Played`, name: `${awayTeamName} Played`, color: chartConfig[`${awayTeamName} Played`].color },
        ])}
        {renderLineChart(cumulativeData, "Cumulative Balls Lost", [
          { key: `${homeTeamName} Lost`, name: `${homeTeamName} Lost`, color: chartConfig[`${homeTeamName} Lost`].color },
          { key: `${awayTeamName} Lost`, name: `${awayTeamName} Lost`, color: chartConfig[`${awayTeamName} Lost`].color },
        ])}
        {renderLineChart(cumulativeData, "Difference in Cumulative Balls Played (Home - Away)", [
          { key: 'differencePlayed', name: 'Difference (Played)', color: chartConfig.differencePlayed.color },
        ])}
      </CardContent>
    </Card>
  );
};

export default CumulativeBallControlChart;
