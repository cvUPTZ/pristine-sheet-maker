
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Formation, Team } from '@/types';

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
  const handlePlayerNumberChange = (playerIndex: number, value: string) => {
    const numValue = parseInt(value) || 1;
    if (numValue >= 1 && numValue <= 99) {
      const updatedPlayers = team.players.map((player, index) =>
        index === playerIndex ? { ...player, number: numValue } : player
      );
      onTeamUpdate({ ...team, players: updatedPlayers });
    }
  };

  const handlePlayerChange = (playerIndex: number, field: string, value: string) => {
    const updatedPlayers = team.players.map((player, index) =>
      index === playerIndex ? { ...player, [field]: value } : player
    );
    onTeamUpdate({ ...team, players: updatedPlayers });
  };

  const handleFormationChange = (formation: Formation) => {
    onTeamUpdate({ ...team, formation });
  };

  const handleTeamNameChange = (name: string) => {
    onTeamUpdate({ ...team, name });
  };

  const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
  const formations: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2'];

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {teamType === 'home' ? 'Home Team' : 'Away Team'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Team Name</Label>
          <Input
            value={team.name}
            onChange={(e) => handleTeamNameChange(e.target.value)}
            placeholder={`Enter ${teamType} team name`}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Formation</Label>
          <Select value={team.formation} onValueChange={handleFormationChange}>
            <SelectTrigger className="mt-1">
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

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="players">
            <AccordionTrigger className="text-sm font-medium">
              Players ({team.players.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                {team.players.map((player, index) => (
                  <Card key={player.id} className="p-3">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <Label className="text-xs">Number</Label>
                        <Input
                          type="number"
                          value={player.number?.toString() || ''}
                          onChange={(e) => handlePlayerNumberChange(index, e.target.value)}
                          className="h-8 text-sm"
                          min="1"
                          max="99"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={player.name}
                          onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                          placeholder="Player name"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Position</Label>
                        <Select 
                          value={player.position} 
                          onValueChange={(value) => handlePlayerChange(index, 'position', value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default TeamSetupWithFormation;
