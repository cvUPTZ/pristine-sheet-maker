
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeSegmentStatistics } from '@/types';

interface TimeSeriesChartProps {
  timeSegments: TimeSegmentStatistics[];
  homeTeamName: string;
  awayTeamName: string;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  timeSegments,
  homeTeamName,
  awayTeamName
}) => {
  if (!timeSegments || timeSegments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Flow Analysis</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p>No time segment data available</p>
            <p className="text-sm">Track more match events to see flow analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const processedData = timeSegments.map((segment, index) => ({
    timeSegment: segment.timeSegment,
    minute: (index + 1) * 5,
    homePossession: segment.possession?.home || 0,
    awayPossession: segment.possession?.away || 0,
    homeBallsPlayed: segment.ballsPlayed?.home || 0,
    awayBallsPlayed: segment.ballsPlayed?.away || 0,
    homeEvents: segment.events.filter(e => e.team_id === 'home').length,
    awayEvents: segment.events.filter(e => e.team_id === 'away').length,
    totalEvents: segment.events.length
  }));

  return (
    <div className="space-y-6">
      {/* Possession Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Possession Flow Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="minute" 
                  label={{ value: 'Minutes', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  label={{ value: 'Possession %', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${Number(value).toFixed(1)}%`, 
                    name === 'homePossession' ? homeTeamName : awayTeamName
                  ]}
                  labelFormatter={(label) => `Minute ${label}`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="homePossession"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name={homeTeamName}
                />
                <Area
                  type="monotone"
                  dataKey="awayPossession"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name={awayTeamName}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Event Activity Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Match Intensity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="minute" 
                  label={{ value: 'Minutes', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  label={{ value: 'Events', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    value, 
                    name === 'homeEvents' ? `${homeTeamName} Events` : 
                    name === 'awayEvents' ? `${awayTeamName} Events` : 'Total Events'
                  ]}
                  labelFormatter={(label) => `Minute ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="homeEvents"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={`${homeTeamName} Events`}
                />
                <Line
                  type="monotone"
                  dataKey="awayEvents"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={`${awayTeamName} Events`}
                />
                <Line
                  type="monotone"
                  dataKey="totalEvents"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  strokeDasharray="5 5"
                  name="Total Activity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeSeriesChart;
