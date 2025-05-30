
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Statistics, ShotStats, PassStats } from '@/types';

interface DetailedStatsTableProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const DetailedStatsTable: React.FC<DetailedStatsTableProps> = ({
  statistics,
  homeTeamName,
  awayTeamName
}) => {
  // Helper function to safely get stat values
  const getStat = (stat: any): string => {
    if (typeof stat === 'number') return stat.toString();
    if (typeof stat === 'object' && stat) {
      if ('total' in stat) return stat.total?.toString() || '0';
      if ('successful' in stat && 'attempted' in stat) {
        return `${stat.successful || 0}/${stat.attempted || 0}`;
      }
      if ('onTarget' in stat && 'offTarget' in stat) {
        return `${(stat.onTarget || 0) + (stat.offTarget || 0)}`;
      }
    }
    return '0';
  };

  const getShotStats = (shots: ShotStats | number) => {
    if (typeof shots === 'number') return { onTarget: 0, offTarget: shots, total: shots };
    return shots;
  };

  const getPassStats = (passes: PassStats | number) => {
    if (typeof passes === 'number') return { successful: 0, attempted: passes };
    return passes;
  };

  const homeShots = getShotStats(statistics.shots?.home || 0);
  const awayShots = getShotStats(statistics.shots?.away || 0);
  const homePasses = getPassStats(statistics.passes?.home || 0);
  const awayPasses = getPassStats(statistics.passes?.away || 0);

  const statsData = [
    {
      label: 'Possession',
      home: statistics.possession?.home?.toString() || '0',
      away: statistics.possession?.away?.toString() || '0',
      unit: '%'
    },
    {
      label: 'Total Shots',
      home: getStat(statistics.shots?.home),
      away: getStat(statistics.shots?.away),
      unit: ''
    },
    {
      label: 'Shots on Target', 
      home: homeShots.onTarget?.toString() || '0',
      away: awayShots.onTarget?.toString() || '0',
      unit: ''
    },
    {
      label: 'Passes',
      home: getStat(statistics.passes?.home),
      away: getStat(statistics.passes?.away),
      unit: ''
    },
    {
      label: 'Pass Accuracy',
      home: homePasses.attempted ? `${Math.round((homePasses.successful || 0) / Math.max(homePasses.attempted || 1, 1) * 100)}%` : '0%',
      away: awayPasses.attempted ? `${Math.round((awayPasses.successful || 0) / Math.max(awayPasses.attempted || 1, 1) * 100)}%` : '0%',
      unit: ''
    },
    {
      label: 'Balls Played',
      home: statistics.ballsPlayed?.home?.toString() || '0',
      away: statistics.ballsPlayed?.away?.toString() || '0',
      unit: ''
    },
    {
      label: 'Balls Lost',
      home: statistics.ballsLost?.home?.toString() || '0',
      away: statistics.ballsLost?.away?.toString() || '0',
      unit: ''
    }
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">{homeTeamName}</TableHead>
          <TableHead className="text-center">Statistic</TableHead>
          <TableHead className="text-center">{awayTeamName}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {statsData.map((stat, index) => (
          <TableRow key={index}>
            <TableCell className="text-center font-semibold">
              {stat.home}{stat.unit}
            </TableCell>
            <TableCell className="text-center text-gray-600">
              {stat.label}
            </TableCell>
            <TableCell className="text-center font-semibold">
              {stat.away}{stat.unit}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default DetailedStatsTable;
