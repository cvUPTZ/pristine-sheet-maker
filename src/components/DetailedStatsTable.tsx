
import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Statistics } from '@/types';
import { Badge } from '@/components/ui/badge';

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
  
  return (
    <div className="overflow-auto">
      <Table>
        <TableCaption>
          Team Performance Statistics
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">{homeTeamName}</TableHead>
            <TableHead className="text-right">{awayTeamName}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Possession (%)</TableCell>
            <TableCell className="text-right">{Math.round(statistics.possession.home)}%</TableCell>
            <TableCell className="text-right">{Math.round(statistics.possession.away)}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Total Shots</TableCell>
            <TableCell className="text-right">{statistics.shots.home.onTarget + statistics.shots.home.offTarget}</TableCell>
            <TableCell className="text-right">{statistics.shots.away.onTarget + statistics.shots.away.offTarget}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Shots on Target</TableCell>
            <TableCell className="text-right">{statistics.shots.home.onTarget}</TableCell>
            <TableCell className="text-right">{statistics.shots.away.onTarget}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Successful Passes</TableCell>
            <TableCell className="text-right">{statistics.passes.home.successful}</TableCell>
            <TableCell className="text-right">{statistics.passes.away.successful}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Total Passes</TableCell>
            <TableCell className="text-right">{statistics.passes.home.attempted}</TableCell>
            <TableCell className="text-right">{statistics.passes.away.attempted}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Balls Played</TableCell>
            <TableCell className="text-right">{statistics.ballsPlayed.home}</TableCell>
            <TableCell className="text-right">{statistics.ballsPlayed.away}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Balls Lost</TableCell>
            <TableCell className="text-right">{statistics.ballsLost.home}</TableCell>
            <TableCell className="text-right">{statistics.ballsLost.away}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default DetailedStatsTable;
