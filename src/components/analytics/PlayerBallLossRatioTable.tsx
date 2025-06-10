import React from 'react';
import { PlayerStatSummary, Player } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';


interface PlayerBallLossRatioTableProps {
  playerStats: PlayerStatSummary[];
  // allPlayersForMatch: Player[];
}

const PlayerBallLossRatioTable: React.FC<PlayerBallLossRatioTableProps> = ({
  playerStats,
}) => {
  if (!playerStats || playerStats.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Player Ball Loss Ratio</CardTitle></CardHeader>
        <CardContent><p>No player statistics available.</p></CardContent>
      </Card>
    );
  }

  const calculateLossRatio = (ballsGiven: number, ballsPlayed: number): number => {
    if (ballsPlayed === 0) return 0; // Or Infinity / NaN if preferred for "error" state
    return (ballsGiven / ballsPlayed) * 100;
  };

  // Sort by loss ratio (descending - higher loss ratio first) as an example
  const sortedPlayerStats = [...playerStats].sort((a, b) => {
    const ratioA = calculateLossRatio(a.ballsGiven || 0, a.ballsPlayed || 0);
    const ratioB = calculateLossRatio(b.ballsGiven || 0, b.ballsPlayed || 0);
    return ratioB - ratioA;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Ball Loss Analysis</CardTitle>
        <CardDescription>Ratio of balls given away to total balls played. Lower is better.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Balls Played</TableHead>
              <TableHead className="text-right">Balls Given (Lost)</TableHead>
              <TableHead className="text-right">Loss Ratio (%)</TableHead>
              <TableHead className="w-[100px] text-center">Visual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlayerStats.map((stat) => {
              const lossRatio = calculateLossRatio(stat.ballsGiven || 0, stat.ballsPlayed || 0);
              return (
                <TableRow key={stat.playerId}>
                  <TableCell className="font-medium">{stat.playerName || `ID: ${stat.playerId}`}</TableCell>
                  <TableCell>{stat.team}</TableCell>
                  <TableCell className="text-right">{stat.ballsPlayed || 0}</TableCell>
                  <TableCell className="text-right">{stat.ballsGiven || 0}</TableCell>
                  <TableCell className="text-right">{lossRatio.toFixed(1)}%</TableCell>
                  <TableCell>
                    {/* Lower is better, so a full bar for high loss ratio is "bad" */}
                    <Progress value={lossRatio} max={100} className="h-3"
                              aria-label={`Loss ratio ${lossRatio.toFixed(1)}%`} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PlayerBallLossRatioTable;
