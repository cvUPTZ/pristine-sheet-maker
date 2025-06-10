import React from 'react';
import { PlayerStatSummary, Player } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PlayerPassingStatsTableProps {
  playerStats: PlayerStatSummary[];
  // allPlayersForMatch: Player[];
}

const PlayerPassingStatsTable: React.FC<PlayerPassingStatsTableProps> = ({
  playerStats,
}) => {
  if (!playerStats || playerStats.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Player Passing Statistics</CardTitle></CardHeader>
        <CardContent><p>No player statistics available.</p></CardContent>
      </Card>
    );
  }

  const calculateAccuracy = (completed: number, attempted: number): string => {
    if (attempted === 0) return '0%';
    return `${((completed / attempted) * 100).toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Passing Breakdown</CardTitle>
        <CardDescription>Detailed passing metrics for each player.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Attempted</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Accuracy</TableHead>
              <TableHead className="text-right">Support</TableHead>
              <TableHead className="text-right">Decisive</TableHead>
              <TableHead className="text-right">Forward</TableHead>
              <TableHead className="text-right">Backward</TableHead>
              <TableHead className="text-right">Lateral</TableHead>
              <TableHead className="text-right">Long</TableHead>
              <TableHead className="text-right">Succ. Crosses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playerStats.map((stat) => (
              <TableRow key={stat.playerId}>
                <TableCell className="font-medium">{stat.playerName || `ID: ${stat.playerId}`}</TableCell>
                <TableCell>{stat.team}</TableCell>
                <TableCell className="text-right">{stat.passesAttempted || 0}</TableCell>
                <TableCell className="text-right">{stat.passesCompleted || 0}</TableCell>
                <TableCell className="text-right">
                  {calculateAccuracy(stat.passesCompleted || 0, stat.passesAttempted || 0)}
                </TableCell>
                <TableCell className="text-right">{stat.supportPasses || 0}</TableCell>
                <TableCell className="text-right">{stat.decisivePasses || 0}</TableCell>
                <TableCell className="text-right">{stat.forwardPasses || 0}</TableCell>
                <TableCell className="text-right">{stat.backwardPasses || 0}</TableCell>
                <TableCell className="text-right">{stat.lateralPasses || 0}</TableCell>
                <TableCell className="text-right">{stat.longPasses || 0}</TableCell>
                <TableCell className="text-right">{stat.successfulCrosses || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PlayerPassingStatsTable;
