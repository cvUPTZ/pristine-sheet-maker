
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowRight } from 'lucide-react';
import { MatchEvent } from '@/types/index';

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

const PassMatrixTable: React.FC<PassMatrixTableProps> = ({
  events,
  homeTeamName,
  awayTeamName,
  homeTeamPlayers,
  awayTeamPlayers
}) => {
  // Extract pass events and build connections
  const passConnections = React.useMemo(() => {
    const connections: { [key: string]: PassConnection } = {};
    
    // Filter pass events that have related player info
    const passEvents = events.filter(event => 
      event.type === 'pass' && 
      event.player_id && 
      event.relatedPlayerId
    );

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

  const homeConnections = passConnections.filter(conn => conn.team === 'home');
  const awayConnections = passConnections.filter(conn => conn.team === 'away');

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
            {connections.map((connection, index) => (
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
          <p className="text-sm">Les données de passes entre joueurs apparaîtront ici</p>
        </div>
      )}
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
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {renderConnectionsTable(homeConnections, homeTeamName, 'text-blue-600')}
        {renderConnectionsTable(awayConnections, awayTeamName, 'text-red-600')}
        
        {passConnections.length === 0 && (
          <div className="text-center py-8 text-gray-500">
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
