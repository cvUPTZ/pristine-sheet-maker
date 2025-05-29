
import { Team, Player } from '@/types';

export type Formation = 
  | '4-4-2' | '4-3-3' | '3-5-2' | '4-5-1' | '4-2-3-1' | '3-4-3' | '5-3-2'
  | 'Unknown';

export const formations: Formation[] = [
  '4-4-2', '4-3-3', '3-5-2', '4-5-1', '4-2-3-1', '3-4-3', '5-3-2'
];

export const generatePlayersForFormation = (formation: Formation, teamName: string): Player[] => {
  const players: Player[] = [];
  
  // Generate 11 players for the formation
  for (let i = 1; i <= 11; i++) {
    players.push({
      id: `${teamName.toLowerCase().replace(/\s+/g, '-')}-player-${i}`,
      name: `${teamName} Player ${i}`,
      position: i === 1 ? 'Goalkeeper' : 'Outfield',
      number: i
    });
  }
  
  return players;
};

export const createSimulatedTeams = (): { homeTeam: Team; awayTeam: Team } => {
  const homeTeam: Team = {
    id: 'home-team',
    name: 'Home Team',
    formation: '4-4-2',
    players: generatePlayersForFormation('4-4-2', 'Home')
  };
  
  const awayTeam: Team = {
    id: 'away-team', 
    name: 'Away Team',
    formation: '4-3-3',
    players: generatePlayersForFormation('4-3-3', 'Away')
  };
  
  return { homeTeam, awayTeam };
};

export const getFormationPositions = (formation: Formation): Array<{x: number, y: number}> => {
  // Return basic position layout for formations
  const positions: Record<Formation, Array<{x: number, y: number}>> = {
    '4-4-2': [
      {x: 50, y: 90}, // GK
      {x: 20, y: 70}, {x: 40, y: 70}, {x: 60, y: 70}, {x: 80, y: 70}, // Defense
      {x: 20, y: 50}, {x: 40, y: 50}, {x: 60, y: 50}, {x: 80, y: 50}, // Midfield
      {x: 35, y: 30}, {x: 65, y: 30} // Attack
    ],
    '4-3-3': [
      {x: 50, y: 90}, // GK
      {x: 20, y: 70}, {x: 40, y: 70}, {x: 60, y: 70}, {x: 80, y: 70}, // Defense
      {x: 30, y: 50}, {x: 50, y: 50}, {x: 70, y: 50}, // Midfield
      {x: 25, y: 30}, {x: 50, y: 30}, {x: 75, y: 30} // Attack
    ],
    '3-5-2': [
      {x: 50, y: 90}, // GK
      {x: 30, y: 70}, {x: 50, y: 70}, {x: 70, y: 70}, // Defense
      {x: 15, y: 50}, {x: 35, y: 50}, {x: 50, y: 50}, {x: 65, y: 50}, {x: 85, y: 50}, // Midfield
      {x: 40, y: 30}, {x: 60, y: 30} // Attack
    ],
    '4-5-1': [
      {x: 50, y: 90}, // GK
      {x: 20, y: 70}, {x: 40, y: 70}, {x: 60, y: 70}, {x: 80, y: 70}, // Defense
      {x: 15, y: 50}, {x: 35, y: 50}, {x: 50, y: 50}, {x: 65, y: 50}, {x: 85, y: 50}, // Midfield
      {x: 50, y: 30} // Attack
    ],
    '4-2-3-1': [
      {x: 50, y: 90}, // GK
      {x: 20, y: 70}, {x: 40, y: 70}, {x: 60, y: 70}, {x: 80, y: 70}, // Defense
      {x: 35, y: 55}, {x: 65, y: 55}, // Defensive Midfield
      {x: 25, y: 40}, {x: 50, y: 40}, {x: 75, y: 40}, // Attacking Midfield
      {x: 50, y: 25} // Attack
    ],
    '3-4-3': [
      {x: 50, y: 90}, // GK
      {x: 30, y: 70}, {x: 50, y: 70}, {x: 70, y: 70}, // Defense
      {x: 25, y: 50}, {x: 45, y: 50}, {x: 55, y: 50}, {x: 75, y: 50}, // Midfield
      {x: 25, y: 30}, {x: 50, y: 30}, {x: 75, y: 30} // Attack
    ],
    '5-3-2': [
      {x: 50, y: 90}, // GK
      {x: 15, y: 70}, {x: 35, y: 70}, {x: 50, y: 70}, {x: 65, y: 70}, {x: 85, y: 70}, // Defense
      {x: 30, y: 50}, {x: 50, y: 50}, {x: 70, y: 50}, // Midfield
      {x: 40, y: 30}, {x: 60, y: 30} // Attack
    ],
    'Unknown': Array.from({length: 11}, (_, i) => ({x: 50, y: 90 - (i * 7)}))
  };
  
  return positions[formation] || positions['Unknown'];
};
