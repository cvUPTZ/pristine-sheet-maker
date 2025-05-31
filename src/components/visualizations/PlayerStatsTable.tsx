
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Team, MatchEvent } from '@/types';

interface PlayerStatsTableProps {
  homeTeam: Team;
  awayTeam: Team;
  events?: MatchEvent[]; // Made optional since it's not always provided
}

const PlayerStatsTable: React.FC<PlayerStatsTableProps> = ({
  homeTeam,
  awayTeam,
  events = [] // Default to empty array
}) => {
  // Calculate basic stats from team data
  const getPlayerStats = (team: Team) => {
    return team.players.map(player => ({
      name: player.player_name || player.name || `Player ${player.jersey_number || player.number}`,
      number: player.jersey_number || player.number || 0,
      position: player.position || 'Unknown',
      // Add more stats as needed
    }));
  };

  const homeStats = getPlayerStats(homeTeam);
  const awayStats = getPlayerStats(awayTeam);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{homeTeam.name} - Player Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {homeStats.map((player, index) => (
                <TableRow key={index}>
                  <TableCell>{player.number}</TableCell>
                  <TableCell>{player.name}</TableCell>
                  <TableCell>{player.position}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{awayTeam.name} - Player Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awayStats.map((player, index) => (
                <TableRow key={index}>
                  <TableCell>{player.number}</TableCell>
                  <TableCell>{player.name}</TableCell>
                  <TableCell>{player.position}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerStatsTable;
