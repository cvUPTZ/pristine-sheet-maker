
import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BallTrackingPoint, Player, Team } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface PlayerStatsTableProps {
  ballTrackingPoints: BallTrackingPoint[];
  homeTeam: Team;
  awayTeam: Team;
}

interface PlayerStats {
  id: number;
  name: string;
  number: number;
  team: string;
  teamId: string;
  ballsPlayed: number;
  ballsLost: number;
  ballsReceived: number;
  passesAttempted: number;
  passesCompleted: number;
  lossRatio: number;
  possessionDuration: number;
}

const PlayerStatsTable: React.FC<PlayerStatsTableProps> = ({ 
  ballTrackingPoints,
  homeTeam,
  awayTeam
}) => {
  const playerStats = useMemo(() => {
    if (!ballTrackingPoints.length) return [];
    
    // Initialize player stats for all players
    const stats: Record<string, PlayerStats> = {};
    
    // Create stats entries for all players
    [...homeTeam.players, ...awayTeam.players].forEach(player => {
      const teamId = homeTeam.players.find(p => p.id === player.id) ? homeTeam.id : awayTeam.id;
      const teamName = teamId === homeTeam.id ? homeTeam.name : awayTeam.name;
      
      stats[player.id] = {
        id: player.id,
        name: player.name,
        number: player.number,
        team: teamName,
        teamId,
        ballsPlayed: 0,
        ballsLost: 0,
        ballsReceived: 0,
        passesAttempted: 0,
        passesCompleted: 0,
        lossRatio: 0,
        possessionDuration: 0
      };
    });
    
    // Process ball tracking points
    for (let i = 0; i < ballTrackingPoints.length; i++) {
      const current = ballTrackingPoints[i];
      
      if (current.playerId) {
        // Count ball possession
        stats[current.playerId].ballsPlayed += 1;
        
        // Calculate passes
        if (i < ballTrackingPoints.length - 1) {
          const next = ballTrackingPoints[i + 1];
          
          if (next.playerId && current.playerId !== next.playerId) {
            stats[current.playerId].passesAttempted += 1;
            
            // If same team, count as successful pass
            if (current.teamId === next.teamId) {
              stats[current.playerId].passesCompleted += 1;
              stats[next.playerId].ballsReceived += 1;
            } else {
              // Ball lost to other team
              stats[current.playerId].ballsLost += 1;
            }
          }
        }
        
        // Calculate possession duration
        if (i < ballTrackingPoints.length - 1) {
          const timeDiff = ballTrackingPoints[i + 1].timestamp - current.timestamp;
          stats[current.playerId].possessionDuration += timeDiff / 1000; // Convert to seconds
        }
      }
    }
    
    // Calculate loss ratio
    Object.values(stats).forEach(player => {
      player.lossRatio = player.ballsPlayed > 0 ? (player.ballsLost / player.ballsPlayed) * 100 : 0;
    });
    
    return Object.values(stats).filter(player => player.ballsPlayed > 0);
  }, [ballTrackingPoints, homeTeam, awayTeam]);
  
  const sortedHomeStats = playerStats.filter(p => p.teamId === homeTeam.id)
    .sort((a, b) => b.ballsPlayed - a.ballsPlayed);
    
  const sortedAwayStats = playerStats.filter(p => p.teamId === awayTeam.id)
    .sort((a, b) => b.ballsPlayed - a.ballsPlayed);
  
  // Find max values for scaling
  const maxBallsPlayed = Math.max(...playerStats.map(p => p.ballsPlayed), 1);
  const maxPassesAttempted = Math.max(...playerStats.map(p => p.passesAttempted), 1);
  const maxBallsLost = Math.max(...playerStats.map(p => p.ballsLost), 1);
  const maxPossessionDuration = Math.max(...playerStats.map(p => p.possessionDuration), 1);
  
  if (ballTrackingPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player Statistics</CardTitle>
          <CardDescription>No player data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[100px] flex items-center justify-center text-muted-foreground">
          Track ball movement to see player statistics
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Player Statistics Analysis</CardTitle>
        <CardDescription>Detailed statistics for each player</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ballsPlayed" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
            <TabsTrigger value="ballsPlayed">Balls Played</TabsTrigger>
            <TabsTrigger value="passes">Passes</TabsTrigger>
            <TabsTrigger value="ballsLost">Balls Lost</TabsTrigger>
            <TabsTrigger value="possession">Possession Time</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ballsPlayed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={2} className="bg-blue-50">{homeTeam.name}</TableHead>
                    <TableHead className="text-right bg-blue-50">Balls Played</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHomeStats.map(player => (
                    <TableRow key={`home-${player.id}-balls`}>
                      <TableCell className="font-medium w-8">{player.number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={player.ballsPlayed} max={maxBallsPlayed} className="w-24 h-2" />
                          <span>{player.ballsPlayed}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={2} className="bg-red-50">{awayTeam.name}</TableHead>
                    <TableHead className="text-right bg-red-50">Balls Played</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAwayStats.map(player => (
                    <TableRow key={`away-${player.id}-balls`}>
                      <TableCell className="font-medium w-8">{player.number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={player.ballsPlayed} max={maxBallsPlayed} className="w-24 h-2" />
                          <span>{player.ballsPlayed}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="passes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={2} className="bg-blue-50">{homeTeam.name}</TableHead>
                    <TableHead className="text-right bg-blue-50">Passes (Completed/Total)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHomeStats.map(player => (
                    <TableRow key={`home-${player.id}-passes`}>
                      <TableCell className="font-medium w-8">{player.number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 h-2 bg-gray-200 relative">
                            <div className="absolute top-0 left-0 h-2 bg-green-500" 
                              style={{width: `${(player.passesCompleted / maxPassesAttempted) * 100}%`}} />
                            <div className="absolute top-0 left-0 h-2 bg-gray-400" 
                              style={{width: `${(player.passesAttempted / maxPassesAttempted) * 100}%`, opacity: '0.6'}} />
                          </div>
                          <span>{player.passesCompleted}/{player.passesAttempted}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={2} className="bg-red-50">{awayTeam.name}</TableHead>
                    <TableHead className="text-right bg-red-50">Passes (Completed/Total)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAwayStats.map(player => (
                    <TableRow key={`away-${player.id}-passes`}>
                      <TableCell className="font-medium w-8">{player.number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 h-2 bg-gray-200 relative">
                            <div className="absolute top-0 left-0 h-2 bg-green-500" 
                              style={{width: `${(player.passesCompleted / maxPassesAttempted) * 100}%`}} />
                            <div className="absolute top-0 left-0 h-2 bg-gray-400" 
                              style={{width: `${(player.passesAttempted / maxPassesAttempted) * 100}%`, opacity: '0.6'}} />
                          </div>
                          <span>{player.passesCompleted}/{player.passesAttempted}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="ballsLost">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={2} className="bg-blue-50">{homeTeam.name}</TableHead>
                    <TableHead className="text-right bg-blue-50">Balls Lost (% of Played)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHomeStats.map(player => (
                    <TableRow key={`home-${player.id}-lost`}>
                      <TableCell className="font-medium w-8">{player.number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={player.ballsLost} max={maxBallsLost} className="w-24 h-2" />
                          <span>{player.ballsLost} ({player.lossRatio.toFixed(1)}%)</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={2} className="bg-red-50">{awayTeam.name}</TableHead>
                    <TableHead className="text-right bg-red-50">Balls Lost (% of Played)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAwayStats.map(player => (
                    <TableRow key={`away-${player.id}-lost`}>
                      <TableCell className="font-medium w-8">{player.number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={player.ballsLost} max={maxBallsLost} className="w-24 h-2" />
                          <span>{player.ballsLost} ({player.lossRatio.toFixed(1)}%)</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="possession">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={2} className="bg-blue-50">{homeTeam.name}</TableHead>
                    <TableHead className="text-right bg-blue-50">Possession Time (sec)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHomeStats.map(player => (
                    <TableRow key={`home-${player.id}-possession`}>
                      <TableCell className="font-medium w-8">{player.number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={player.possessionDuration} max={maxPossessionDuration} className="w-24 h-2" />
                          <span>{player.possessionDuration.toFixed(1)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead colSpan={2} className="bg-red-50">{awayTeam.name}</TableHead>
                    <TableHead className="text-right bg-red-50">Possession Time (sec)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAwayStats.map(player => (
                    <TableRow key={`away-${player.id}-possession`}>
                      <TableCell className="font-medium w-8">{player.number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={player.possessionDuration} max={maxPossessionDuration} className="w-24 h-2" />
                          <span>{player.possessionDuration.toFixed(1)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PlayerStatsTable;
