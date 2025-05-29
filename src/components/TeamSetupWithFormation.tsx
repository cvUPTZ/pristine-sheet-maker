
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Users } from 'lucide-react';
import { Team, Player } from '@/types';
import { Formation, formations, generatePlayersForFormation } from '@/utils/formationUtils';

interface TeamSetupWithFormationProps {
  team: Team;
  onTeamUpdate: (team: Team) => void;
  teamType: 'home' | 'away';
}

const TeamSetupWithFormation: React.FC<TeamSetupWithFormationProps> = ({
  team,
  onTeamUpdate,
  teamType
}) => {
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleFormationChange = (formation: Formation) => {
    const newPlayers = generatePlayersForFormation(formation, team.name);
    onTeamUpdate({
      ...team,
      formation,
      players: newPlayers
    });
  };

  const handlePlayerNameChange = (playerId: string, newName: string) => {
    const updatedPlayers = team.players.map(player =>
      player.id === playerId ? { ...player, name: newName } : player
    );
    onTeamUpdate({ ...team, players: updatedPlayers });
    setEditingPlayer(null);
  };

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      const newPlayer: Player = {
        id: `player-${Date.now()}`,
        name: newPlayerName.trim(),
        position: 'Outfield',
        number: team.players.length + 1
      };
      onTeamUpdate({
        ...team,
        players: [...team.players, newPlayer]
      });
      setNewPlayerName('');
    }
  };

  const removePlayer = (playerId: string) => {
    const updatedPlayers = team.players.filter(player => player.id !== playerId);
    onTeamUpdate({ ...team, players: updatedPlayers });
  };

  return (
    <Card className={`${teamType === 'home' ? 'border-green-200' : 'border-blue-200'}`}>
      <CardHeader className={`${teamType === 'home' ? 'bg-green-50' : 'bg-blue-50'}`}>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {team.name} ({teamType === 'home' ? 'Home' : 'Away'})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`formation-${teamType}`}>Formation</Label>
          <Select value={team.formation} onValueChange={handleFormationChange}>
            <SelectTrigger id={`formation-${teamType}`}>
              <SelectValue placeholder="Select formation" />
            </SelectTrigger>
            <SelectContent>
              {formations.map((formation) => (
                <SelectItem key={formation} value={formation}>
                  {formation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Players ({team.players.length})</Label>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {team.players.map((player) => (
              <div key={player.id} className="flex items-center gap-2 p-2 border rounded">
                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                  {player.number}
                </Badge>
                {editingPlayer === player.id ? (
                  <Input
                    value={player.name}
                    onChange={(e) => handlePlayerNameChange(player.id, e.target.value)}
                    onBlur={() => setEditingPlayer(null)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        setEditingPlayer(null);
                      }
                    }}
                    className="flex-1"
                    autoFocus
                  />
                ) : (
                  <span
                    className="flex-1 cursor-pointer hover:text-blue-600"
                    onClick={() => setEditingPlayer(player.id)}
                  >
                    {player.name}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePlayer(player.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add new player..."
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addPlayer();
              }
            }}
          />
          <Button onClick={addPlayer} disabled={!newPlayerName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamSetupWithFormation;
