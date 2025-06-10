import React from 'react';
import { AggregatedStats } from '@/lib/analytics/eventAggregator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface CumulativePossessionChartProps {
  statsSegments: AggregatedStats[];
  intervalMinutes: number;
  homeTeamName: string;
  awayTeamName: string;
}

interface CumulativePossessionDataPoint {
  name: string; // Time interval end point
  [homeTeamName: string]: number; // Cumulative "possession value" for home
  [awayTeamName: string]: number; // Cumulative "possession value" for away
}

// Simple Line Chart Placeholder (can be reused/centralized)
const SimpleLineChartPlaceholder = ({ data, yKeys, title, colors }: { data: any[], yKeys: string[], title: string, colors: string[] }) => (
  <div className="mb-4 p-2 border rounded">
    <h5 className="text-sm font-semibold text-center mb-2">{title}</h5>
    <div className="bg-gray-100 p-2 rounded h-48 overflow-x-auto">
      <pre className="text-xs">{JSON.stringify(data.map(d => ({name: d.name, ...yKeys.reduce((obj, key) => ({...obj, [key]: d[key]}), {})})), null, 2)}</pre>
      <p className="text-xs text-muted-foreground mt-2">Data shown. Chart rendering would go here.</p>
      {yKeys.map((key, i) => <div key={key} className="text-xs"><span className="inline-block w-3 h-3 mr-1" style={{backgroundColor: colors[i]}}></span>{key}</div>)}
    </div>
  </div>
);

const CumulativePossessionChart: React.FC<CumulativePossessionChartProps> = ({
  statsSegments,
  intervalMinutes,
  homeTeamName,
  awayTeamName,
}) => {
  if (!statsSegments || statsSegments.length === 0) {
    return <Card><CardHeader><CardTitle>Cumulative Possession</CardTitle></CardHeader><CardContent><p>No data.</p></CardContent></Card>;
  }

  let cumulativeHomePossessionValue = 0;
  let cumulativeAwayPossessionValue = 0;

  // The meaning of "possessionMinutes" in TeamDetailedStats is currently a placeholder.
  // If it were actual minutes for that segment, we could sum it.
  // If possessionPercentage is a proxy (e.g., from event counts), summing it directly might not be intuitive.
  // Let's assume for now TeamDetailedStats.possession is some kind of possession metric for the segment (e.g., seconds, or event counts).
  // The prompt asks for "cumulative possession time", but if direct time isn't available,
  // using "possessionPercentage" as a proxy for "share of game control" in that segment might be an option.
  // Let's use segment.homeTeamStats.possession (assuming it's a value like event counts or time in seconds for the segment)
  // If it's possessionPercentage from TeamDetailedStats, summing percentages isn't mathematically standard for "cumulative time".
  // For this placeholder, I'll use `possessionPercentage` as a proxy for "control" in that segment and sum that. This is a simplification.

  const cumulativeData: CumulativePossessionDataPoint[] = statsSegments.map((segment, index) => {
    cumulativeHomePossessionValue += segment.homeTeamStats.possessionPercentage || 0; // Using % as a proxy for "control amount"
    cumulativeAwayPossessionValue += segment.awayTeamStats.possessionPercentage || 0; // This results in sum of percentages.

    return {
      name: `${(index + 1) * intervalMinutes} min`,
      [homeTeamName]: cumulativeHomePossessionValue,
      [awayTeamName]: cumulativeAwayPossessionValue,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumulative Possession Metric Over Time</CardTitle>
        <CardDescription>
          Tracking cumulative possession metric (e.g., sum of segment possession percentages, as a proxy for control).
          Note: This is a simplified representation if direct possession time per segment is not available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SimpleLineChartPlaceholder
          data={cumulativeData}
          yKeys={[homeTeamName, awayTeamName]}
          title="Cumulative Possession Metric (Proxy)"
          colors={['lightblue', 'lightcoral']}
        />
        {/*
        Example with Recharts AreaChart for a filled look:
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey={homeTeamName} stroke="darkblue" fill="lightblue" name={`${homeTeamName} (Cumulative Proxy)`} />
            <Area type="monotone" dataKey={awayTeamName} stroke="darkred" fill="lightcoral" name={`${awayTeamName} (Cumulative Proxy)`} />
          </AreaChart>
        </ResponsiveContainer>
        */}
      </CardContent>
    </Card>
  );
};

export default CumulativePossessionChart;
