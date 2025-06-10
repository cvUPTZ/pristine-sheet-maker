import React from 'react';
import { PlayerStatSummary, Player } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PlayerBallRecoveryStatsProps {
  playerStats: PlayerStatSummary[];
  // allPlayersForMatch: Player[];
}

const PlayerBallRecoveryStats: React.FC<PlayerBallRecoveryStatsProps> = ({
  playerStats,
}) => {
  if (!playerStats || playerStats.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Player Ball Recovery Statistics</CardTitle></CardHeader>
        <CardContent><p>No player statistics available.</p></CardContent>
      </Card>
    );
  }

  // Sort by recoveries (descending)
  const sortedPlayerStats = [...playerStats].sort((a, b) => (b.ballsRecovered || 0) - (a.ballsRecovered || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Ball Recoveries</CardTitle>
        <CardDescription>Number of times each player recovered the ball.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Balls Recovered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlayerStats.map((stat, index) => (
              <TableRow key={stat.playerId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{stat.playerName || `ID: ${stat.playerId}`}</TableCell>
                <TableCell>{stat.team}</TableCell>
                <TableCell className="text-right">{stat.ballsRecovered || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PlayerBallRecoveryStats;
