import { Formation, FormationPositions, Player, Team } from '@/types';

// Define formation positions (normalized to field coordinates 0-1)
export const formationPositions: FormationPositions = {
  '4-4-2': [
    { x: 0.5, y: 0.9 },  // GK
    { x: 0.2, y: 0.7 },  // LB
    { x: 0.4, y: 0.7 },  // CB
    { x: 0.6, y: 0.7 },  // CB
    { x: 0.8, y: 0.7 },  // RB
    { x: 0.2, y: 0.5 },  // LM
    { x: 0.4, y: 0.5 },  // CM
    { x: 0.6, y: 0.5 },  // CM
    { x: 0.8, y: 0.5 },  // RM
    { x: 0.4, y: 0.3 },  // ST
    { x: 0.6, y: 0.3 },  // ST
  ],
  '4-3-3': [
    { x: 0.5, y: 0.9 },  // GK
    { x: 0.2, y: 0.7 },  // LB
    { x: 0.4, y: 0.7 },  // CB
    { x: 0.6, y: 0.7 },  // CB
    { x: 0.8, y: 0.7 },  // RB
    { x: 0.3, y: 0.5 },  // CM
    { x: 0.5, y: 0.5 },  // CM
    { x: 0.7, y: 0.5 },  // CM
    { x: 0.2, y: 0.3 },  // LW
    { x: 0.5, y: 0.3 },  // ST
    { x: 0.8, y: 0.3 },  // RW
  ],
  '3-5-2': [
    { x: 0.5, y: 0.9 },  // GK
    { x: 0.3, y: 0.7 },  // CB
    { x: 0.5, y: 0.7 },  // CB
    { x: 0.7, y: 0.7 },  // CB
    { x: 0.1, y: 0.5 },  // LWB
    { x: 0.3, y: 0.5 },  // CM
    { x: 0.5, y: 0.5 },  // CM
    { x: 0.7, y: 0.5 },  // CM
    { x: 0.9, y: 0.5 },  // RWB
    { x: 0.4, y: 0.3 },  // ST
    { x: 0.6, y: 0.3 },  // ST
  ],
  '5-3-2': [
    { x: 0.5, y: 0.9 },  // GK
    { x: 0.1, y: 0.7 },  // LWB
    { x: 0.3, y: 0.7 },  // CB
    { x: 0.5, y: 0.7 },  // CB
    { x: 0.7, y: 0.7 },  // CB
    { x: 0.9, y: 0.7 },  // RWB
    { x: 0.3, y: 0.5 },  // CM
    { x: 0.5, y: 0.5 },  // CM
    { x: 0.7, y: 0.5 },  // CM
    { x: 0.4, y: 0.3 },  // ST
    { x: 0.6, y: 0.3 },  // ST
  ],
  '4-2-3-1': [
    { x: 0.5, y: 0.9 },  // GK
    { x: 0.2, y: 0.7 },  // LB
    { x: 0.4, y: 0.7 },  // CB
    { x: 0.6, y: 0.7 },  // CB
    { x: 0.8, y: 0.7 },  // RB
    { x: 0.4, y: 0.55 }, // CDM
    { x: 0.6, y: 0.55 }, // CDM
    { x: 0.3, y: 0.4 },  // CAM
    { x: 0.5, y: 0.4 },  // CAM
    { x: 0.7, y: 0.4 },  // CAM
    { x: 0.5, y: 0.25 }, // ST
  ],
  '3-4-3': [
    { x: 0.5, y: 0.9 },  // GK
    { x: 0.3, y: 0.7 },  // CB
    { x: 0.5, y: 0.7 },  // CB
    { x: 0.7, y: 0.7 },  // CB
    { x: 0.2, y: 0.5 },  // LM
    { x: 0.4, y: 0.5 },  // CM
    { x: 0.6, y: 0.5 },  // CM
    { x: 0.8, y: 0.5 },  // RM
    { x: 0.3, y: 0.3 },  // LW
    { x: 0.5, y: 0.3 },  // ST
    { x: 0.7, y: 0.3 },  // RW
  ]
};

// Updated function to better handle null or undefined teams
export const getPlayerPositions = (team: Partial<Team> & { players?: Player[], formation?: string } | null, isHomeTeam: boolean) => {
  // Return empty object if team is null or undefined
  if (!team || !team.players) {
    return {};
  }
  
  const positions: Record<number, { x: number; y: number }> = {};
  
  // Default to 4-4-2 if no formation is specified
  const formation = team.formation || '4-4-2';
  
  // Create a deep copy of the formation positions to avoid mutations
  const basePositions = JSON.parse(JSON.stringify(formationPositions[formation as Formation]));
  
  // For away team, flip the y coordinates
  if (!isHomeTeam) {
    basePositions.forEach((pos: {x: number, y: number}) => {
      pos.y = 1 - pos.y;
    });
  }
  
  team.players.forEach((player: Player, index: number) => {
    // Make sure we don't exceed the available positions in the formation
    positions[player.id] = index < basePositions.length 
      ? { ...basePositions[index] } // Use spread to create a new object, preventing mutation
      : { x: Math.random(), y: isHomeTeam ? 0.7 : 0.3 }; // Position extras in a reasonable place
  });
  
  return positions;
};

// Create simulated teams for testing with real position names
export const createSimulatedTeams = () => {
  // Create home team with 4-4-2 formation
  const homeTeam: Team = {
    id: "home-team",
    name: "Home FC",
    formation: "4-4-2",
    players: Array.from({ length: 11 }, (_, i) => ({
      id: i + 1,
      name: `Home Player ${i + 1}`,
      number: i + 1,
      position: getPositionName("4-4-2", i)
    }))
  };
  
  // Create away team with 4-3-3 formation
  const awayTeam: Team = {
    id: "away-team",
    name: "Away United",
    formation: "4-3-3",
    players: Array.from({ length: 11 }, (_, i) => ({
      id: 100 + i + 1,
      name: `Away Player ${i + 1}`,
      number: i + 1,
      position: getPositionName("4-3-3", i)
    }))
  };
  
  return { homeTeam, awayTeam };
};

// Helper function to get position name based on formation and index
export function getPositionName(formation: string, index: number): string {
  if (index === 0) return 'Goalkeeper';
  
  // Full position names instead of abbreviations
  if (formation === '4-4-2') {
    const positions = ['Goalkeeper', 'Left Back', 'Center Back', 'Center Back', 'Right Back', 
                       'Left Midfielder', 'Center Midfielder', 'Center Midfielder', 'Right Midfielder', 
                       'Striker', 'Striker'];
    return positions[index] || 'Substitute';
  } else if (formation === '4-3-3') {
    const positions = ['Goalkeeper', 'Left Back', 'Center Back', 'Center Back', 'Right Back', 
                       'Center Midfielder', 'Center Midfielder', 'Center Midfielder', 
                       'Left Winger', 'Striker', 'Right Winger'];
    return positions[index] || 'Substitute';
  } else if (formation === '3-5-2') {
    const positions = ['Goalkeeper', 'Center Back', 'Center Back', 'Center Back', 
                       'Left Wing Back', 'Center Midfielder', 'Center Midfielder', 'Center Midfielder', 'Right Wing Back', 
                       'Striker', 'Striker'];
    return positions[index] || 'Substitute';
  } else if (formation === '5-3-2') {
    const positions = ['Goalkeeper', 'Left Wing Back', 'Center Back', 'Center Back', 'Center Back', 'Right Wing Back', 
                       'Center Midfielder', 'Center Midfielder', 'Center Midfielder', 'Striker', 'Striker'];
    return positions[index] || 'Substitute';
  } else if (formation === '4-2-3-1') {
    const positions = ['Goalkeeper', 'Left Back', 'Center Back', 'Center Back', 'Right Back', 
                       'Defensive Midfielder', 'Defensive Midfielder', 
                       'Attacking Midfielder', 'Attacking Midfielder', 'Attacking Midfielder', 'Striker'];
    return positions[index] || 'Substitute';
  } else if (formation === '3-4-3') {
    const positions = ['Goalkeeper', 'Center Back', 'Center Back', 'Center Back', 
                       'Left Midfielder', 'Center Midfielder', 'Center Midfielder', 'Right Midfielder', 
                       'Left Winger', 'Striker', 'Right Winger'];
    return positions[index] || 'Substitute';
  } else {
    const positions = ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Defender', 
                       'Midfielder', 'Midfielder', 'Midfielder', 'Midfielder', 
                       'Forward', 'Forward'];
    return positions[index] || 'Substitute';
  }
}

// Function to generate players based on a specific formation
export const generatePlayersForFormation = (teamId: string, formation: Formation, startId: number = 1): Player[] => {
  return Array.from({ length: 11 }, (_, i) => ({
    id: startId + i,
    name: `${teamId === 'home' ? 'Home' : 'Away'} Player ${i + 1}`,
    number: i + 1,
    position: getPositionName(formation, i)
  }));
};
