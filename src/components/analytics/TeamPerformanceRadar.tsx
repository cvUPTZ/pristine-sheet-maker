
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Statistics } from '@/types';

interface TeamPerformanceRadarProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const TeamPerformanceRadar: React.FC<TeamPerformanceRadarProps> = ({
  statistics,
  homeTeamName,
  awayTeamName
}) => {
  const prepareRadarData = () => {
    const homePassAccuracy = statistics.passes.home.attempted > 0 
      ? (statistics.passes.home.successful / statistics.passes.home.attempted) * 100 
      : 0;
    
    const awayPassAccuracy = statistics.passes.away.attempted > 0 
      ? (statistics.passes.away.successful / statistics.passes.away.attempted) * 100 
      : 0;

    const homeShotAccuracy = (statistics.shots.home.onTarget + statistics.shots.home.offTarget) > 0
      ? (statistics.shots.home.onTarget / (statistics.shots.home.onTarget + statistics.shots.home.offTarget)) * 100
      : 0;

    const awayShotAccuracy = (statistics.shots.away.onTarget + statistics.shots.away.offTarget) > 0
      ? (statistics.shots.away.onTarget / (statistics.shots.away.onTarget + statistics.shots.away.offTarget)) * 100
      : 0;

    const homeDuelWinRate = statistics.duels.home.total > 0
      ? ((statistics.duels.home.won || 0) / statistics.duels.home.total) * 100
      : 0;

    const awayDuelWinRate = statistics.duels.away.total > 0
      ? ((statistics.duels.away.won || 0) / statistics.duels.away.total) * 100
      : 0;

    return [
      {
        metric: 'Possession',
        [homeTeamName]: statistics.possession.home,
        [awayTeamName]: statistics.possession.away,
        fullMark: 100
      },
      {
        metric: 'Pass Accuracy',
        [homeTeamName]: homePassAccuracy,
        [awayTeamName]: awayPassAccuracy,
        fullMark: 100
      },
      {
        metric: 'Shot Accuracy',
        [homeTeamName]: homeShotAccuracy,
        [awayTeamName]: awayShotAccuracy,
        fullMark: 100
      },
      {
        metric: 'Duel Win Rate',
        [homeTeamName]: homeDuelWinRate,
        [awayTeamName]: awayDuelWinRate,
        fullMark: 100
      },
      {
        metric: 'Attack Intensity',
        [homeTeamName]: Math.min((statistics.shots.home.onTarget + statistics.shots.home.offTarget) * 10, 100),
        [awayTeamName]: Math.min((statistics.shots.away.onTarget + statistics.shots.away.offTarget) * 10, 100),
        fullMark: 100
      },
      {
        metric: 'Defensive Solidity',
        [homeTeamName]: Math.max(100 - (statistics.fouls.home * 5), 0),
        [awayTeamName]: Math.max(100 - (statistics.fouls.away * 5), 0),
        fullMark: 100
      }
    ];
  };

  const data = prepareRadarData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Radar
                name={homeTeamName}
                dataKey={homeTeamName}
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name={awayTeamName}
                dataKey={awayTeamName}
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '']}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamPerformanceRadar;
