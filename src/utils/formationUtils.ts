
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

// Get player positions based on team and formation
export const getPlayerPositions = (team: Team, isHomeTeam: boolean) => {
  const positions: Record<number, { x: number; y: number }> = {};
  
  // Default to 4-4-2 if no formation is specified
  const formation = team.formation || '4-4-2';
  const basePositions = [...formationPositions[formation]];
  
  // For away team, flip the y coordinates
  if (!isHomeTeam) {
    basePositions.forEach(pos => {
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
