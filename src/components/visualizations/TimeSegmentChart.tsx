
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeSegmentStatistics } from '@/types';

interface TimeSegmentChartProps {
  timeSegments: TimeSegmentStatistics[];
  homeTeamName: string;
  awayTeamName: string;
  dataKey: 'ballsPlayed' | 'ballsGiven' | 'ballsRecovered' | 'ballsLost' | 'possession' | 'recoveryTime';
  title: string;
  description: string;
}

const TimeSegmentChart: React.FC<TimeSegmentChartProps> = ({ 
  timeSegments, 
  homeTeamName, 
  awayTeamName,
  dataKey,
  title,
  description
}) => {
  const formatData = () => {
    return timeSegments.map(segment => ({
      name: segment.timeSegment,
      [homeTeamName]: segment[dataKey].home,
      [awayTeamName]: segment[dataKey].away,
    }));
  };
  
  const data = formatData();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={homeTeamName} fill="#1A365D" />
              <Bar dataKey={awayTeamName} fill="#D3212C" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeSegmentChart;
