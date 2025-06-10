import React from 'react';
import { AggregatedStats } from '@/lib/analytics/eventAggregator'; // Or from @/types if moved
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// Assuming a chart component is available, e.g., from Recharts
// import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BallControlTimelineChartProps {
  statsSegments: AggregatedStats[];
  intervalMinutes: number;
  homeTeamName: string;
  awayTeamName: string;
}

// Placeholder for chart data structure
interface ChartDataPoint {
  name: string; // e.g., "0-5 min", "5-10 min"
  [homeTeamName: string]: number;
  [awayTeamName: string]: number;
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

  // Simple Bar Chart Placeholder
  const SimpleTimelineBarChart = ({ data, yKeyHome, yKeyAway, title }: { data: ChartDataPoint[], yKeyHome: string, yKeyAway: string, title: string }) => (
    <div className="mb-4 p-2 border rounded">
      <h5 className="text-sm font-semibold text-center mb-2">{title}</h5>
      <div className="overflow-x-auto pb-2">
        <div className="flex" style={{width: `${data.length * 80}px`}}> {/* Adjust width as needed */}
          {data.map(point => {
            const homeVal = point[yKeyHome];
            const awayVal = point[yKeyAway];
            const maxVal = Math.max(homeVal, awayVal, 1);
            return (
              <div key={point.name} className="flex flex-col items-center mx-1 text-xs w-16">
                <div className="h-24 bg-gray-100 w-full flex justify-around items-end">
                  <div style={{ height: `${(homeVal / maxVal) * 100}%`, backgroundColor: 'lightblue', width: '40%' }} title={`${yKeyHome}: ${homeVal}`}></div>
                  <div style={{ height: `${(awayVal / maxVal) * 100}%`, backgroundColor: 'lightcoral', width: '40%' }} title={`${yKeyAway}: ${awayVal}`}></div>
                </div>
                <span className="mt-1 whitespace-nowrap">{point.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ball Control Timeline</CardTitle>
        <CardDescription>Balls played and lost per {intervalMinutes}-minute interval.</CardDescription>
      </CardHeader>
      <CardContent>
        <SimpleTimelineBarChart data={playedData} yKeyHome={homeTeamName} yKeyAway={awayTeamName} title="Balls Played per Interval" />
        <SimpleTimelineBarChart data={lostData} yKeyHome={homeTeamName} yKeyAway={awayTeamName} title="Balls Lost per Interval" />
        {/*
        Example with Recharts:
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={playedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={homeTeamName} fill="lightblue" />
            <Bar dataKey={awayTeamName} fill="lightcoral" />
          </BarChart>
        </ResponsiveContainer>
        // Similar for lostData
        */}
      </CardContent>
    </Card>
  );
};

export default BallControlTimelineChart;
