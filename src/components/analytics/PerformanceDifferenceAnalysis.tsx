import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PerformanceDifferenceAnalysisProps {
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeTeamName: string;
  awayTeamName: string;
}

interface DifferenceStat {
  metric: string;
  homeValue: number | string;
  awayValue: number | string;
  difference: number | string;
  unit?: string;
}

const PerformanceDifferenceAnalysis: React.FC<PerformanceDifferenceAnalysisProps> = ({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}) => {
  const calculatePercentage = (value: number, total: number): number => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  const calculateDifference = (homeVal: number, awayVal: number, isPercentage: boolean = false): string => {
    const diff = homeVal - awayVal;
    if (isPercentage) {
      return `${diff.toFixed(1)}%`;
    }
    return diff.toFixed(0); // Use toFixed(0) for whole numbers, or toFixed(2) for others if needed
  };

  const formatValue = (value: number, isPercentage: boolean = false, decimals: number = 0): string => {
    if (isPercentage) return `${value.toFixed(1)}%`;
    return value.toFixed(decimals);
  }

  const homePassAccuracy = calculatePercentage(homeStats.passesCompleted || 0, homeStats.passesAttempted || 0);
  const awayPassAccuracy = calculatePercentage(awayStats.passesCompleted || 0, awayStats.passesAttempted || 0);

  const homeShotAccuracy = calculatePercentage(homeStats.shotsOnTarget || 0, homeStats.shots || 0);
  const awayShotAccuracy = calculatePercentage(awayStats.shotsOnTarget || 0, awayStats.shots || 0);

  const homeDuelSuccessRate = calculatePercentage(homeStats.duelsWon || 0, (homeStats.duelsWon || 0) + (homeStats.duelsLost || 0));
  const awayDuelSuccessRate = calculatePercentage(awayStats.duelsWon || 0, (awayStats.duelsWon || 0) + (awayStats.duelsLost || 0));

  const analysisData: DifferenceStat[] = [
    {
      metric: 'Possession %',
      homeValue: formatValue(homeStats.possessionPercentage || 0, true),
      awayValue: formatValue(awayStats.possessionPercentage || 0, true),
      difference: calculateDifference(homeStats.possessionPercentage || 0, awayStats.possessionPercentage || 0, true),
    },
    {
      metric: 'Pass Accuracy',
      homeValue: formatValue(homePassAccuracy, true),
      awayValue: formatValue(awayPassAccuracy, true),
      difference: calculateDifference(homePassAccuracy, awayPassAccuracy, true),
    },
    {
      metric: 'Shot Accuracy (On Target / Total)',
      homeValue: formatValue(homeShotAccuracy, true),
      awayValue: formatValue(awayShotAccuracy, true),
      difference: calculateDifference(homeShotAccuracy, awayShotAccuracy, true),
    },
    {
      metric: 'Duel Success Rate',
      homeValue: formatValue(homeDuelSuccessRate, true),
      awayValue: formatValue(awayDuelSuccessRate, true),
      difference: calculateDifference(homeDuelSuccessRate, awayDuelSuccessRate, true),
    },
    {
      metric: 'Total Shots',
      homeValue: formatValue(homeStats.shots || 0),
      awayValue: formatValue(awayStats.shots || 0),
      difference: calculateDifference(homeStats.shots || 0, awayStats.shots || 0),
    },
    {
      metric: 'xG (Expected Goals)',
      homeValue: formatValue(homeStats.totalXg || 0, false, 2),
      awayValue: formatValue(awayStats.totalXg || 0, false, 2),
      difference: calculateDifference(homeStats.totalXg || 0, awayStats.totalXg || 0), // Potentially toFixed(2) for diff
    },
     {
      metric: 'Balls Lost',
      homeValue: formatValue(homeStats.ballsLost || 0),
      awayValue: formatValue(awayStats.ballsLost || 0),
      difference: calculateDifference(homeStats.ballsLost || 0, awayStats.ballsLost || 0),
    },
    {
      metric: 'Balls Recovered',
      homeValue: formatValue(homeStats.ballsRecovered || 0),
      awayValue: formatValue(awayStats.ballsRecovered || 0),
      difference: calculateDifference(homeStats.ballsRecovered || 0, awayStats.ballsRecovered || 0),
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Difference Analysis</CardTitle>
        <CardDescription>
          Comparing key performance indicators between {homeTeamName} and {awayTeamName}.
          Difference is {homeTeamName} value minus {awayTeamName} value.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-center">{homeTeamName}</TableHead>
              <TableHead className="text-center">{awayTeamName}</TableHead>
              <TableHead className="text-center">Difference (Home - Away)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysisData.map((stat) => (
              <TableRow key={stat.metric}>
                <TableCell className="font-medium">{stat.metric}</TableCell>
                <TableCell className="text-center">{stat.homeValue}</TableCell>
                <TableCell className="text-center">{stat.awayValue}</TableCell>
                <TableCell className="text-center font-semibold">{stat.difference}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PerformanceDifferenceAnalysis;
