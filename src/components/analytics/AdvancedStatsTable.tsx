
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Statistics } from '@/types';

interface AdvancedStatsTableProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const AdvancedStatsTable: React.FC<AdvancedStatsTableProps> = ({
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

  const advancedMetrics = [
    {
      metric: 'Duel Success Rate',
      home: statistics.duels?.home?.total ? 
        Math.round(((statistics.duels.home.won || 0) / statistics.duels.home.total) * 100) : 0,
      away: statistics.duels?.away?.total ? 
        Math.round(((statistics.duels.away.won || 0) / statistics.duels.away.total) * 100) : 0,
      unit: '%'
    },
    {
      metric: 'Cross Accuracy',
      home: statistics.crosses?.home?.total ? 
        Math.round(((statistics.crosses.home.successful || 0) / statistics.crosses.home.total) * 100) : 0,
      away: statistics.crosses?.away?.total ? 
        Math.round(((statistics.crosses.away.successful || 0) / statistics.crosses.away.total) * 100) : 0,
      unit: '%'
    },
    {
      metric: 'Pass Accuracy',
      home: calculatePassAccuracy(statistics.passes?.home?.successful, statistics.passes?.home?.successful || 0),
      away: calculatePassAccuracy(statistics.passes?.away?.successful, statistics.passes?.away?.successful || 0),
      unit: '%'
    },
    {
      metric: 'Shot Accuracy',
      home: calculateShotAccuracy(statistics.shots?.home?.onTarget, statistics.shots?.home?.onTarget || 0),
      away: calculateShotAccuracy(statistics.shots?.away?.onTarget, statistics.shots?.away?.onTarget || 0),
      unit: '%'
    },
    {
      metric: 'Total Passes',
      home: statistics.passes?.home?.successful || 0,
      away: statistics.passes?.away?.successful || 0,
      unit: ''
    },
    {
      metric: 'Total Shots',
      home: statistics.shots?.home?.onTarget || 0,
      away: statistics.shots?.away?.onTarget || 0,
      unit: ''
    },
    {
      metric: 'Fouls Committed',
      home: statistics.fouls?.home || 0,
      away: statistics.fouls?.away || 0,
      unit: ''
    },
    {
      metric: 'Corner Kicks',
      home: statistics.corners?.home || 0,
      away: statistics.corners?.away || 0,
      unit: ''
    }
  ];

  const getPerformanceBadge = (homeValue: number, awayValue: number, isHome: boolean) => {
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
