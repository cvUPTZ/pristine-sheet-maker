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
  // Mock data for demonstration - structured to avoid circular references
  const getMockPassConnections = (): PassConnection[] => {
    return [
      // Home team connections - linear flow to avoid cycles
      { fromPlayerId: 5, toPlayerId: 4, fromPlayerName: "Piqué", toPlayerName: "Busquets", count: 9, team: 'home' },
      { fromPlayerId: 4, toPlayerId: 1, fromPlayerName: "Busquets", toPlayerName: "Messi", count: 18, team: 'home' },
      { fromPlayerId: 1, toPlayerId: 2, fromPlayerName: "Messi", toPlayerName: "Suárez", count: 12, team: 'home' },
      { fromPlayerId: 1, toPlayerId: 3, fromPlayerName: "Messi", toPlayerName: "Neymar", count: 15, team: 'home' },
      { fromPlayerId: 2, toPlayerId: 3, fromPlayerName: "Suárez", toPlayerName: "Neymar", count: 8, team: 'home' },
      { fromPlayerId: 6, toPlayerId: 1, fromPlayerName: "Alba", toPlayerName: "Messi", count: 11, team: 'home' },
      { fromPlayerId: 3, toPlayerId: 7, fromPlayerName: "Neymar", toPlayerName: "Pedro", count: 7, team: 'home' },
      
      // Away team connections - linear flow to avoid cycles
      { fromPlayerId: 16, toPlayerId: 15, fromPlayerName: "Ramos", toPlayerName: "Kroos", count: 8, team: 'away' },
      { fromPlayerId: 15, toPlayerId: 14, fromPlayerName: "Kroos", toPlayerName: "Modrić", count: 13, team: 'away' },
      { fromPlayerId: 14, toPlayerId: 11, fromPlayerName: "Modrić", toPlayerName: "Ronaldo", count: 14, team: 'away' },
      { fromPlayerId: 11, toPlayerId: 12, fromPlayerName: "Ronaldo", toPlayerName: "Benzema", count: 10, team: 'away' },
      { fromPlayerId: 11, toPlayerId: 13, fromPlayerName: "Ronaldo", toPlayerName: "Bale", count: 5, team: 'away' },
      { fromPlayerId: 12, toPlayerId: 13, fromPlayerName: "Benzema", toPlayerName: "Bale", count: 6, team: 'away' },
      { fromPlayerId: 17, toPlayerId: 14, fromPlayerName: "Marcelo", toPlayerName: "Modrić", count: 7, team: 'away' },
    ];
  };

  // Extract pass events and build connections
  const passConnections = React.useMemo(() => {
    const connections: { [key: string]: PassConnection } = {};
    
    // Filter pass events that have related player info
    const passEvents = events.filter(event => 
      event.type === 'pass' && 
      event.player_id && 
      event.relatedPlayerId
    );

    if (passEvents.length === 0) {
      // Return mock data if no real pass events
      return getMockPassConnections().sort((a, b) => b.count - a.count);
    }

    passEvents.forEach(passEvent => {
      const fromPlayerId = Number(passEvent.player_id);
      const toPlayerId = Number(passEvent.relatedPlayerId);
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
  }, [events, homeTeamPlayers, awayTeamPlayers]);

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
              <TableHead>Passeur</TableHead>
              <TableHead className="text-center">→</TableHead>
              <TableHead>Receveur</TableHead>
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
          <p>Aucune connexion de passe enregistrée</p>
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
        <h3 className={`font-semibold text-lg ${teamColor}`}>{teamName} - Matrice</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Passeur \ Receveur</TableHead>
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
          <h3 className="font-semibold text-lg">Flux de Passes - Diagramme Sankey Avancé</h3>
          <D3SankeyChart 
            nodes={d3SankeyData.nodes}
            links={d3SankeyData.links}
            width={800}
            height={400}
          />
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p><strong>Comment lire ce diagramme :</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Les rectangles représentent les joueurs (bleu = domicile, rouge = extérieur)</li>
              <li>Les flux représentent les passes entre joueurs</li>
              <li>Plus le flux est épais, plus il y a de passes</li>
              <li>Survolez les éléments pour plus de détails</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Impossible de générer le diagramme Sankey</p>
          <p className="text-sm">Aucune donnée de passe disponible</p>
        </div>
      )}
      
      {/* Player Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-blue-600 mb-3">{homeTeamName} - Résumé</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead className="text-center">Passes Données</TableHead>
                <TableHead className="text-center">Passes Reçues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playerSummaries.filter(p => p.team === 'home').map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="text-center">{player.passesGiven}</TableCell>
                  <TableCell className="text-center">{player.passesReceived}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div>
          <h4 className="font-semibold text-red-600 mb-3">{awayTeamName} - Résumé</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead className="text-center">Passes Données</TableHead>
                <TableHead className="text-center">Passes Reçues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playerSummaries.filter(p => p.team === 'away').map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="text-center">{player.passesGiven}</TableCell>
                  <TableCell className="text-center">{player.passesReceived}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Qui Passe à Qui
        </CardTitle>
        <CardDescription>
          Matrice des passes entre joueurs - Analyse des connexions d'équipe
          {events.filter(e => e.type === 'pass').length === 0 && (
            <span className="block text-orange-600 text-sm mt-1">
              📊 Données de démonstration affichées
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Connexions
            </TabsTrigger>
            <TabsTrigger value="matrix" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Matrice
            </TabsTrigger>
            <TabsTrigger value="visualization" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visualisation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-8 mt-6">
            {renderConnectionsTable(homeConnections, homeTeamName, 'text-blue-600')}
            {renderConnectionsTable(awayConnections, awayTeamName, 'text-red-600')}
          </TabsContent>

          <TabsContent value="matrix" className="space-y-8 mt-6">
            {renderMatrixTable(homeConnections, homeTeamName, 'text-blue-600')}
            {renderMatrixTable(awayConnections, awayTeamName, 'text-red-600')}
          </TabsContent>

          <TabsContent value="visualization" className="mt-6">
            {renderVisualization()}
          </TabsContent>
        </Tabs>
        
        {passConnections.length === 0 && (
          <div className="text-center py-8 text-gray-500 mt-6">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune donnée de passe disponible</p>
            <p className="text-sm">Utilisez le mode de suivi des passes pour enregistrer les connexions entre joueurs</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PassMatrixTable;
