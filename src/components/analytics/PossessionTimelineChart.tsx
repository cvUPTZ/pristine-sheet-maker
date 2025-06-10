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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';


interface PossessionTimelineChartProps {
  statsSegments: AggregatedStats[];
  intervalMinutes: number;
  homeTeamName: string;
  awayTeamName: string;
}

interface PossessionChartDataPoint {
  name: string; // e.g., "0-5 min", "5-10 min"
  [homeTeamName: string]: number; // Possession percentage for home
  [awayTeamName: string]: number; // Possession percentage for away
}

const PossessionTimelineChart: React.FC<PossessionTimelineChartProps> = ({
  statsSegments,
  intervalMinutes,
  homeTeamName,
  awayTeamName,
}) => {
  if (!statsSegments || statsSegments.length === 0) {
    return <Card><CardHeader><CardTitle>Possession Timeline</CardTitle></CardHeader><CardContent><p>No segmented data available.</p></CardContent></Card>;
  }

  const chartConfig = {
    [homeTeamName]: { label: homeTeamName, color: "hsl(var(--chart-1))" },
    [awayTeamName]: { label: awayTeamName, color: "hsl(var(--chart-2))" },
  };

  const possessionData: PossessionChartDataPoint[] = statsSegments.map((segment, index) => {
    // Ensure possessionPercentage is used from TeamDetailedStats
    let homePossession = segment.homeTeamStats.possessionPercentage || 0;
    let awayPossession = segment.awayTeamStats.possessionPercentage || 0;

    // If one is 0 and the other is also 0 (no events/data), default to 50/50 to avoid empty bar.
    // Or, if one is populated and the other isn't, infer (e.g., if home is 60, away is 40).
    // This assumes possessionPercentage is meant to sum to 100 for the two teams in a segment.
    if (homePossession === 0 && awayPossession === 0 && segment.homeTeamStats.possession > 0 && segment.awayTeamStats.possession > 0) {
        // Fallback to event counts if percentages are zero but event counts exist
        const totalEvents = (segment.homeTeamStats.possession || 0) + (segment.awayTeamStats.possession || 0);
        if (totalEvents > 0) {
            homePossession = ((segment.homeTeamStats.possession || 0) / totalEvents) * 100;
            awayPossession = 100 - homePossession;
        } else { // No events at all
            homePossession = 50; // Default to 50/50 if no data at all
            awayPossession = 50;
        }
    } else if (homePossession > 0 && awayPossession === 0 && homePossession <= 100) {
        awayPossession = 100 - homePossession;
    } else if (awayPossession > 0 && homePossession === 0 && awayPossession <= 100) {
        homePossession = 100 - awayPossession;
    } else if (homePossession + awayPossession > 100 && homePossession > awayPossession) { // Normalize if sum > 100
        homePossession = (homePossession / (homePossession + awayPossession)) * 100;
        awayPossession = 100 - homePossession;
    } else if (homePossession + awayPossession > 100 && awayPossession > homePossession) {
        awayPossession = (awayPossession / (homePossession + awayPossession)) * 100;
        homePossession = 100 - awayPossession;
    } else if (homePossession + awayPossession < 100 && homePossession + awayPossession > 0) { // Normalize if sum < 100 but not both zero
        const sum = homePossession + awayPossession;
        homePossession = (homePossession / sum) * 100;
        awayPossession = (awayPossession / sum) * 100;
    }


    return {
      name: `${index * intervalMinutes}-${(index + 1) * intervalMinutes} min`,
      [homeTeamName]: parseFloat(homePossession.toFixed(1)),
      [awayTeamName]: parseFloat(awayPossession.toFixed(1)),
    };
  });

  // Removed SimpleTimelineLineChart placeholder

  return (
    <Card>
      <CardHeader>
        <CardTitle>Possession Timeline</CardTitle>
        <CardDescription>Possession percentage per {intervalMinutes}-minute interval.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full aspect-[3/1]">
            <ResponsiveContainer width="100%" height={300}>
            {/* Using a stacked bar chart for 100% representation */}
            <BarChart
                data={possessionData}
                layout="horizontal"
                stackOffset="expand" // Normalizes values to percentage for each bar
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis
                    type="number"
                    tickFormatter={(value) => `${value * 100}%`} // Values are 0-1 due to stackOffset="expand"
                    domain={[0, 1]}
                    tick={{ fontSize: 10 }}
                />
                <ChartTooltip
                    cursor={false}
                    content={(props: TooltipProps<ValueType, NameType>) => {
                        if (props.payload && props.payload.length) {
                            const { name, payload } = props.payload[0]; // name is the dataKey (team name)
                            const dataPoint = props.payload[0].payload as PossessionChartDataPoint;
                            // The value from payload is already 0-1 due to stackOffset="expand"
                            // We want to show the original percentage that was in possessionData for that team
                            const originalValue = dataPoint[name as string];
                            return (
                                <ChartTooltipContent className="bg-background text-foreground border shadow-lg p-2 rounded-md text-xs">
                                     <p className="font-semibold">{dataPoint.name}</p>
                                     {props.payload.map((entry, i) => (
                                        <p key={`tooltip-${i}`} style={{ color: entry.color }}>
                                            {entry.name}: {dataPoint[entry.name as string].toFixed(1)}%
                                            {/* Access original value from dataPoint for tooltip */}
                                        </p>
                                     ))}
                                </ChartTooltipContent>
                            );
                        }
                        return null;
                    }}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey={homeTeamName} fill={chartConfig[homeTeamName].color} stackId="a" radius={[4,4,0,0]} />
                <Bar dataKey={awayTeamName} fill={chartConfig[awayTeamName].color} stackId="a" radius={[4,4,0,0]} />
            </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default PossessionTimelineChart;
