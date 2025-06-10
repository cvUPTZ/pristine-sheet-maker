import React from 'react';
import { PlayerStatSummary, Player } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PassFrequencyHeatmapProps {
  playerStats: PlayerStatSummary[];
  allPlayers: Player[]; // Used to get a consistent list of all players for rows/columns
}

interface PassFrequencyData {
  fromPlayerId: string | number;
  toPlayerId: string | number;
  count: number;
}

const PassFrequencyHeatmap: React.FC<PassFrequencyHeatmapProps> = ({
  playerStats,
  allPlayers,
}) => {
  if (!playerStats || playerStats.length === 0 || !allPlayers || allPlayers.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Pass Frequency Heatmap</CardTitle></CardHeader>
        <CardContent><p>Player statistics or player list not available.</p></CardContent>
      </Card>
    );
  }

  // Create a map of player ID to player name for easy lookup
  const playerMap = new Map(allPlayers.map(p => [String(p.id), p.playerName || p.name || `ID: ${p.id}`]));

  // Aggregate pass frequencies
  const passMatrix: { [fromId: string]: { [toId: string]: number } } = {};
  let maxFrequency = 0;

  allPlayers.forEach(player => {
    const fromPlayerIdStr = String(player.id);
    passMatrix[fromPlayerIdStr] = {}; // Initialize row for this player
    allPlayers.forEach(p2 => passMatrix[fromPlayerIdStr][String(p2.id)] = 0); // Initialize all cells to 0

    const stats = playerStats.find(ps => String(ps.playerId) === fromPlayerIdStr);
    if (stats && stats.passNetworkSent) {
      stats.passNetworkSent.forEach(link => {
        const toPlayerIdStr = String(link.toPlayerId);
        if (passMatrix[fromPlayerIdStr] && typeof passMatrix[fromPlayerIdStr][toPlayerIdStr] !== 'undefined') {
           // We are interested in successful passes for frequency, or total attempts?
           // Using link.count for total attempts here. Use link.successfulCount for successful.
          passMatrix[fromPlayerIdStr][toPlayerIdStr] = (passMatrix[fromPlayerIdStr][toPlayerIdStr] || 0) + link.count;
          if (link.count > maxFrequency) {
            maxFrequency = link.count;
          }
        }
      });
    }
  });

  // Sort players for consistent order in the heatmap table (e.g., by name or jersey number if available)
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    const nameA = playerMap.get(String(a.id)) || '';
    const nameB = playerMap.get(String(b.id)) || '';
    return nameA.localeCompare(nameB);
  });


  // Placeholder for actual heatmap: using a table with cell background intensity
  const getCellColor = (value: number) => {
    if (value === 0 || maxFrequency === 0) return 'bg-gray-100'; // Light gray for zero
    const intensity = Math.min(1, value / (maxFrequency * 0.75)); // Cap intensity for better visuals
    const alpha = intensity * 0.8 + 0.2; // from 0.2 to 1.0
    return `rgba(66, 153, 225, ${alpha})`; // Blue scale, e.g., bg-blue-500 with opacity
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pass Frequency Heatmap</CardTitle>
        <CardDescription>Frequency of passes between players (number of attempted passes shown).</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {sortedPlayers.length > 0 ? (
          <Table className="min-w-full border">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 border-r">From &#8595; / To &#8594;</TableHead>
                {sortedPlayers.map(player => (
                  <TableHead key={`col-${player.id}`} className="text-center text-xs p-1 whitespace-nowrap transform -rotate-45 origin-bottom-left">
                    <span className="inline-block " style={{transform: 'translateY(10px) translateX(-5px)'}}>{playerMap.get(String(player.id))}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map(fromPlayer => (
                <TableRow key={`row-${fromPlayer.id}`}>
                  <TableCell className="font-medium sticky left-0 bg-background z-10 border-r whitespace-nowrap">
                    {playerMap.get(String(fromPlayer.id))}
                  </TableCell>
                  {sortedPlayers.map(toPlayer => {
                    const fromIdStr = String(fromPlayer.id);
                    const toIdStr = String(toPlayer.id);
                    const count = passMatrix[fromIdStr]?.[toIdStr] || 0;
                    return (
                      <TableCell
                        key={`cell-${fromPlayer.id}-${toPlayer.id}`}
                        className="text-center p-1 border"
                        style={{ backgroundColor: getCellColor(count), color: count > maxFrequency / 2 ? 'white' : 'black' }}
                        title={`${playerMap.get(fromIdStr)} to ${playerMap.get(toIdStr)}: ${count} passes`}
                      >
                        {count > 0 ? count : '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p>Not enough player data to render heatmap.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default PassFrequencyHeatmap;
