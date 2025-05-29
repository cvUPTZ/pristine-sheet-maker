
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Formation } from '@/types';

interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
}

interface Team {
  id?: string;
  name: string;
  formation: Formation;
  players: Player[];
}

interface TeamSetupWithFormationProps {
  homeTeam: Team;
  awayTeam: Team;
  onFormationChange: (teamType: 'home' | 'away', formation: Formation) => void;
  onPlayerChange: (teamType: 'home' | 'away', playerIndex: number, field: string, value: string) => void;
}

const TeamSetupWithFormation: React.FC<TeamSetupWithFormationProps> = ({
  homeTeam,
  awayTeam,
  onFormationChange,
  onPlayerChange
}) => {
  const handlePlayerNumberChange = (teamType: 'home' | 'away', playerIndex: number, value: string) => {
    const numValue = parseInt(value) || 1;
    if (numValue >= 1 && numValue <= 99) {
      onPlayerChange(teamType, playerIndex, 'number', numValue.toString());
    }
  };

  const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
  const formations: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2'];

  const renderTeamSetup = (team: Team, teamType: 'home' | 'away') => (
    <Card>
      <CardHeader>
        <CardTitle>{teamType === 'home' ? 'Home Team' : 'Away Team'}: {team.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Formation</Label>
          <Select 
            value={team.formation} 
            onValueChange={(value: Formation) => onFormationChange(teamType, value)}
          >
            <SelectTrigger>
              <SelectValue />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {team.players.map((player, index) => (
            <Card key={player.id} className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">#{player.number.toString()}</Label>
                  <Input
                    type="number"
                    value={player.number.toString()}
                    onChange={(e) => handlePlayerNumberChange(teamType, index, e.target.value)}
                    className="w-16"
                    min="1"
                    max="99"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Name</Label>
                  <Input
                    value={player.name}
                    onChange={(e) => onPlayerChange(teamType, index, 'name', e.target.value)}
                    placeholder="Player name"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Position</Label>
                  <Select 
                    value={player.position} 
                    onValueChange={(value) => onPlayerChange(teamType, index, 'position', value)}
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderTeamSetup(homeTeam, 'home')}
      {renderTeamSetup(awayTeam, 'away')}
    </div>
  );
};

export default TeamSetupWithFormation;
