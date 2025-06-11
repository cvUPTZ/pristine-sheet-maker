
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
import { Statistics, ShotStats, PassStats, DuelStats, CrossStats } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface MatchRadarChartProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const MatchRadarChart: React.FC<MatchRadarChartProps> = ({ statistics, homeTeamName, awayTeamName }) => {
  // Prepare data for radar chart using direct property access from TeamDetailedStats
  const prepareRadarData = () => {
    const homeTeamStats = statistics.home;
    const awayTeamStats = statistics.away;

    return [
      {
        stat: 'Goals',
        [homeTeamName]: homeTeamStats.goals || 0,
        [awayTeamName]: awayTeamStats.goals || 0,
        fullMark: 10, // Adjust as necessary
      },
      {
        stat: 'Shots', // Total shots
        [homeTeamName]: homeTeamStats.shots || 0,
        [awayTeamName]: awayTeamStats.shots || 0,
        fullMark: 20,
      },
      {
        stat: 'On-Target', // Shots on Target
        [homeTeamName]: homeTeamStats.shotsOnTarget || 0,
        [awayTeamName]: awayTeamStats.shotsOnTarget || 0,
        fullMark: 10,
      },
      {
        stat: 'Passes', // Attempted Passes
        [homeTeamName]: homeTeamStats.passesAttempted || 0,
        [awayTeamName]: awayTeamStats.passesAttempted || 0,
        fullMark: 100, // Assuming a higher fullMark for passes
      },
      {
        stat: 'Possession', // Possession Percentage
        [homeTeamName]: homeTeamStats.possessionPercentage || 0,
        [awayTeamName]: awayTeamStats.possessionPercentage || 0,
        fullMark: 100,
      },
      {
        stat: 'Fouls',
        [homeTeamName]: homeTeamStats.foulsCommitted || 0,
        [awayTeamName]: awayTeamStats.foulsCommitted || 0,
        fullMark: 10,
      },
      {
        stat: 'Duels Won',
        [homeTeamName]: homeTeamStats.duelsWon || 0,
        [awayTeamName]: awayTeamStats.duelsWon || 0,
        fullMark: 20,
      },
      {
        stat: 'Crosses', // Attempted Crosses
        [homeTeamName]: homeTeamStats.crosses || 0,
        [awayTeamName]: awayTeamStats.crosses || 0,
        fullMark: 15,
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
