import React from 'react';
import { AggregatedStats } from '@/lib/analytics/eventAggregator'; // Or from @/types
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CumulativeBallControlChartProps {
  statsSegments: AggregatedStats[];
  intervalMinutes: number;
  homeTeamName: string;
  awayTeamName: string;
}

interface CumulativeChartDataPoint {
  name: string; // Time interval end point, e.g., "5 min", "10 min"
  [homeTeamNamePlayed: string]: number;
  [awayTeamNamePlayed: string]: number;
  [homeTeamNameLost: string]: number;
  [awayTeamNameLost: string]: number;
  differencePlayed?: number;
}

// Simple Line Chart Placeholder
const SimpleLineChartPlaceholder = ({ data, yKeys, title, colors }: { data: any[], yKeys: string[], title: string, colors: string[] }) => (
  <div className="mb-4 p-2 border rounded">
    <h5 className="text-sm font-semibold text-center mb-2">{title}</h5>
    <div className="bg-gray-100 p-2 rounded h-48 overflow-x-auto">
      <pre className="text-xs">{JSON.stringify(data.map(d => ({name: d.name, ...yKeys.reduce((obj, key) => ({...obj, [key]: d[key]}), {})})), null, 2)}</pre>
      <p className="text-xs text-muted-foreground mt-2">Data shown above. Chart rendering would go here.</p>
      {yKeys.map((key, i) => <div key={key} className="text-xs"><span className="inline-block w-3 h-3 mr-1" style={{backgroundColor: colors[i]}}></span>{key}</div>)}
    </div>
  </div>
);


const CumulativeBallControlChart: React.FC<CumulativeBallControlChartProps> = ({
  statsSegments,
  intervalMinutes,
  homeTeamName,
  awayTeamName,
}) => {
  if (!statsSegments || statsSegments.length === 0) {
    return <Card><CardHeader><CardTitle>Cumulative Ball Control</CardTitle></CardHeader><CardContent><p>No data.</p></CardContent></Card>;
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumulative Ball Control Over Time</CardTitle>
        <CardDescription>Tracking cumulative balls played and lost by each team.</CardDescription>
      </CardHeader>
      <CardContent>
        <SimpleLineChartPlaceholder
          data={cumulativeData}
          yKeys={[`${homeTeamName} Played`, `${awayTeamName} Played`]}
          title="Cumulative Balls Played"
          colors={['lightblue', 'lightcoral']}
        />
        <SimpleLineChartPlaceholder
          data={cumulativeData}
          yKeys={[`${homeTeamName} Lost`, `${awayTeamName} Lost`]}
          title="Cumulative Balls Lost"
          colors={['skyblue', 'salmon']}
        />
        <SimpleLineChartPlaceholder
          data={cumulativeData}
          yKeys={['differencePlayed']}
          title="Difference in Cumulative Balls Played (Home - Away)"
          colors={['#71717a']}
        />
        {/*
        Example with Recharts:
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={`${homeTeamName} Played`} stroke="lightblue" />
            <Line type="monotone" dataKey={`${awayTeamName} Played`} stroke="lightcoral" />
          </LineChart>
        </ResponsiveContainer>
        // ... similar charts for Lost and Difference ...
        */}
      </CardContent>
    </Card>
  );
};

export default CumulativeBallControlChart;
