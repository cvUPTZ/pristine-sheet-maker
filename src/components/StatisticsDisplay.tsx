
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Statistics } from '@/types';

interface StatisticsDisplayProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const StatisticsDisplay: React.FC<StatisticsDisplayProps> = ({ 
  statistics, 
  homeTeamName, 
  awayTeamName 
}) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Match Statistics</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <StatRow 
            label="Possession" 
            homeValue={`${Math.round(statistics.possession.home)}%`}
            awayValue={`${Math.round(statistics.possession.away)}%`}
          />
          <StatRow 
            label="Shots (on/off)" 
            homeValue={`${statistics.shots.home.onTarget}/${statistics.shots.home.offTarget}`}
            awayValue={`${statistics.shots.away.onTarget}/${statistics.shots.away.offTarget}`}
          />
          <StatRow 
            label="Passes (success/total)" 
            homeValue={`${statistics.passes.home.successful}/${statistics.passes.home.attempted}`}
            awayValue={`${statistics.passes.away.successful}/${statistics.passes.away.attempted}`}
          />
          <StatRow 
            label="Balls Played" 
            homeValue={statistics.ballsPlayed.home.toString()}
            awayValue={statistics.ballsPlayed.away.toString()}
          />
          <StatRow 
            label="Balls Lost" 
            homeValue={statistics.ballsLost.home.toString()}
            awayValue={statistics.ballsLost.away.toString()}
          />
        </div>
      </CardContent>
    </Card>
  );
};

interface StatRowProps {
  label: string;
  homeValue: string;
  awayValue: string;
}

const StatRow: React.FC<StatRowProps> = ({ label, homeValue, awayValue }) => (
  <div className="grid grid-cols-3 text-sm">
    <div className="text-right font-medium text-football-home">{homeValue}</div>
    <div className="text-center text-muted-foreground">{label}</div>
    <div className="text-left font-medium text-football-away">{awayValue}</div>
  </div>
);

export default StatisticsDisplay;
