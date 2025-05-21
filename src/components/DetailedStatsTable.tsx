
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
import { PlayerStatistics } from '@/types';
import { Badge } from '@/components/ui/badge';

interface DetailedStatsTableProps {
  playerStats: PlayerStatistics[];
  type: 'team' | 'individual';
  teamId?: string;
}

const DetailedStatsTable: React.FC<DetailedStatsTableProps> = ({ 
  playerStats, 
  type, 
  teamId 
}) => {
  
  // Filter by team if needed
  const filteredStats = teamId 
    ? playerStats.filter(stat => stat.team === teamId)
    : playerStats;
  
  return (
    <div className="overflow-auto">
      <Table>
        <TableCaption>
          {type === 'individual' 
            ? 'Individual Player Statistics' 
            : 'Team Performance Statistics'}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Number</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-right">Goals</TableHead>
            <TableHead className="text-right">Assists</TableHead>
            <TableHead className="text-right">Passes</TableHead>
            <TableHead className="text-right">Shots</TableHead>
            <TableHead className="text-right">Fouls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStats.map((stat) => (
            <TableRow key={`${stat.playerId}-${stat.team}`}>
              <TableCell className="font-medium">
                <Badge variant="outline">{stat.player?.number || 0}</Badge>
              </TableCell>
              <TableCell>{stat.playerName}</TableCell>
              <TableCell>
                <Badge className={`bg-${stat.team === 'home' ? 'football-home' : 'football-away'} text-white`}>
                  {stat.team}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{stat.goals || 0}</TableCell>
              <TableCell className="text-right">{stat.assists || 0}</TableCell>
              <TableCell className="text-right">{stat.passes || 0}</TableCell>
              <TableCell className="text-right">{stat.shots || 0}</TableCell>
              <TableCell className="text-right">{stat.fouls || 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DetailedStatsTable;
