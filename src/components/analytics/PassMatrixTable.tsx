import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ArrowRight, Grid3X3, BarChart3 } from 'lucide-react';
import { MatchEvent } from '@/types/index';
import D3SankeyChart from './D3SankeyChart';

interface PassMatrixTableProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
}

interface PassConnection {
  fromPlayerId: number;
  toPlayerId: number;
  fromPlayerName: string;
  toPlayerName: string;
  count: number;
  team: 'home' | 'away';
}

interface PlayerSummary {
  id: number;
  name: string;
  team: 'home' | 'away';
  passesGiven: number;
  passesReceived: number;
}

const PassMatrixTable: React.FC<PassMatrixTableProps> = ({
  events,
  homeTeamName,
  awayTeamName,
  homeTeamPlayers,
  awayTeamPlayers
}) => {
  // Filter for actual pass events with necessary data at the beginning of the component
  const actualPassEvents = React.useMemo(() => events.filter(event =>
    event.type === 'pass' &&
    event.player_id &&
    event.event_data &&
    (event.event_data as any).recipient_player_id
  ), [events]);

  // Extract pass events and build connections
  const passConnections = React.useMemo(() => {
    const connections: { [key: string]: PassConnection } = {};
    
    // Use the pre-filtered actualPassEvents
    if (actualPassEvents.length === 0) {
      return []; // Return empty if no valid pass events
    }

    actualPassEvents.forEach(passEvent => {
      const fromPlayerId = Number(passEvent.player_id);
      const toPlayerId = Number((passEvent.event_data as any).recipient_player_id);
      const team = passEvent.team || 'home';
      
      // Find player names
      const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
      const fromPlayer = allPlayers.find(p => Number(p.id) === fromPlayerId);
      const toPlayer = allPlayers.find(p => Number(p.id) === toPlayerId);
      
      if (fromPlayer && toPlayer) {
        const key = `${fromPlayerId}-${toPlayerId}`;
        
        if (!connections[key]) {
          connections[key] = {
            fromPlayerId,
            toPlayerId,
            fromPlayerName: fromPlayer.name || fromPlayer.player_name || `Player ${fromPlayer.jersey_number || fromPlayerId}`,
            toPlayerName: toPlayer.name || toPlayer.player_name || `Player ${toPlayer.jersey_number || toPlayerId}`,
            count: 0,
            team: team as 'home' | 'away'
          };
        }
        connections[key].count++;
      }
    });

    return Object.values(connections).sort((a, b) => b.count - a.count);
  }, [actualPassEvents, homeTeamPlayers, awayTeamPlayers]);

  // Create player summaries
  const playerSummaries = React.useMemo(() => {
    const summaries: { [key: number]: PlayerSummary } = {};
    
    passConnections.forEach(connection => {
      // Add passer
      if (!summaries[connection.fromPlayerId]) {
        summaries[connection.fromPlayerId] = {
          id: connection.fromPlayerId,
          name: connection.fromPlayerName,
          team: connection.team,
          passesGiven: 0,
          passesReceived: 0
        };
      }
      summaries[connection.fromPlayerId].passesGiven += connection.count;
      
      // Add receiver
      if (!summaries[connection.toPlayerId]) {
        summaries[connection.toPlayerId] = {
          id: connection.toPlayerId,
          name: connection.toPlayerName,
          team: connection.team,
          passesGiven: 0,
          passesReceived: 0
        };
      }
      summaries[connection.toPlayerId].passesReceived += connection.count;
    });
    
    return Object.values(summaries);
  }, [passConnections]);

  // Create matrix data for each team
  const createMatrixData = (teamConnections: PassConnection[]) => {
    const players = [...new Set([
      ...teamConnections.map(c => ({ id: c.fromPlayerId, name: c.fromPlayerName })),
      ...teamConnections.map(c => ({ id: c.toPlayerId, name: c.toPlayerName }))
    ])].sort((a, b) => a.id - b.id);

    const matrix: number[][] = [];
    const playerIndex: { [key: number]: number } = {};
    
    players.forEach((player, index) => {
      playerIndex[player.id] = index;
      matrix[index] = new Array(players.length).fill(0);
    });

    teamConnections.forEach(connection => {
      const fromIndex = playerIndex[connection.fromPlayerId];
      const toIndex = playerIndex[connection.toPlayerId];
      if (fromIndex !== undefined && toIndex !== undefined) {
        matrix[fromIndex][toIndex] = connection.count;
      }
    });

    return { players, matrix };
  };

  // Prepare D3 Sankey data
  const d3SankeyData = React.useMemo(() => {
    // Create unique nodes with proper IDs
    const nodeMap = new Map<string, { id: string; name: string; team: 'home' | 'away' }>();
    
    passConnections.forEach(connection => {
      if (!nodeMap.has(connection.fromPlayerName)) {
        nodeMap.set(connection.fromPlayerName, {
          id: connection.fromPlayerName,
          name: connection.fromPlayerName,
          team: connection.team
        });
      }
      if (!nodeMap.has(connection.toPlayerName)) {
        nodeMap.set(connection.toPlayerName, {
          id: connection.toPlayerName,
          name: connection.toPlayerName,
          team: connection.team
        });
      }
    });

    const nodes = Array.from(nodeMap.values());

    // Create links with proper source/target IDs
    const links = passConnections.map(connection => ({
      source: connection.fromPlayerName,
      target: connection.toPlayerName,
      value: connection.count
    }));

    return { nodes, links };
  }, [passConnections]);

  // Prepare Sankey data for visualization with cycle detection
  const sankeyData = React.useMemo(() => {
    // Filter out potential circular references for Sankey
    const filteredConnections = passConnections.filter((connection, index, arr) => {
      // Check if there's a reverse connection
      const reverseExists = arr.some(c => 
        c.fromPlayerId === connection.toPlayerId && 
        c.toPlayerId === connection.fromPlayerId
      );
      
      // If reverse exists, only keep the one with higher count
      if (reverseExists) {
        const reverseConnection = arr.find(c => 
          c.fromPlayerId === connection.toPlayerId && 
          c.toPlayerId === connection.fromPlayerId
        );
        return !reverseConnection || connection.count >= reverseConnection.count;
      }
      
      return true;
    });

    const uniquePlayers = [...new Set([
      ...filteredConnections.map(c => c.fromPlayerName),
      ...filteredConnections.map(c => c.toPlayerName)
    ])];

    const nodes = uniquePlayers.map(name => {
      const connection = filteredConnections.find(c => c.fromPlayerName === name || c.toPlayerName === name);
      return {
        name,
        team: connection?.team || 'home'
      };
    });

    const links = filteredConnections.map(connection => {
      const sourceIndex = uniquePlayers.indexOf(connection.fromPlayerName);
      const targetIndex = uniquePlayers.indexOf(connection.toPlayerName);
      return {
        source: sourceIndex,
        target: targetIndex,
        value: connection.count
      };
    }).filter(link => link.source !== -1 && link.target !== -1 && link.source !== link.target);

    return { nodes, links };
  }, [passConnections]);

  const homeConnections = passConnections.filter(conn => conn.team === 'home');
  const awayConnections = passConnections.filter(conn => conn.team === 'away');

  // Render connections table
  const renderConnectionsTable = (connections: PassConnection[], teamName: string, teamColor: string) => (
    <div className="space-y-4">
      <h3 className={`font-semibold text-lg ${teamColor}`}>{teamName}</h3>
      {connections.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Passer</TableHead>
              <TableHead className="text-center">→</TableHead>
              <TableHead>Receiver</TableHead>
              <TableHead className="text-center">Passes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.slice(0, 10).map((connection, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {connection.fromPlayerName}
                </TableCell>
                <TableCell className="text-center">
                  <ArrowRight className="h-4 w-4 text-gray-400 mx-auto" />
                </TableCell>
                <TableCell className="font-medium">
                  {connection.toPlayerName}
                </TableCell>
                <TableCell className="text-center">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">
                    {connection.count}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No pass connections recorded</p>
        </div>
      )}
    </div>
  );

  // Render matrix table
  const renderMatrixTable = (connections: PassConnection[], teamName: string, teamColor: string) => {
    const { players, matrix } = createMatrixData(connections);
    
    if (players.length === 0) return null;

    return (
      <div className="space-y-4">
        <h3 className={`font-semibold text-lg ${teamColor}`}>{teamName} - Matrix</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Passer \ Receiver</TableHead>
                {players.map((player) => (
                  <TableHead key={player.id} className="text-center min-w-20 text-xs">
                    {player.name.split(' ').pop()}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((fromPlayer, fromIndex) => (
                <TableRow key={fromPlayer.id}>
                  <TableCell className="font-medium text-sm">
                    {fromPlayer.name.split(' ').pop()}
                  </TableCell>
                  {players.map((toPlayer, toIndex) => (
                    <TableCell key={toPlayer.id} className="text-center">
                      {fromIndex === toIndex ? (
                        <span className="text-gray-300">-</span>
                      ) : matrix[fromIndex][toIndex] > 0 ? (
                        <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs font-semibold">
                          {matrix[fromIndex][toIndex]}
                        </span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Update visualization render function
  const renderVisualization = () => (
    <div className="space-y-6">
      {d3SankeyData.links.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Pass Flow - Advanced Sankey Diagram</h3>
          <D3SankeyChart 
            nodes={d3SankeyData.nodes}
            links={d3SankeyData.links}
            width={800}
            height={400}
          />
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            This Sankey diagram visualizes the flow of passes between players. The thickness of the lines represents the number of passes.
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Grid3X3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Not enough data for Sankey diagram</p>
        </div>
      )}
    </div>
  );
  
  if (actualPassEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Passing Matrix & Analysis</CardTitle>
          <CardDescription>No passing data available to generate analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold">No Passes Logged</h3>
            <p className="mt-1">Once passes are tracked in the match, this dashboard will come to life.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          Passing Matrix & Analysis
        </CardTitle>
        <CardDescription>
          Detailed analysis of passing connections, key players, and flow between teams.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="connections">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connections">Top Connections</TabsTrigger>
            <TabsTrigger value="matrix">Pass Matrix</TabsTrigger>
            <TabsTrigger value="summary">Player Summary</TabsTrigger>
            <TabsTrigger value="visualization">Flow Visualization</TabsTrigger>
          </TabsList>
          
          <TabsContent value="connections" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {renderConnectionsTable(homeConnections, homeTeamName, 'text-blue-800')}
              {renderConnectionsTable(awayConnections, awayTeamName, 'text-orange-800')}
            </div>
          </TabsContent>
          
          <TabsContent value="matrix" className="mt-4">
            <div className="space-y-8">
              {renderMatrixTable(homeConnections, homeTeamName, 'text-blue-800')}
              {renderMatrixTable(awayConnections, awayTeamName, 'text-orange-800')}
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="mt-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {playerSummaries.sort((a,b) => (b.passesGiven + b.passesReceived) - (a.passesGiven + a.passesReceived)).map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className={`text-sm ${player.team === 'home' ? 'text-blue-600' : 'text-orange-600'}`}>
                        {player.team === 'home' ? homeTeamName : awayTeamName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{player.passesGiven} <span className="text-xs font-normal">sent</span></p>
                      <p className="font-semibold">{player.passesReceived} <span className="text-xs font-normal">received</span></p>
                    </div>
                  </div>
                ))}
             </div>
          </TabsContent>

          <TabsContent value="visualization" className="mt-4">
            {renderVisualization()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PassMatrixTable;
