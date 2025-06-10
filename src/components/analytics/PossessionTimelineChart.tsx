import React from 'react';
import { AggregatedStats } from '@/lib/analytics/eventAggregator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

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
    return <Card><CardHeader><CardTitle>Possession Timeline</CardTitle></CardHeader><CardContent><p>No data.</p></CardContent></Card>;
  }

  const possessionData: PossessionChartDataPoint[] = statsSegments.map((segment, index) => {
    // Assuming possessionPercentage is available in TeamDetailedStats within AggregatedStats
    // If not, a proxy calculation would be needed here based on event counts or other heuristics.
    const homePossession = segment.homeTeamStats.possessionPercentage || 0;
    const awayPossession = segment.awayTeamStats.possessionPercentage || 0;

    // Ensure they sum to 100 if they are independent, or adjust logic if one is derived from other
    // For simplicity, assuming they are provided and represent actual percentages for the segment.
    // If only one is provided, e.g. homePossession, away can be 100 - homePossession.
    // If segment.homeTeamStats.possession is event counts, then:
    // const totalEvents = segment.homeTeamStats.possession + segment.awayTeamStats.possession;
    // const homePct = totalEvents > 0 ? (segment.homeTeamStats.possession / totalEvents) * 100 : 50;
    // const awayPct = totalEvents > 0 ? 100 - homePct : 50;

    return {
      name: `${index * intervalMinutes}-${(index + 1) * intervalMinutes} min`,
      [homeTeamName]: homePossession,
      [awayTeamName]: awayPossession,
    };
  });

  // Simple Stacked Bar Chart Placeholder or Line Chart Placeholder
  const SimpleTimelineLineChart = ({ data, yKeyHome, yKeyAway, title }: { data: PossessionChartDataPoint[], yKeyHome: string, yKeyAway: string, title: string }) => (
    <div className="mb-4 p-2 border rounded">
      <h5 className="text-sm font-semibold text-center mb-2">{title}</h5>
      <div className="bg-gray-100 p-2 rounded h-48 overflow-x-auto">
        <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
        <p className="text-xs text-muted-foreground mt-2">Data shown. Chart rendering (e.g., Line or Stacked Bar) would go here.</p>
        <div className="text-xs"><span className="inline-block w-3 h-3 mr-1" style={{backgroundColor: 'lightblue'}}></span>{yKeyHome}</div>
        <div className="text-xs"><span className="inline-block w-3 h-3 mr-1" style={{backgroundColor: 'lightcoral'}}></span>{yKeyAway}</div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Possession Timeline</CardTitle>
        <CardDescription>Possession percentage per {intervalMinutes}-minute interval.</CardDescription>
      </CardHeader>
      <CardContent>
        <SimpleTimelineLineChart data={possessionData} yKeyHome={homeTeamName} yKeyAway={awayTeamName} title="Possession % per Interval" />
        {/*
        Example with Recharts LineChart:
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={possessionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis unit="%" domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            <Legend />
            <Line type="monotone" dataKey={homeTeamName} stroke="lightblue" yAxisId={0} name={`${homeTeamName} %`} />
            <Line type="monotone" dataKey={awayTeamName} stroke="lightcoral" yAxisId={0} name={`${awayTeamName} %`} />
          </LineChart>
        </ResponsiveContainer>

        Example with Recharts StackedBarChart for 100% view:
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={possessionData} layout="vertical" stackOffset="expand"> // stackOffset="expand" for 100%
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="%" domain={[0,100]} />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip formatter={(value, name, props) => `${props.payload[name].toFixed(1)}%`} />
            <Legend />
            <Bar dataKey={homeTeamName} fill="lightblue" stackId="a" />
            <Bar dataKey={awayTeamName} fill="lightcoral" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
        */}
      </CardContent>
    </Card>
  );
};

export default PossessionTimelineChart;
