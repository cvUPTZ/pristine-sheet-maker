
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { Statistics } from '@/types';

interface TeamPerformanceRadarProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const TeamPerformanceRadar: React.FC<TeamPerformanceRadarProps> = ({
  statistics,
  homeTeamName,
  awayTeamName,
}) => {
  const calculatePassAccuracy = (successful: number = 0, total: number = 0) => {
    return total > 0 ? Math.round((successful / total) * 100) : 0;
  };

  const calculateShotAccuracy = (onTarget: number = 0, total: number = 0) => {
    return total > 0 ? Math.round((onTarget / total) * 100) : 0;
  };

  const calculateDuelSuccess = (won: number = 0, total: number = 0) => {
    return total > 0 ? Math.round((won / total) * 100) : 0;
  };

  const data = [
    {
      metric: 'Pass Accuracy',
      home: calculatePassAccuracy(statistics.passes?.home?.successful, statistics.passes?.home?.successful || 0),
      away: calculatePassAccuracy(statistics.passes?.away?.successful, statistics.passes?.away?.successful || 0),
    },
    {
      metric: 'Shot Accuracy',
      home: calculateShotAccuracy(statistics.shots?.home?.onTarget, statistics.shots?.home?.onTarget || 0),
      away: calculateShotAccuracy(statistics.shots?.away?.onTarget, statistics.shots?.away?.onTarget || 0),
    },
    {
      metric: 'Duel Success',
      home: statistics.duels?.home?.total ? 
        calculateDuelSuccess(statistics.duels.home.won, statistics.duels.home.total) : 0,
      away: statistics.duels?.away?.total ? 
        calculateDuelSuccess(statistics.duels.away.won, statistics.duels.away.total) : 0,
    },
    {
      metric: 'Possession',
      home: statistics.possession?.home || 0,
      away: statistics.possession?.away || 0,
    },
    {
      metric: 'Attack Efficiency',
      home: Math.min(((statistics.shots?.home?.onTarget || 0) / Math.max(statistics.passes?.home?.successful || 1, 1)) * 1000, 100),
      away: Math.min(((statistics.shots?.away?.onTarget || 0) / Math.max(statistics.passes?.away?.successful || 1, 1)) * 1000, 100),
    },
    {
      metric: 'Discipline',
      home: Math.max(100 - (statistics.fouls?.home || 0) * 5, 0),
      away: Math.max(100 - (statistics.fouls?.away || 0) * 5, 0),
    },
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Team Performance Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={false}
              />
              <Radar
                name={homeTeamName}
                dataKey="home"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name={awayTeamName}
                dataKey="away"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.3}
                strokeWidth={2}
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
