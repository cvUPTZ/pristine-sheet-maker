
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Trash2, Plus, Users } from 'lucide-react';
import { Team, Player, Formation } from '@/types';

interface TeamSetupWithFormationProps {
  team: Team;
  onTeamUpdate: (team: Team) => void;
  teamType: 'home' | 'away';
}

const formations: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2'];

const positions = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'
];

const TeamSetupWithFormation: React.FC<TeamSetupWithFormationProps> = ({ 
  team, 
  onTeamUpdate, 
  teamType 
}) => {
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: 'CM' });

  const updateFormation = (formation: Formation) => {
    onTeamUpdate({ ...team, formation });
  };

  const updatePlayer = (playerId: string, updates: Partial<Player>) => {
    const updatedPlayers = team.players.map(player =>
      player.id === playerId ? { ...player, ...updates } : player
    );
    onTeamUpdate({ ...team, players: updatedPlayers });
  };

  const addPlayer = () => {
    if (!newPlayer.name || !newPlayer.number || !newPlayer.position) {
      return;
    }

    // Check if jersey number already exists
    const numberExists = team.players.some(p => p.number.toString() === newPlayer.number);
    if (numberExists) {
      alert('Jersey number already exists!');
      return;
    }

    const player: Player = {
      id: `${team.id}-${Date.now()}`,
      name: newPlayer.name,
      number: parseInt(newPlayer.number),
      position: newPlayer.position,
      x: 50,
      y: 50
    };

    onTeamUpdate({ ...team, players: [...team.players, player] });
    setNewPlayer({ name: '', number: '', position: 'CM' });
  };

  const removePlayer = (playerId: string) => {
    const updatedPlayers = team.players.filter(player => player.id !== playerId);
    onTeamUpdate({ ...team, players: updatedPlayers });
  };

  const handlePlayerEdit = (playerId: string, field: string, value: string) => {
    if (field === 'number') {
      const numberValue = parseInt(value);
      if (!isNaN(numberValue)) {
        updatePlayer(playerId, { [field]: numberValue });
      }
    } else {
      updatePlayer(playerId, { [field]: value });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {teamType === 'home' ? 'Home' : 'Away'} Team Setup
          <Badge variant="outline">{team.players.length} players</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`${teamType}-formation`}>Formation</Label>
          <Select
            value={team.formation}
            onValueChange={updateFormation}
          >
            <SelectTrigger className="w-full">
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
          <Label>Add New Player</Label>
          <div className="grid grid-cols-4 gap-2">
            <Input
              placeholder="Name"
              value={newPlayer.name}
              onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
            />
            <Input
              placeholder="Number"
              type="number"
              value={newPlayer.number}
              onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
            />
            <Select
              value={newPlayer.position}
              onValueChange={(value) => setNewPlayer({ ...newPlayer, position: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addPlayer} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Players ({team.players.length})</Label>
          {team.players.length === 0 ? (
            <p className="text-sm text-muted-foreground">No players added yet</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {team.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 p-2 border rounded-lg"
                >
                  <User className="h-4 w-4" />
                  {editingPlayer === player.id ? (
                    <>
                      <Input
                        value={player.name}
                        onChange={(e) => handlePlayerEdit(player.id, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        value={player.number.toString()}
                        onChange={(e) => handlePlayerEdit(player.id, 'number', e.target.value)}
                        className="w-16"
                        type="number"
                      />
                      <Select
                        value={player.position}
                        onValueChange={(value) => handlePlayerEdit(player.id, 'position', value)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((position) => (
                            <SelectItem key={position} value={position}>
                              {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => setEditingPlayer(null)}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{player.name}</span>
                      <Badge variant="secondary">#{player.number}</Badge>
                      <Badge variant="outline">{player.position}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPlayer(player.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePlayer(player.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamSetupWithFormation;
