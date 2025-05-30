
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Team, Player } from '@/types';
import { Plus, Minus } from 'lucide-react';

interface TeamSetupProps {
  teams: { home: Team; away: Team };
  onTeamsChange: (teams: { home: Team; away: Team }) => void;
  onConfirm: () => void;
}

const defaultPlayer = (id: number): Player => ({
  id: id.toString(),
  name: `Player ${id}`,
  player_name: `Player ${id}`,
  number: id,
  jersey_number: id,
  position: 'Not Set',
});

const TeamSetup: React.FC<TeamSetupProps> = ({ teams, onTeamsChange, onConfirm }) => {
  const handleTeamNameChange = (team: 'home' | 'away', name: string) => {
    onTeamsChange({
      ...teams,
      [team]: {
        ...teams[team],
        name,
      },
    });
  };

  const handlePlayerChange = (team: 'home' | 'away', player: Player) => {
    const updatedPlayers = teams[team].players.map((p: Player) => 
      p.id === player.id ? player : p
    );

    onTeamsChange({
      ...teams,
      [team]: {
        ...teams[team],
        players: updatedPlayers,
      },
    });
  };

  const handleAddPlayer = (team: 'home' | 'away') => {
    const newId = teams[team].players.length > 0 
      ? Math.max(...teams[team].players.map((p: Player) => typeof p.id === 'string' ? parseInt(p.id) : p.id as number)) + 1 
      : 1;
      
    onTeamsChange({
      ...teams,
      [team]: {
        ...teams[team],
        players: [...teams[team].players, defaultPlayer(newId)],
      },
    });
  };

  const handleRemovePlayer = (team: 'home' | 'away', playerId: string | number) => {
    onTeamsChange({
      ...teams,
      [team]: {
        ...teams[team],
        players: teams[team].players.filter((p: Player) => p.id !== playerId),
      },
    });
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold text-center">Match Setup</h2>

      <div className="space-y-6">
        <TeamForm
          team={teams.home}
          teamType="home"
          onTeamNameChange={(name) => handleTeamNameChange('home', name)}
          onPlayerChange={(player) => handlePlayerChange('home', player)}
          onAddPlayer={() => handleAddPlayer('home')}
          onRemovePlayer={(id) => handleRemovePlayer('home', id)}
        />

        <TeamForm
          team={teams.away}
          teamType="away"
          onTeamNameChange={(name) => handleTeamNameChange('away', name)}
          onPlayerChange={(player) => handlePlayerChange('away', player)}
          onAddPlayer={() => handleAddPlayer('away')}
          onRemovePlayer={(id) => handleRemovePlayer('away', id)}
        />
      </div>

      <div className="flex justify-center mt-6">
        <Button 
          onClick={onConfirm}
          disabled={teams.home.players.length === 0 || teams.away.players.length === 0}
          className="w-full max-w-md"
        >
          Start Match
        </Button>
      </div>
    </div>
  );
};

interface TeamFormProps {
  team: Team;
  teamType: 'home' | 'away';
  onTeamNameChange: (name: string) => void;
  onPlayerChange: (player: Player) => void;
  onAddPlayer: () => void;
  onRemovePlayer: (id: string | number) => void;
}

const TeamForm: React.FC<TeamFormProps> = ({
  team,
  teamType,
  onTeamNameChange,
  onPlayerChange,
  onAddPlayer,
  onRemovePlayer,
}) => {
  return (
    <Card className={`border-l-4 ${teamType === 'home' ? 'border-l-football-home' : 'border-l-football-away'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Input
            value={team.name}
            onChange={(e) => onTeamNameChange(e.target.value)}
            placeholder={teamType === 'home' ? 'Home Team' : 'Away Team'}
            className="font-bold"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {team.players.map((player: Player) => (
            <div key={player.id} className="flex items-center space-x-2">
              <Input
                type="number"
                value={player.number}
                onChange={(e) => onPlayerChange({ ...player, number: parseInt(e.target.value) || 0 })}
                placeholder="№"
                className="w-16"
              />
              <Input
                value={player.name}
                onChange={(e) => onPlayerChange({ ...player, name: e.target.value })}
                placeholder="Name"
                className="flex-grow"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemovePlayer(player.id)}
                className="h-8 w-8"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={onAddPlayer}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamSetup;
