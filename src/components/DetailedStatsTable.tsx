
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Statistics, ShotStats, PassStats } from '@/types';

interface DetailedStatsTableProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

interface StatsDataItem {
  label: string;
  home: string;
  away: string;
  unit?: string; // Added optional unit property
}

const DetailedStatsTable: React.FC<DetailedStatsTableProps> = ({
  statistics,
  homeTeamName,
  awayTeamName
}) => {
  const { home, away } = statistics; // home and away are now TeamDetailedStats

  const calculateAccuracy = (completed: number, attempted: number) => {
    if (attempted === 0) return '0%';
    return `${Math.round((completed / attempted) * 100)}%`;
  };

  const statsData: StatsDataItem[] = [
    // General & Possession
    { label: 'Possession', home: `${home?.possessionPercentage || 0}%`, away: `${away?.possessionPercentage || 0}%` },
    { label: 'Possession (Minutes)', home: (home?.possessionMinutes || 0).toString(), away: (away?.possessionMinutes || 0).toString() },

    // Shooting
    { label: 'Total Shots', home: (home?.shots || 0).toString(), away: (away?.shots || 0).toString() },
    { label: 'Shots on Target', home: (home?.shotsOnTarget || 0).toString(), away: (away?.shotsOnTarget || 0).toString() },
    { label: 'Total xG', home: (home?.totalXg || 0).toFixed(2), away: (away?.totalXg || 0).toFixed(2) },
    { label: 'Foot Shots (Dangerous)', home: (home?.dangerousFootShots || 0).toString(), away: (away?.dangerousFootShots || 0).toString() },
    { label: 'Foot Shots (Non-Dangerous)', home: (home?.nonDangerousFootShots || 0).toString(), away: (away?.nonDangerousFootShots || 0).toString() },
    { label: 'Foot Shots On Target', home: (home?.footShotsOnTarget || 0).toString(), away: (away?.footShotsOnTarget || 0).toString() },
    { label: 'Foot Shots Off Target', home: (home?.footShotsOffTarget || 0).toString(), away: (away?.footShotsOffTarget || 0).toString() },
    { label: 'Foot Shots Hit Post', home: (home?.footShotsPostHits || 0).toString(), away: (away?.footShotsPostHits || 0).toString() },
    { label: 'Foot Shots Blocked', home: (home?.footShotsBlocked || 0).toString(), away: (away?.footShotsBlocked || 0).toString() },
    { label: 'Header Shots (Dangerous)', home: (home?.dangerousHeaderShots || 0).toString(), away: (away?.dangerousHeaderShots || 0).toString() },
    { label: 'Header Shots (Non-Dangerous)', home: (home?.nonDangerousHeaderShots || 0).toString(), away: (away?.nonDangerousHeaderShots || 0).toString() },
    { label: 'Header Shots On Target', home: (home?.headerShotsOnTarget || 0).toString(), away: (away?.headerShotsOnTarget || 0).toString() },
    { label: 'Header Shots Off Target', home: (home?.headerShotsOffTarget || 0).toString(), away: (away?.headerShotsOffTarget || 0).toString() },
    { label: 'Header Shots Hit Post', home: (home?.headerShotsPostHits || 0).toString(), away: (away?.headerShotsPostHits || 0).toString() },
    { label: 'Header Shots Blocked', home: (home?.headerShotsBlocked || 0).toString(), away: (away?.headerShotsBlocked || 0).toString() },

    // Passing
    { label: 'Passes Attempted', home: (home?.passesAttempted || 0).toString(), away: (away?.passesAttempted || 0).toString() },
    { label: 'Passes Completed', home: (home?.passesCompleted || 0).toString(), away: (away?.passesCompleted || 0).toString() },
    { label: 'Pass Accuracy', home: calculateAccuracy(home?.passesCompleted || 0, home?.passesAttempted || 0), away: calculateAccuracy(away?.passesCompleted || 0, away?.passesAttempted || 0) },
    { label: 'Support Passes', home: (home?.supportPasses || 0).toString(), away: (away?.supportPasses || 0).toString() },
    { label: 'Offensive Passes', home: (home?.offensivePasses || 0).toString(), away: (away?.offensivePasses || 0).toString() },
    { label: 'Long Passes', home: (home?.longPasses || 0).toString(), away: (away?.longPasses || 0).toString() },
    { label: 'Forward Passes', home: (home?.forwardPasses || 0).toString(), away: (away?.forwardPasses || 0).toString() },
    { label: 'Backward Passes', home: (home?.backwardPasses || 0).toString(), away: (away?.backwardPasses || 0).toString() },
    { label: 'Lateral Passes', home: (home?.lateralPasses || 0).toString(), away: (away?.lateralPasses || 0).toString() },
    { label: 'Decisive Passes', home: (home?.decisivePasses || 0).toString(), away: (away?.decisivePasses || 0).toString() },
    { label: 'Attempted Crosses', home: (home?.crosses || 0).toString(), away: (away?.crosses || 0).toString() },
    { label: 'Successful Crosses', home: (home?.successfulCrosses || 0).toString(), away: (away?.successfulCrosses || 0).toString() },

    // Ball Control & Duels
    { label: 'Balls Played', home: (home?.ballsPlayed || 0).toString(), away: (away?.ballsPlayed || 0).toString() },
    { label: 'Balls Recovered', home: (home?.ballsRecovered || 0).toString(), away: (away?.ballsRecovered || 0).toString() },
    { label: 'Balls Lost', home: (home?.ballsLost || 0).toString(), away: (away?.ballsLost || 0).toString() },
    { label: 'Contacts', home: (home?.contacts || 0).toString(), away: (away?.contacts || 0).toString() },
    { label: 'Duels Won', home: (home?.duelsWon || 0).toString(), away: (away?.duelsWon || 0).toString() },
    { label: 'Duels Lost', home: (home?.duelsLost || 0).toString(), away: (away?.duelsLost || 0).toString() },
    { label: 'Aerial Duels Won', home: (home?.aerialDuelsWon || 0).toString(), away: (away?.aerialDuelsWon || 0).toString() },
    { label: 'Aerial Duels Lost', home: (home?.aerialDuelsLost || 0).toString(), away: (away?.aerialDuelsLost || 0).toString() },
    { label: 'Successful Dribbles', home: (home?.successfulDribbles || 0).toString(), away: (away?.successfulDribbles || 0).toString() },

    // Game Actions & Discipline
    { label: 'Assists', home: (home?.assists || 0).toString(), away: (away?.assists || 0).toString() },
    { label: 'Tackles', home: (home?.tackles || 0).toString(), away: (away?.tackles || 0).toString() },
    { label: 'Interceptions', home: (home?.interceptions || 0).toString(), away: (away?.interceptions || 0).toString() },
    { label: 'Clearances', home: (home?.clearances || 0).toString(), away: (away?.clearances || 0).toString() },
    { label: 'Blocks (Defensive)', home: (home?.blocks || 0).toString(), away: (away?.blocks || 0).toString() },
    { label: 'Fouls Committed', home: (home?.foulsCommitted || 0).toString(), away: (away?.foulsCommitted || 0).toString() },
    { label: 'Yellow Cards', home: (home?.yellowCards || 0).toString(), away: (away?.yellowCards || 0).toString() },
    { label: 'Red Cards', home: (home?.redCards || 0).toString(), away: (away?.redCards || 0).toString() },
    { label: 'Corners', home: (home?.corners || 0).toString(), away: (away?.corners || 0).toString() },
    { label: 'Offsides', home: (home?.offsides || 0).toString(), away: (away?.offsides || 0).toString() },
    { label: 'Free Kicks Awarded', home: (home?.freeKicks || 0).toString(), away: (away?.freeKicks || 0).toString() },
    { label: '6-Meter Violations', home: (home?.sixMeterViolations || 0).toString(), away: (away?.sixMeterViolations || 0).toString() },
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
              {stat.home}{stat.unit || ''}
            </TableCell>
            <TableCell className="text-center text-gray-600">
              {stat.label}
            </TableCell>
            <TableCell className="text-center font-semibold">
              {stat.away}{stat.unit || ''}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default DetailedStatsTable;
