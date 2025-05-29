import { Player, Team, Formation, FormationPositions } from '@/types';

const FORMATION_POSITIONS: Record<Formation, FormationPositions> = {
  '4-4-2': {
    // Goalkeeper
    '1': { x: 0.5, y: 0.95 },
    // Defenders
    '2': { x: 0.8, y: 0.75 },
    '3': { x: 0.6, y: 0.75 },
    '4': { x: 0.4, y: 0.75 },
    '5': { x: 0.2, y: 0.75 },
    // Midfielders
    '6': { x: 0.8, y: 0.45 },
    '7': { x: 0.6, y: 0.45 },
    '8': { x: 0.4, y: 0.45 },
    '9': { x: 0.2, y: 0.45 },
    // Forwards
    '10': { x: 0.6, y: 0.15 },
    '11': { x: 0.4, y: 0.15 },
  },
  '4-3-3': {
    // Goalkeeper
    '1': { x: 0.5, y: 0.95 },
    // Defenders
    '2': { x: 0.8, y: 0.75 },
    '3': { x: 0.6, y: 0.75 },
    '4': { x: 0.4, y: 0.75 },
    '5': { x: 0.2, y: 0.75 },
    // Midfielders
    '6': { x: 0.65, y: 0.5 },
    '7': { x: 0.5, y: 0.5 },
    '8': { x: 0.35, y: 0.5 },
    // Forwards
    '9': { x: 0.75, y: 0.15 },
    '10': { x: 0.5, y: 0.15 },
    '11': { x: 0.25, y: 0.15 },
  },
  '3-5-2': {
    // Goalkeeper
    '1': { x: 0.5, y: 0.95 },
    // Defenders
    '2': { x: 0.7, y: 0.75 },
    '3': { x: 0.5, y: 0.75 },
    '4': { x: 0.3, y: 0.75 },
    // Midfielders
    '5': { x: 0.85, y: 0.45 },
    '6': { x: 0.6, y: 0.45 },
    '7': { x: 0.5, y: 0.45 },
    '8': { x: 0.4, y: 0.45 },
    '9': { x: 0.15, y: 0.45 },
    // Forwards
    '10': { x: 0.6, y: 0.15 },
    '11': { x: 0.4, y: 0.15 },
  },
  '5-3-2': {
    // Goalkeeper
    '1': { x: 0.5, y: 0.95 },
    // Defenders
    '2': { x: 0.9, y: 0.75 },
    '3': { x: 0.7, y: 0.75 },
    '4': { x: 0.5, y: 0.75 },
    '5': { x: 0.3, y: 0.75 },
    '6': { x: 0.1, y: 0.75 },
    // Midfielders
    '7': { x: 0.65, y: 0.45 },
    '8': { x: 0.5, y: 0.45 },
    '9': { x: 0.35, y: 0.45 },
    // Forwards
    '10': { x: 0.6, y: 0.15 },
    '11': { x: 0.4, y: 0.15 },
  },
  '4-2-3-1': {
    // Goalkeeper
    '1': { x: 0.5, y: 0.95 },
    // Defenders
    '2': { x: 0.8, y: 0.75 },
    '3': { x: 0.6, y: 0.75 },
    '4': { x: 0.4, y: 0.75 },
    '5': { x: 0.2, y: 0.75 },
    // Defensive Midfielders
    '6': { x: 0.6, y: 0.6 },
    '7': { x: 0.4, y: 0.6 },
    // Attacking Midfielders
    '8': { x: 0.75, y: 0.35 },
    '9': { x: 0.5, y: 0.35 },
    '10': { x: 0.25, y: 0.35 },
    // Forward
    '11': { x: 0.5, y: 0.15 },
  },
  '3-4-3': {
    // Goalkeeper
    '1': { x: 0.5, y: 0.95 },
    // Defenders
    '2': { x: 0.7, y: 0.75 },
    '3': { x: 0.5, y: 0.75 },
    '4': { x: 0.3, y: 0.75 },
    // Midfielders
    '5': { x: 0.8, y: 0.45 },
    '6': { x: 0.6, y: 0.45 },
    '7': { x: 0.4, y: 0.45 },
    '8': { x: 0.2, y: 0.45 },
    // Forwards
    '9': { x: 0.75, y: 0.15 },
    '10': { x: 0.5, y: 0.15 },
    '11': { x: 0.25, y: 0.15 },
  },
  'Unknown': {
    '1': { x: 0.5, y: 0.9 },
    '2': { x: 0.2, y: 0.7 },
    '3': { x: 0.4, y: 0.7 },
    '4': { x: 0.6, y: 0.7 },
    '5': { x: 0.8, y: 0.7 },
    '6': { x: 0.3, y: 0.5 },
    '7': { x: 0.7, y: 0.5 },
    '8': { x: 0.2, y: 0.3 },
    '9': { x: 0.5, y: 0.3 },
    '10': { x: 0.8, y: 0.3 },
    '11': { x: 0.5, y: 0.1 },
  },
};

export function getPlayerPositions(team: Team, isHomeTeam: boolean): Record<string, { x: number; y: number }> {
  const formation = (team.formation as Formation) || 'Unknown';
  const positions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['Unknown'];
  
  const result: Record<string, { x: number; y: number }> = {};
  
  team.players.forEach((player: Player, index: number) => {
    const positionKey = (index + 1).toString();
    const basePosition = positions[positionKey] || positions['1'];
    
    // Flip positions for away team
    const position = isHomeTeam 
      ? basePosition 
      : { x: basePosition.x, y: 1 - basePosition.y };
    
    result[player.id.toString()] = position;
  });
  
  return result;
}

export function getFormationPositions(formation: Formation): FormationPositions {
  return FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['Unknown'];
}
