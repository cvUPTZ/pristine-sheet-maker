
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team, Player, Formation } from '@/types';
import FormationSelector from './FormationSelector';
import { generatePlayersForFormation } from '@/utils/formationUtils';
import { toast } from 'sonner';

interface TeamSetupWithFormationProps {
  teams: { home: Team | null; away: Team | null };
  onTeamsChange: (teams: { home: Team; away: Team }) => void;
  onConfirm: () => void;
}

const TeamSetupWithFormation: React.FC<TeamSetupWithFormationProps> = ({ teams, onTeamsChange, onConfirm }) => {
  const [activeTab, setActiveTab] = useState<string>("home");
  
  // Initialize default teams if null
  useEffect(() => {
    let needsUpdate = false;
    const updatedTeams = { ...teams };
    
    if (!updatedTeams.home) {
      updatedTeams.home = {
        id: 'home-team',
        name: 'Home Team',
        players: [],
        formation: '4-4-2'
      };
      needsUpdate = true;
    }
    
    if (!updatedTeams.away) {
      updatedTeams.away = {
        id: 'away-team',
        name: 'Away Team',
        players: [],
        formation: '4-3-3'
      };
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      onTeamsChange(updatedTeams as { home: Team, away: Team });
    }
  }, []);
  
  const updateTeamName = (teamId: 'home' | 'away', name: string) => {
    if (!teams[teamId]) return;
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...teams[teamId]!,
        name
      }
    } as { home: Team, away: Team });
  };
  
  const updateTeamFormation = (teamId: 'home' | 'away', formation: Formation) => {
    if (!teams[teamId]) return;
    
    const team = teams[teamId]!;
    
    // Generate new players based on the formation
    const startId = teamId === 'home' ? 1 : 100;
    const newPlayers = generatePlayersForFormation(formation, startId.toString());
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...team,
        formation,
        players: newPlayers
      }
    } as { home: Team, away: Team });
    
    toast.success(`${teamId === 'home' ? 'Home' : 'Away'} team formation updated to ${formation} with new players`);
  };
  
  const addPlayer = (teamId: 'home' | 'away') => {
    if (!teams[teamId]) return;
    
    const team = teams[teamId]!;
    const playerId = teamId === 'home' ? 
      Math.max(...team.players.map(p => Number(p.id)), 0) + 1 : 
      Math.max(...team.players.map(p => Number(p.id)), 100) + 1;
      
    const newPlayer: Player = {
      id: playerId,
      name: `Player ${team.players.length + 1}`,
      number: team.players.length + 1,
      position: 'Substitute'
    };
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...team,
        players: [...team.players, newPlayer]
      }
    } as { home: Team, away: Team });
  };
  
  const updatePlayer = (teamId: 'home' | 'away', playerId: string | number, updates: Partial<Player>) => {
    if (!teams[teamId]) return;
    
    const team = teams[teamId]!;
    const updatedPlayers = team.players.map(player => 
      player.id === playerId ? { ...player, ...updates } : player
    );
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...team,
        players: updatedPlayers
      }
    } as { home: Team, away: Team });
  };
  
  const removePlayer = (teamId: 'home' | 'away', playerId: string | number) => {
    if (!teams[teamId]) return;
    
    const team = teams[teamId]!;
    const updatedPlayers = team.players.filter(player => player.id !== playerId);
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...team,
        players: updatedPlayers
      }
    } as { home: Team, away: Team });
  };
  
  // Initialize teams with default players if they have a formation but no players
  useEffect(() => {
    if (teams.home?.formation && teams.home.players.length === 0) {
      updateTeamFormation('home', teams.home.formation as Formation);
    }
    
    if (teams.away?.formation && teams.away.players.length === 0) {
      updateTeamFormation('away', teams.away.formation as Formation);
    }
  }, [teams.home?.formation, teams.away?.formation]);
  
  // Render nothing if teams are not initialized yet
  if (!teams.home || !teams.away) {
    return <div className="p-6 text-center">Loading teams...</div>;
  }
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Team Setup</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="home">Home Team</TabsTrigger>
          <TabsTrigger value="away">Away Team</TabsTrigger>
        </TabsList>
        
        <TabsContent value="home">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="homeTeamName">Team Name</Label>
                <Input 
                  id="homeTeamName"
                  value={teams.home.name}
                  onChange={(e) => updateTeamName('home', e.target.value)}
                  className="mb-2"
                />
              </div>
              <div>
                <FormationSelector
                  label="Formation"
                  value={(teams.home.formation && teams.home.formation.trim() !== '') ? teams.home.formation as Formation : '4-4-2'}
                  onChange={(value) => updateTeamFormation('home', value)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Players</h3>
                <Button onClick={() => addPlayer('home')} size="sm">Add Player</Button>
              </div>
              
              {teams.home && teams.home.players.length === 0 ? (
                <div className="text-center py-8 border rounded-md">
                  <p className="text-muted-foreground mb-4">No players added yet</p>
                  <Button onClick={() => updateTeamFormation('home', teams.home!.formation as Formation || '4-4-2')}>
                    Generate Players for {teams.home.formation || '4-4-2'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.home.players.map((player) => (
                    <div key={player.id} className="grid grid-cols-12 gap-2 items-center border p-2 rounded-md">
                      <div className="col-span-2">
                        <Input 
                          type="number" 
                          value={player.number}
                          onChange={(e) => updatePlayer('home', player.id, { number: parseInt(e.target.value) })}
                          placeholder="#"
                          min="1"
                          max="99"
                        />
                      </div>
                      <div className="col-span-4">
                        <Input 
                          value={player.name}
                          onChange={(e) => updatePlayer('home', player.id, { name: e.target.value })}
                          placeholder="Name"
                        />
                      </div>
                      <div className="col-span-4">
                        <Input 
                          value={player.position}
                          onChange={(e) => updatePlayer('home', player.id, { position: e.target.value })}
                          placeholder="Position"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removePlayer('home', player.id)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="away">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="awayTeamName">Team Name</Label>
                <Input 
                  id="awayTeamName"
                  value={teams.away.name}
                  onChange={(e) => updateTeamName('away', e.target.value)}
                  className="mb-2"
                />
              </div>
              <div>
                <FormationSelector
                  label="Formation"
                  value={(teams.away.formation && teams.away.formation.trim() !== '') ? teams.away.formation as Formation : '4-3-3'}
                  onChange={(value) => updateTeamFormation('away', value)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Players</h3>
                <Button onClick={() => addPlayer('away')} size="sm">Add Player</Button>
              </div>
              
              {teams.away && teams.away.players.length === 0 ? (
                <div className="text-center py-8 border rounded-md">
                  <p className="text-muted-foreground mb-4">No players added yet</p>
                  <Button onClick={() => updateTeamFormation('away', teams.away!.formation as Formation || '4-3-3')}>
                    Generate Players for {teams.away.formation || '4-3-3'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.away.players.map((player) => (
                    <div key={player.id} className="grid grid-cols-12 gap-2 items-center border p-2 rounded-md">
                      <div className="col-span-2">
                        <Input 
                          type="number" 
                          value={player.number}
                          onChange={(e) => updatePlayer('away', player.id, { number: parseInt(e.target.value) })}
                          placeholder="#"
                          min="1"
                          max="99"
                        />
                      </div>
                      <div className="col-span-4">
                        <Input 
                          value={player.name}
                          onChange={(e) => updatePlayer('away', player.id, { name: e.target.value })}
                          placeholder="Name"
                        />
                      </div>
                      <div className="col-span-4">
                        <Input 
                          value={player.position}
                          onChange={(e) => updatePlayer('away', player.id, { position: e.target.value })}
                          placeholder="Position"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removePlayer('away', player.id)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end mt-8">
        <Button onClick={onConfirm}>
          Confirm & Start Match
        </Button>
      </div>
    </div>
  );
};

export default TeamSetupWithFormation;
