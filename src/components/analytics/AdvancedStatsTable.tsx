
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Statistics as StatisticsType, TeamDetailedStats } from '@/types'; // Use StatisticsType

interface AdvancedStatsTableProps {
  statistics: StatisticsType; // This now contains home: TeamDetailedStats, away: TeamDetailedStats
  homeTeamName: string;
  awayTeamName: string;
}

const AdvancedStatsTable: React.FC<AdvancedStatsTableProps> = ({
  statistics,
  homeTeamName,
  awayTeamName,
}) => {
  if (!statistics || !statistics.home || !statistics.away) {
    return (
      <Card>
        <CardHeader><CardTitle>Advanced Statistics Comparison</CardTitle></CardHeader>
        <CardContent><p className="text-center text-muted-foreground">Not enough data for advanced table.</p></CardContent>
      </Card>
    );
  }

  const { home: homeStats, away: awayStats } = statistics;

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const advancedMetrics = [
    // Passing
    {
      metric: 'Pass Accuracy',
      home: calculatePercentage(homeStats.passesCompleted, homeStats.passesAttempted),
      away: calculatePercentage(awayStats.passesCompleted, awayStats.passesAttempted),
      unit: '%'
    },
    { metric: 'Passes Attempted', home: homeStats.passesAttempted || 0, away: awayStats.passesAttempted || 0, unit: '' },
    { metric: 'Passes Completed', home: homeStats.passesCompleted || 0, away: awayStats.passesCompleted || 0, unit: '' },
    { metric: 'Support Passes', home: homeStats.supportPasses || 0, away: awayStats.supportPasses || 0, unit: '' },
    { metric: 'Offensive Passes', home: homeStats.offensivePasses || 0, away: awayStats.offensivePasses || 0, unit: '' },
    { metric: 'Forward Passes', home: homeStats.forwardPasses || 0, away: awayStats.forwardPasses || 0, unit: '' },
    { metric: 'Backward Passes', home: homeStats.backwardPasses || 0, away: awayStats.backwardPasses || 0, unit: '' },
    { metric: 'Lateral Passes', home: homeStats.lateralPasses || 0, away: awayStats.lateralPasses || 0, unit: '' },
    { metric: 'Long Passes', home: homeStats.longPasses || 0, away: awayStats.longPasses || 0, unit: '' },
    { metric: 'Decisive Passes', home: homeStats.decisivePasses || 0, away: awayStats.decisivePasses || 0, unit: '' },
    {
      metric: 'Cross Accuracy',
      home: calculatePercentage(homeStats.successfulCrosses, homeStats.crosses),
      away: calculatePercentage(awayStats.successfulCrosses, awayStats.crosses),
      unit: '%'
    },
    { metric: 'Attempted Crosses', home: homeStats.crosses || 0, away: awayStats.crosses || 0, unit: '' },
    { metric: 'Successful Crosses', home: homeStats.successfulCrosses || 0, away: awayStats.successfulCrosses || 0, unit: '' },

    // Shooting
    {
      metric: 'Shot Accuracy (On Target / Total)',
      home: calculatePercentage(homeStats.shotsOnTarget, homeStats.shots),
      away: calculatePercentage(awayStats.shotsOnTarget, awayStats.shots),
      unit: '%'
    },
    {
      metric: 'Goal Conversion (Goals / Total Shots)',
      home: calculatePercentage(homeStats.goals, homeStats.shots),
      away: calculatePercentage(awayStats.goals, awayStats.shots),
      unit: '%'
    },
    { metric: 'Total Shots', home: homeStats.shots || 0, away: awayStats.shots || 0, unit: '' },
    { metric: 'Shots On Target', home: homeStats.shotsOnTarget || 0, away: awayStats.shotsOnTarget || 0, unit: '' },
    { metric: 'Total xG', home: parseFloat((homeStats.totalXg || 0).toFixed(2)), away: parseFloat((awayStats.totalXg || 0).toFixed(2)), unit: '' },
    { metric: 'Goals', home: homeStats.goals || 0, away: awayStats.goals || 0, unit: '' },
    // Detailed Shot Breakdowns (Counts)
    { metric: 'Foot Shots On Target', home: homeStats.footShotsOnTarget || 0, away: awayStats.footShotsOnTarget || 0, unit: '' },
    { metric: 'Header Shots On Target', home: homeStats.headerShotsOnTarget || 0, away: awayStats.headerShotsOnTarget || 0, unit: '' },
    { metric: 'Shots Hit Post (Foot+Header)', home: (homeStats.footShotsPostHits || 0) + (homeStats.headerShotsPostHits || 0), away: (awayStats.footShotsPostHits || 0) + (awayStats.headerShotsPostHits || 0), unit: '' },
    { metric: 'Shots Blocked (Foot+Header)', home: (homeStats.footShotsBlocked || 0) + (homeStats.headerShotsBlocked || 0), away: (awayStats.footShotsBlocked || 0) + (awayStats.headerShotsBlocked || 0), unit: '' },
    { metric: 'Dangerous Foot Shots', home: homeStats.dangerousFootShots || 0, away: awayStats.dangerousFootShots || 0, unit: '' },
    { metric: 'Dangerous Header Shots', home: homeStats.dangerousHeaderShots || 0, away: awayStats.dangerousHeaderShots || 0, unit: '' },

    // Duels & Ball Control
    {
      metric: 'Duel Success Rate',
      home: calculatePercentage(homeStats.duelsWon, (homeStats.duelsWon || 0) + (homeStats.duelsLost || 0)),
      away: calculatePercentage(awayStats.duelsWon, (awayStats.duelsWon || 0) + (awayStats.duelsLost || 0)),
      unit: '%'
    },
    { metric: 'Duels Won', home: homeStats.duelsWon || 0, away: awayStats.duelsWon || 0, unit: '' },
    { metric: 'Aerial Duels Won', home: homeStats.aerialDuelsWon || 0, away: awayStats.aerialDuelsWon || 0, unit: '' },
    { metric: 'Balls Played', home: homeStats.ballsPlayed || 0, away: awayStats.ballsPlayed || 0, unit: '' },
    { metric: 'Balls Recovered', home: homeStats.ballsRecovered || 0, away: awayStats.ballsRecovered || 0, unit: '' },
    { metric: 'Balls Lost (Turnovers)', home: homeStats.ballsLost || 0, away: awayStats.ballsLost || 0, unit: '' },
    { metric: 'Contacts', home: homeStats.contacts || 0, away: awayStats.contacts || 0, unit: '' },
    { metric: 'Successful Dribbles', home: homeStats.successfulDribbles || 0, away: awayStats.successfulDribbles || 0, unit: '' },

    // Discipline & Set Pieces
    { metric: 'Fouls Committed', home: homeStats.foulsCommitted || 0, away: awayStats.foulsCommitted || 0, unit: '' },
    { metric: 'Yellow Cards', home: homeStats.yellowCards || 0, away: awayStats.yellowCards || 0, unit: '' },
    { metric: 'Red Cards', home: homeStats.redCards || 0, away: awayStats.redCards || 0, unit: '' },
    { metric: 'Corners', home: homeStats.corners || 0, away: awayStats.corners || 0, unit: '' },
    { metric: 'Offsides', home: homeStats.offsides || 0, away: awayStats.offsides || 0, unit: '' },
    { metric: 'Free Kicks Awarded', home: homeStats.freeKicks || 0, away: awayStats.freeKicks || 0, unit: '' },
    { metric: '6-Meter Violations', home: homeStats.sixMeterViolations || 0, away: awayStats.sixMeterViolations || 0, unit: '' },
  ];

  const getPerformanceBadge = (homeValue: number, awayValue: number, isHome: boolean, lowerIsBetter: boolean = false) => {
    const value = isHome ? homeValue : awayValue;
    const opponent = isHome ? awayValue : homeValue;
    
    if (value > opponent) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Better</Badge>;
    } else if (value < opponent) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Lower</Badge>;
    } else {
      return <Badge variant="outline">Equal</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Statistics Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">{homeTeamName}</th>
                <th className="text-center py-2">Metric</th>
                <th className="text-right py-2">{awayTeamName}</th>
              </tr>
            </thead>
            <tbody>
              {advancedMetrics.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-3 text-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.home}{item.unit}</span>
                      {getPerformanceBadge(item.home, item.away, true)}
                    </div>
                  </td>
                  <td className="py-3 text-center font-medium text-muted-foreground">
                    {item.metric}
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-end gap-2">
                      {getPerformanceBadge(item.home, item.away, false)}
                      <span className="font-medium">{item.away}{item.unit}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedStatsTable;
