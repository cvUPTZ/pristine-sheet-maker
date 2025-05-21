
import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Statistics } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface MatchRadarChartProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const MatchRadarChart: React.FC<MatchRadarChartProps> = ({ statistics, homeTeamName, awayTeamName }) => {
  // Prepare data for radar chart
  const prepareRadarData = () => {
    return [
      {
        stat: 'Goals',
        [homeTeamName]: statistics.goals?.home || 0,
        [awayTeamName]: statistics.goals?.away || 0,
        fullMark: 10,
      },
      {
        stat: 'Shots',
        [homeTeamName]: (statistics.shots?.home?.onTarget || 0) + (statistics.shots?.home?.offTarget || 0),
        [awayTeamName]: (statistics.shots?.away?.onTarget || 0) + (statistics.shots?.away?.offTarget || 0),
        fullMark: 20,
      },
      {
        stat: 'On-Target',
        [homeTeamName]: statistics.shots?.home?.onTarget || 0,
        [awayTeamName]: statistics.shots?.away?.onTarget || 0,
        fullMark: 10,
      },
      {
        stat: 'Passes',
        [homeTeamName]: (statistics.passes?.home?.successful || 0) + (statistics.passes?.home?.unsuccessful || 0),
        [awayTeamName]: (statistics.passes?.away?.successful || 0) + (statistics.passes?.away?.unsuccessful || 0),
        fullMark: 100,
      },
      {
        stat: 'Possession',
        [homeTeamName]: statistics.possession?.home || 50,
        [awayTeamName]: statistics.possession?.away || 50,
        fullMark: 100,
      },
      {
        stat: 'Cards',
        [homeTeamName]: (statistics.cards?.home?.yellow || 0) + (statistics.cards?.home?.red || 0) * 2,
        [awayTeamName]: (statistics.cards?.away?.yellow || 0) + (statistics.cards?.away?.red || 0) * 2,
        fullMark: 10,
      },
    ];
  };

  const data = prepareRadarData();
  
  const chartConfig = {
    home: {
      label: homeTeamName,
      theme: {
        light: "#1A365D",
        dark: "#2f5d91",
      },
    },
    away: {
      label: awayTeamName,
      theme: {
        light: "#D3212C",
        dark: "#f14950",
      },
    },
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-0">
        <CardTitle>Team Performance Radar</CardTitle>
        <CardDescription>Comparing key performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] mt-4">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="stat" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Radar
                  name={homeTeamName}
                  dataKey={homeTeamName}
                  stroke="#1A365D"
                  fill="#1A365D"
                  fillOpacity={0.5}
                />
                <Radar
                  name={awayTeamName}
                  dataKey={awayTeamName}
                  stroke="#D3212C"
                  fill="#D3212C"
                  fillOpacity={0.5}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchRadarChart;
