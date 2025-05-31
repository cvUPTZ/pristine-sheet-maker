
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Statistics } from '@/types';
import { Progress } from '@/components/ui/progress';

interface AdvancedStatsTableProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const AdvancedStatsTable: React.FC<AdvancedStatsTableProps> = ({
  statistics,
  homeTeamName,
  awayTeamName
}) => {
  const calculateAdvancedMetrics = () => {
    // Pass accuracy
    const homePassAccuracy = statistics.passes.home.attempted > 0 
      ? (statistics.passes.home.successful / statistics.passes.home.attempted) * 100 
      : 0;
    const awayPassAccuracy = statistics.passes.away.attempted > 0 
      ? (statistics.passes.away.successful / statistics.passes.away.attempted) * 100 
      : 0;

    // Shot conversion rate
    const homeShots = statistics.shots.home.onTarget + statistics.shots.home.offTarget;
    const awayShots = statistics.shots.away.onTarget + statistics.shots.away.offTarget;
    const homeShotConversion = homeShots > 0 ? (statistics.shots.home.onTarget / homeShots) * 100 : 0;
    const awayShotConversion = awayShots > 0 ? (statistics.shots.away.onTarget / awayShots) * 100 : 0;

    // Duel success rate
    const homeDuelSuccess = statistics.duels.home.total > 0 
      ? ((statistics.duels.home.won || 0) / statistics.duels.home.total) * 100 
      : 0;
    const awayDuelSuccess = statistics.duels.away.total > 0 
      ? ((statistics.duels.away.won || 0) / statistics.duels.away.total) * 100 
      : 0;

    // Cross success rate
    const homeCrossSuccess = statistics.crosses.home.total > 0 
      ? ((statistics.crosses.home.successful || 0) / statistics.crosses.home.total) * 100 
      : 0;
    const awayCrossSuccess = statistics.crosses.away.total > 0 
      ? ((statistics.crosses.away.successful || 0) / statistics.crosses.away.total) * 100 
      : 0;

    // Ball retention rate
    const homeBallRetention = (statistics.ballsPlayed.home + statistics.ballsLost.home) > 0
      ? (statistics.ballsPlayed.home / (statistics.ballsPlayed.home + statistics.ballsLost.home)) * 100
      : 0;
    const awayBallRetention = (statistics.ballsPlayed.away + statistics.ballsLost.away) > 0
      ? (statistics.ballsPlayed.away / (statistics.ballsPlayed.away + statistics.ballsLost.away)) * 100
      : 0;

    // Attacking third entries (approximation based on ball plays)
    const homeAttackingThird = Math.floor(statistics.ballsPlayed.home * 0.3);
    const awayAttackingThird = Math.floor(statistics.ballsPlayed.away * 0.3);

    // Defensive actions (tackles + interceptions approximation)
    const homeDefensiveActions = statistics.ballsLost.away; // Opposition ball losses = our defensive actions
    const awayDefensiveActions = statistics.ballsLost.home;

    return [
      {
        metric: 'Possession',
        home: `${statistics.possession.home.toFixed(1)}%`,
        away: `${statistics.possession.away.toFixed(1)}%`,
        homeValue: statistics.possession.home,
        awayValue: statistics.possession.away,
        format: 'percentage'
      },
      {
        metric: 'Pass Accuracy',
        home: `${homePassAccuracy.toFixed(1)}%`,
        away: `${awayPassAccuracy.toFixed(1)}%`,
        homeValue: homePassAccuracy,
        awayValue: awayPassAccuracy,
        format: 'percentage'
      },
      {
        metric: 'Shots on Target',
        home: `${statistics.shots.home.onTarget}/${homeShots}`,
        away: `${statistics.shots.away.onTarget}/${awayShots}`,
        homeValue: homeShotConversion,
        awayValue: awayShotConversion,
        format: 'count'
      },
      {
        metric: 'Shot Accuracy',
        home: `${homeShotConversion.toFixed(1)}%`,
        away: `${awayShotConversion.toFixed(1)}%`,
        homeValue: homeShotConversion,
        awayValue: awayShotConversion,
        format: 'percentage'
      },
      {
        metric: 'Duel Success Rate',
        home: `${homeDuelSuccess.toFixed(1)}%`,
        away: `${awayDuelSuccess.toFixed(1)}%`,
        homeValue: homeDuelSuccess,
        awayValue: awayDuelSuccess,
        format: 'percentage'
      },
      {
        metric: 'Cross Success Rate',
        home: `${homeCrossSuccess.toFixed(1)}%`,
        away: `${awayCrossSuccess.toFixed(1)}%`,
        homeValue: homeCrossSuccess,
        awayValue: awayCrossSuccess,
        format: 'percentage'
      },
      {
        metric: 'Ball Retention',
        home: `${homeBallRetention.toFixed(1)}%`,
        away: `${awayBallRetention.toFixed(1)}%`,
        homeValue: homeBallRetention,
        awayValue: awayBallRetention,
        format: 'percentage'
      },
      {
        metric: 'Attacking Third Entries',
        home: homeAttackingThird.toString(),
        away: awayAttackingThird.toString(),
        homeValue: homeAttackingThird,
        awayValue: awayAttackingThird,
        format: 'count'
      },
      {
        metric: 'Defensive Actions',
        home: homeDefensiveActions.toString(),
        away: awayDefensiveActions.toString(),
        homeValue: homeDefensiveActions,
        awayValue: awayDefensiveActions,
        format: 'count'
      },
      {
        metric: 'Corners Won',
        home: statistics.corners.home.toString(),
        away: statistics.corners.away.toString(),
        homeValue: statistics.corners.home,
        awayValue: statistics.corners.away,
        format: 'count'
      },
      {
        metric: 'Offsides',
        home: statistics.offsides.home.toString(),
        away: statistics.offsides.away.toString(),
        homeValue: statistics.offsides.home,
        awayValue: statistics.offsides.away,
        format: 'count'
      },
      {
        metric: 'Fouls Committed',
        home: statistics.fouls.home.toString(),
        away: statistics.fouls.away.toString(),
        homeValue: statistics.fouls.home,
        awayValue: statistics.fouls.away,
        format: 'count'
      }
    ];
  };

  const getProgressValue = (homeValue: number, awayValue: number, homeTeamValue: number) => {
    const total = homeValue + awayValue;
    if (total === 0) return 50;
    return (homeTeamValue / total) * 100;
  };

  const metrics = calculateAdvancedMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Match Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Metric</TableHead>
              <TableHead className="text-center w-1/4">{homeTeamName}</TableHead>
              <TableHead className="w-1/4">Comparison</TableHead>
              <TableHead className="text-center w-1/4">{awayTeamName}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{metric.metric}</TableCell>
                <TableCell className="text-center font-semibold text-blue-600">
                  {metric.home}
                </TableCell>
                <TableCell>
                  <div className="w-full">
                    <Progress 
                      value={getProgressValue(metric.homeValue, metric.awayValue, metric.homeValue)}
                      className="h-2"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold text-red-600">
                  {metric.away}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdvancedStatsTable;
