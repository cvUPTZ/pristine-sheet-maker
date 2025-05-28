
import { Formation } from '@/types';

// Define formation positions for players on the field
export const formationPositions: Record<Formation, { x: number; y: number }[]> = {
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
  ]
};

export const getFormationPositions = (formation: Formation): { x: number; y: number }[] => {
  return formationPositions[formation] || formationPositions['4-4-2'];
};
