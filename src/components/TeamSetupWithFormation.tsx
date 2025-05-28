
import React, { useState, useEffect, useCallback } from 'react';
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
    const updatedTeams = { home: teams.home, away: teams.away }; // Create a mutable copy structure
    
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
      onTeamsChange(updatedTeams as { home: Team; away: Team });
    }
  }, [teams, onTeamsChange]); // Added teams and onTeamsChange to dependencies

  const updateTeamName = useCallback((teamId: 'home' | 'away', name: string) => {
    if (!teams[teamId]) return;
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...teams[teamId]!,
        name
      }
    } as { home: Team, away: Team });
  }, [teams, onTeamsChange]);
  
  const updateTeamFormation = useCallback((teamId: 'home' | 'away', formation: Formation) => {
    const currentTeam = teams[teamId];
    if (!currentTeam) return;
    
    // Generate new players based on the formation
    const startId = teamId === 'home' ? 1 : 100;
    const newPlayers = generatePlayersForFormation(teamId, formation, startId);
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...currentTeam,
        formation,
        players: newPlayers
      }
    } as { home: Team, away: Team });
    
    toast.success(`${teamId === 'home' ? 'Home' : 'Away'} team formation updated to ${formation} with new players`);
  }, [teams, onTeamsChange]); // Added teams and onTeamsChange
  
  const addPlayer = useCallback((teamId: 'home' | 'away') => {
    const currentTeam = teams[teamId];
    if (!currentTeam) return;
    const playerId = teamId === 'home' ? 
      Math.max(...(currentTeam.players?.map((p: Player): number => p.id) || [0]), 0) + 1 : 
      Math.max(...(currentTeam.players?.map((p: Player): number => p.id) || [100]), 100) + 1;
      
    const newPlayer: Player = {
      id: playerId,
      name: `Player ${(currentTeam.players?.length || 0) + 1}`,
      number: (currentTeam.players?.length || 0) + 1, // Default number
      position: 'Substitute', // Default position
      teamId: teamId, 
    };
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...currentTeam,
        players: [...(currentTeam.players || []), newPlayer]
      }
    } as { home: Team, away: Team });
  }, [teams, onTeamsChange]); // Added teams and onTeamsChange
  
  const updatePlayer = useCallback((teamId: 'home' | 'away', playerId: number, updates: Partial<Player>) => {
    const currentTeam = teams[teamId];
    if (!currentTeam) return;
    
    const updatedPlayers = (currentTeam.players || []).map((player: Player): Player => // Ensure map returns Player
      player.id === playerId ? { ...player, ...updates } : player
    );
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...currentTeam,
        players: updatedPlayers
      }
    } as { home: Team, away: Team });
  }, [teams, onTeamsChange]); // Added teams and onTeamsChange
  
  const removePlayer = useCallback((teamId: 'home' | 'away', playerId: number) => {
    const currentTeam = teams[teamId];
    if (!currentTeam) return;
    const updatedPlayers = (currentTeam.players || []).filter((player: Player): boolean => player.id !== playerId);
    
    onTeamsChange({
      ...teams,
      [teamId]: {
        ...currentTeam,
        players: updatedPlayers
      }
    } as { home: Team, away: Team });
  }, [teams, onTeamsChange]); // Added teams and onTeamsChange
  
  // Initialize teams with default players if they have a formation but no players
  useEffect(() => {
    if (teams.home?.formation && (!teams.home.players || teams.home.players.length === 0)) {
      updateTeamFormation('home', teams.home.formation as Formation);
    }
    
    if (teams.away?.formation && (!teams.away.players || teams.away.players.length === 0)) {
      updateTeamFormation('away', teams.away.formation as Formation);
    }
  // Using teams directly as a dep might be too broad if only specific sub-properties are meant to trigger this.
  // However, to satisfy exhaustive-deps given the direct usage of teams.home/away and their properties,
  // and the call to updateTeamFormation (which itself depends on onTeamsChange and teams),
  // this is the most straightforward way to list direct dependencies.
  // A more refined approach might involve memoizing parts of `teams` if this effect runs too often.
  }, [teams, updateTeamFormation]);
  
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
                  value={teams.home?.name ?? ''}
                  onChange={(e) => updateTeamName('home', e.target.value)}
                  className="mb-2"
                />
              </div>
              <div>
                <FormationSelector
                  label="Formation"
                  value={((teams.home?.formation && teams.home?.formation.trim() !== '') ? teams.home.formation : '4-4-2') as Formation}
                  onChange={(value) => updateTeamFormation('home', value as Formation)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Players</h3>
                <Button onClick={() => addPlayer('home')} size="sm">Add Player</Button>
              </div>
              
              {(!teams.home?.players || teams.home.players.length === 0) ? (
                <div className="text-center py-8 border rounded-md">
                  <p className="text-muted-foreground mb-4">No players added yet</p>
                  <Button onClick={() => updateTeamFormation('home', (teams.home?.formation ?? '4-4-2') as Formation)}>
                    Generate Players for {teams.home?.formation ?? '4-4-2'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.home.players.map((player: Player) => ( 
                    <div key={player.id} className="grid grid-cols-12 gap-2 items-center border p-2 rounded-md">
                      <div className="col-span-2">
                        <Input 
                          type="number" 
                          value={player.number ?? ''} 
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
                          value={player.position ?? ''} 
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
                  value={teams.away?.name ?? ''}
                  onChange={(e) => updateTeamName('away', e.target.value)}
                  className="mb-2"
                />
              </div>
              <div>
                <FormationSelector
                  label="Formation"
                  value={((teams.away?.formation && teams.away?.formation.trim() !== '') ? teams.away.formation : '4-3-3') as Formation}
                  onChange={(value) => updateTeamFormation('away', value as Formation)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Players</h3>
                <Button onClick={() => addPlayer('away')} size="sm">Add Player</Button>
              </div>
              
              {(!teams.away?.players || teams.away.players.length === 0) ? (
                <div className="text-center py-8 border rounded-md">
                  <p className="text-muted-foreground mb-4">No players added yet</p>
                  <Button onClick={() => updateTeamFormation('away', (teams.away?.formation ?? '4-3-3') as Formation)}>
                    Generate Players for {teams.away?.formation ?? '4-3-3'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.away.players.map((player: Player) => ( 
                    <div key={player.id} className="grid grid-cols-12 gap-2 items-center border p-2 rounded-md">
                      <div className="col-span-2">
                        <Input 
                          type="number" 
                          value={player.number ?? ''} 
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
                          value={player.position ?? ''} 
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
