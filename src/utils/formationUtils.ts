
// src/utils/formationUtils.ts
import { Formation, Player } from '@/types';

// Define formation positions for players on the field (used for visual representation)
export const formationVisualPositions: Record<Formation, { x: number; y: number }[]> = {
  '4-4-2': [
    // GK
    { x: 10, y: 50 },
    // Defense (4)
    { x: 25, y: 20 }, { x: 25, y: 40 }, { x: 25, y: 60 }, { x: 25, y: 80 },
    // Midfield (4)
    { x: 50, y: 20 }, { x: 50, y: 40 }, { x: 50, y: 60 }, { x: 50, y: 80 },
    // Attack (2)
    { x: 75, y: 35 }, { x: 75, y: 65 }
  ],
  '4-3-3': [
    // GK
    { x: 10, y: 50 },
    // Defense (4)
    { x: 25, y: 15 }, { x: 25, y: 35 }, { x: 25, y: 65 }, { x: 25, y: 85 },
    // Midfield (3)
    { x: 50, y: 30 }, { x: 50, y: 50 }, { x: 50, y: 70 },
    // Attack (3)
    { x: 75, y: 25 }, { x: 75, y: 50 }, { x: 75, y: 75 }
  ],
  '3-5-2': [
    // GK
    { x: 10, y: 50 },
    // Defense (3)
    { x: 25, y: 25 }, { x: 25, y: 50 }, { x: 25, y: 75 },
    // Midfield (5)
    { x: 40, y: 10 }, { x: 50, y: 30 }, { x: 50, y: 50 }, { x: 50, y: 70 }, { x: 40, y: 90 },
    // Attack (2)
    { x: 75, y: 40 }, { x: 75, y: 60 }
  ],
  '5-3-2': [
    // GK
    { x: 10, y: 50 },
    // Defense (5)
    { x: 25, y: 10 }, { x: 25, y: 30 }, { x: 25, y: 50 }, { x: 25, y: 70 }, { x: 25, y: 90 },
    // Midfield (3)
    { x: 50, y: 30 }, { x: 50, y: 50 }, { x: 50, y: 70 },
    // Attack (2)
    { x: 75, y: 40 }, { x: 75, y: 60 }
  ],
  '4-2-3-1': [
    // GK
    { x: 10, y: 50 },
    // Defense (4)
    { x: 25, y: 20 }, { x: 25, y: 40 }, { x: 25, y: 60 }, { x: 25, y: 80 },
    // Defensive Mid (2)
    { x: 45, y: 35 }, { x: 45, y: 65 },
    // Attacking Mid (3)
    { x: 60, y: 25 }, { x: 60, y: 50 }, { x: 60, y: 75 },
    // Striker (1)
    { x: 80, y: 50 }
  ],
  '3-4-3': [
    // GK
    { x: 10, y: 50 },
    // Defense (3)
    { x: 25, y: 25 }, { x: 25, y: 50 }, { x: 25, y: 75 },
    // Midfield (4)
    { x: 50, y: 20 }, { x: 50, y: 40 }, { x: 50, y: 60 }, { x: 50, y: 80 },
    // Attack (3)
    { x: 75, y: 25 }, { x: 75, y: 50 }, { x: 75, y: 75 }
  ],
  'Unknown': [ 
    { x: 10, y: 50 }, { x: 25, y: 20 }, { x: 25, y: 40 }, { x: 25, y: 60 }, { x: 25, y: 80 },
    { x: 50, y: 20 }, { x: 50, y: 40 }, { x: 50, y: 60 }, { x: 50, y: 80 },
    { x: 75, y: 35 }, { x: 75, y: 65 }
  ]
};

export const getPlayerPositions = (formation: Formation): { x: number; y: number }[] => {
  return formationVisualPositions[formation] || formationVisualPositions['4-4-2'];
};

// Define standard position names for players based on formation
const positionNamesByFormation: Record<Formation, string[]> = {
  '4-4-2': ['Goalkeeper', 'Right Fullback', 'Center Back 1', 'Center Back 2', 'Left Fullback', 'Right Midfielder', 'Center Midfielder 1', 'Center Midfielder 2', 'Left Midfielder', 'Forward 1', 'Forward 2'],
  '4-3-3': ['Goalkeeper', 'Right Fullback', 'Center Back 1', 'Center Back 2', 'Left Fullback', 'Defensive Midfielder', 'Center Midfielder (R)', 'Center Midfielder (L)', 'Right Winger', 'Striker', 'Left Winger'],
  '3-5-2': ['Goalkeeper', 'Center Back 1', 'Center Back 2', 'Center Back 3', 'Right Wing-Back', 'Center Midfielder 1', 'Defensive Midfielder', 'Center Midfielder 2', 'Left Wing-Back', 'Forward 1', 'Forward 2'],
  '5-3-2': ['Goalkeeper', 'Right Wing-Back', 'Center Back 1', 'Center Back (Center)', 'Center Back 2', 'Left Wing-Back', 'Right Midfielder', 'Center Midfielder', 'Left Midfielder', 'Forward 1', 'Forward 2'],
  '4-2-3-1': ['Goalkeeper', 'Right Fullback', 'Center Back 1', 'Center Back 2', 'Left Fullback', 'Defensive Midfielder 1', 'Defensive Midfielder 2', 'Right Attacking Mid', 'Central Attacking Mid', 'Left Attacking Mid', 'Striker'],
  '3-4-3': ['Goalkeeper', 'Right Center Back', 'Center Back', 'Left Center Back', 'Right Midfielder', 'Center Midfielder 1', 'Center Midfielder 2', 'Left Midfielder', 'Right Winger', 'Striker', 'Left Winger'],
  'Unknown': Array(11).fill('Player'),
};

export const generatePlayersForFormation = (teamId: string, formation: Formation, startingId: number): Player[] => {
  const players: Player[] = [];
  const defaultFormation: Formation = '4-4-2';
  const selectedFormationPositions = positionNamesByFormation[formation] || positionNamesByFormation[defaultFormation];
  
  for (let i = 0; i < 11; i++) {
    players.push({
      id: startingId + i,
      name: selectedFormationPositions[i] ? `${selectedFormationPositions[i]}` : `Player ${i + 1}`,
      number: i + 1,
      position: selectedFormationPositions[i] || 'Unknown',
    });
  }
  return players;
};

export const getPositionName = (formation: Formation, playerIndex: number): string => {
  const defaultFormation: Formation = '4-4-2';
  const positions = positionNamesByFormation[formation] || positionNamesByFormation[defaultFormation];
  return positions[playerIndex] || `Position ${playerIndex + 1}`;
};

export const createSimulatedTeams = () => {
  const homeTeam = {
    id: 'home',
    name: 'Home Team',
    players: generatePlayersForFormation('home', '4-3-3', 1),
    formation: '4-3-3' as Formation
  };

  const awayTeam = {
    id: 'away', 
    name: 'Away Team',
    players: generatePlayersForFormation('away', '4-4-2', 12),
    formation: '4-4-2' as Formation
  };

  return { homeTeam, awayTeam };
};
