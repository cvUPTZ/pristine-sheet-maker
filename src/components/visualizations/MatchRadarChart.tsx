
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
  // Helper functions to safely get stats
  const getShotStats = (shots: ShotStats): ShotStats => {
    return {
      onTarget: shots.onTarget || 0,
      offTarget: shots.offTarget || 0,
      total: shots.total || (shots.onTarget || 0) + (shots.offTarget || 0)
    };
  };

  const getPassStats = (passes: PassStats): PassStats => {
    return {
      successful: passes.successful || 0,
      attempted: passes.attempted || 0
    };
  };

  const getDuelStats = (duels: DuelStats): DuelStats => {
    return {
      won: duels.won || 0,
      total: duels.total || 0
    };
  };

  const getCrossStats = (crosses: CrossStats): CrossStats => {
    return {
      total: crosses.total || 0,
      successful: crosses.successful || 0
    };
  };

  // Prepare data for radar chart
  const prepareRadarData = () => {
    const homeShots = getShotStats(statistics.shots.home);
    const awayShots = getShotStats(statistics.shots.away);
    const homePasses = getPassStats(statistics.passes.home);
    const awayPasses = getPassStats(statistics.passes.away);
    const homeDuels = getDuelStats(statistics.duels.home);
    const awayDuels = getDuelStats(statistics.duels.away);
    const homeCrosses = getCrossStats(statistics.crosses.home);
    const awayCrosses = getCrossStats(statistics.crosses.away);
    
    return [
      {
        stat: 'Goals',
        [homeTeamName]: homeShots.onTarget,
        [awayTeamName]: awayShots.onTarget,
        fullMark: 10,
      },
      {
        stat: 'Shots',
        [homeTeamName]: homeShots.onTarget + homeShots.offTarget,
        [awayTeamName]: awayShots.onTarget + awayShots.offTarget,
        fullMark: 20,
      },
      {
        stat: 'On-Target',
        [homeTeamName]: homeShots.onTarget,
        [awayTeamName]: awayShots.onTarget,
        fullMark: 10,
      },
      {
        stat: 'Passes',
        [homeTeamName]: homePasses.attempted,
        [awayTeamName]: awayPasses.attempted,
        fullMark: 100,
      },
      {
        stat: 'Possession',
        [homeTeamName]: statistics.possession?.home || 50,
        [awayTeamName]: statistics.possession?.away || 50,
        fullMark: 100,
      },
      {
        stat: 'Fouls',
        [homeTeamName]: statistics.ballsLost?.home || 0,
        [awayTeamName]: statistics.ballsLost?.away || 0,
        fullMark: 10,
      },
      {
        stat: 'Duels Won',
        [homeTeamName]: homeDuels.won,
        [awayTeamName]: awayDuels.won,
        fullMark: 20,
      },
      {
        stat: 'Crosses',
        [homeTeamName]: homeCrosses.total,
        [awayTeamName]: awayCrosses.total,
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
