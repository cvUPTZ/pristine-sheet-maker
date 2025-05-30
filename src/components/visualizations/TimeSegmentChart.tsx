
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
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeSegmentStatistics } from '@/types';
import { ChartContainer } from '@/components/ui/chart';

interface TimeSegmentChartProps {
  timeSegments: TimeSegmentStatistics[];
  homeTeamName: string;
  awayTeamName: string;
  dataKey: string;
  title: string;
  description: string;
  chartType?: 'bar' | 'line' | 'area' | 'composed';
}

const TimeSegmentChart: React.FC<TimeSegmentChartProps> = ({ 
  timeSegments, 
  homeTeamName, 
  awayTeamName,
  dataKey,
  title,
  description,
  chartType = 'bar'
}) => {
  const formatData = () => {
    return timeSegments.map(segment => {
      // Handle nested data keys like 'possession.home'
      if (typeof dataKey === 'string' && dataKey.includes('.')) {
        const [mainKey, subKey] = dataKey.split('.');
        const mainData = segment[mainKey as keyof TimeSegmentStatistics] as any;
        
        return {
          name: segment.timeSegment,
          [homeTeamName]: mainData?.home ?? 0,
          [awayTeamName]: mainData?.away ?? 0,
        };
      } 
      
      // Handle regular data keys
      const data = segment[dataKey as keyof TimeSegmentStatistics] as any;
      
      return {
        name: segment.timeSegment,
        [homeTeamName]: data?.home ?? 0,
        [awayTeamName]: data?.away ?? 0,
      };
    });
  };
  
  const data = formatData();
  
  const renderChart = () => {
    const sharedProps = {
      data,
      margin: {
        top: 20,
        right: 30,
        left: 20,
        bottom: 5,
      },
    };
    
    switch (chartType) {
      case 'line':
        return (
          <LineChart {...sharedProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={homeTeamName} 
              stroke="#1A365D" 
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Line 
              type="monotone" 
              dataKey={awayTeamName} 
              stroke="#D3212C" 
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart {...sharedProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey={homeTeamName} 
              stackId="1"
              stroke="#1A365D" 
              fill="#1A365D" 
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey={awayTeamName} 
              stackId="1"
              stroke="#D3212C" 
              fill="#D3212C" 
              fillOpacity={0.6}
            />
          </AreaChart>
        );
      
      case 'composed':
        return (
          <ComposedChart {...sharedProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={homeTeamName} fill="#1A365D" />
            <Line 
              type="monotone" 
              dataKey={awayTeamName} 
              stroke="#D3212C" 
              strokeWidth={2}
            />
          </ComposedChart>
        );
      
      default:
        return (
          <BarChart {...sharedProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={homeTeamName} fill="#1A365D" />
            <Bar dataKey={awayTeamName} fill="#D3212C" />
          </BarChart>
        );
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeSegmentChart;
