import React from 'react';
import { AggregatedStats } from '@/lib/analytics/eventAggregator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RecoveryTimelineChartProps {
  statsSegments: AggregatedStats[];
  intervalMinutes: number;
  homeTeamName: string;
  awayTeamName: string;
}

interface ChartDataPoint {
  name: string; // e.g., "0-5 min", "5-10 min"
  [homeTeamName: string]: number;
  [awayTeamName: string]: number;
}

const RecoveryTimelineChart: React.FC<RecoveryTimelineChartProps> = ({
  statsSegments,
  intervalMinutes,
  homeTeamName,
  awayTeamName,
}) => {
  if (!statsSegments || statsSegments.length === 0) {
    return <Card><CardHeader><CardTitle>Recovery Timeline</CardTitle></CardHeader><CardContent><p>No segmented data.</p></CardContent></Card>;
  }

  const recoveryData: ChartDataPoint[] = statsSegments.map((segment, index) => ({
    name: `${index * intervalMinutes}-${(index + 1) * intervalMinutes} min`,
    [homeTeamName]: segment.homeTeamStats.ballsRecovered || 0,
    [awayTeamName]: segment.awayTeamStats.ballsRecovered || 0,
  }));

  // Simple Bar Chart Placeholder (reusable from BallControlTimelineChart if centralized)
  const SimpleTimelineBarChart = ({ data, yKeyHome, yKeyAway, title }: { data: ChartDataPoint[], yKeyHome: string, yKeyAway: string, title: string }) => (
    <div className="mb-4 p-2 border rounded">
      <h5 className="text-sm font-semibold text-center mb-2">{title}</h5>
      <div className="overflow-x-auto pb-2">
        <div className="flex" style={{width: `${data.length * 80}px`}}>
          {data.map(point => {
            const homeVal = point[yKeyHome];
            const awayVal = point[yKeyAway];
            const maxVal = Math.max(homeVal, awayVal, 1);
            return (
              <div key={point.name} className="flex flex-col items-center mx-1 text-xs w-16">
                <div className="h-24 bg-gray-100 w-full flex justify-around items-end">
                  <div style={{ height: `${(homeVal / maxVal) * 100}%`, backgroundColor: 'mediumseagreen', width: '40%' }} title={`${yKeyHome}: ${homeVal}`}></div>
                  <div style={{ height: `${(awayVal / maxVal) * 100}%`, backgroundColor: 'seagreen', width: '40%' }} title={`${yKeyAway}: ${awayVal}`}></div>
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
        <CardTitle>Ball Recoveries Timeline</CardTitle>
        <CardDescription>Balls recovered per {intervalMinutes}-minute interval by each team.</CardDescription>
      </CardHeader>
      <CardContent>
        <SimpleTimelineBarChart data={recoveryData} yKeyHome={homeTeamName} yKeyAway={awayTeamName} title="Balls Recovered per Interval" />
        {/*
        Example with Recharts:
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={recoveryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey={homeTeamName} fill="mediumseagreen" />
            <Bar dataKey={awayTeamName} fill="seagreen" />
          </BarChart>
        </ResponsiveContainer>
        */}
      </CardContent>
    </Card>
  );
};

export default RecoveryTimelineChart;
