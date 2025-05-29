
import { Player } from '@/types';

// Formation configurations with player positions
export const formations = {
  '4-4-2': [
    { id: 1, name: 'GK', position: 'Goalkeeper', x: 5, y: 50, number: 1 },
    { id: 2, name: 'RB', position: 'Right Back', x: 20, y: 80, number: 2 },
    { id: 3, name: 'CB1', position: 'Centre Back', x: 20, y: 60, number: 3 },
    { id: 4, name: 'CB2', position: 'Centre Back', x: 20, y: 40, number: 4 },
    { id: 5, name: 'LB', position: 'Left Back', x: 20, y: 20, number: 5 },
    { id: 6, name: 'RM', position: 'Right Midfielder', x: 50, y: 75, number: 6 },
    { id: 7, name: 'CM1', position: 'Centre Midfielder', x: 50, y: 55, number: 7 },
    { id: 8, name: 'CM2', position: 'Centre Midfielder', x: 50, y: 45, number: 8 },
    { id: 9, name: 'LM', position: 'Left Midfielder', x: 50, y: 25, number: 9 },
    { id: 10, name: 'ST1', position: 'Striker', x: 80, y: 60, number: 10 },
    { id: 11, name: 'ST2', position: 'Striker', x: 80, y: 40, number: 11 }
  ],
  '4-3-3': [
    { id: 1, name: 'GK', position: 'Goalkeeper', x: 5, y: 50, number: 1 },
    { id: 2, name: 'RB', position: 'Right Back', x: 20, y: 80, number: 2 },
    { id: 3, name: 'CB1', position: 'Centre Back', x: 20, y: 60, number: 3 },
    { id: 4, name: 'CB2', position: 'Centre Back', x: 20, y: 40, number: 4 },
    { id: 5, name: 'LB', position: 'Left Back', x: 20, y: 20, number: 5 },
    { id: 6, name: 'CM1', position: 'Centre Midfielder', x: 50, y: 65, number: 6 },
    { id: 7, name: 'CM2', position: 'Centre Midfielder', x: 50, y: 50, number: 7 },
    { id: 8, name: 'CM3', position: 'Centre Midfielder', x: 50, y: 35, number: 8 },
    { id: 9, name: 'RW', position: 'Right Winger', x: 80, y: 75, number: 9 },
    { id: 10, name: 'ST', position: 'Striker', x: 80, y: 50, number: 10 },
    { id: 11, name: 'LW', position: 'Left Winger', x: 80, y: 25, number: 11 }
  ],
  '3-5-2': [
    { id: 1, name: 'GK', position: 'Goalkeeper', x: 5, y: 50, number: 1 },
    { id: 2, name: 'CB1', position: 'Centre Back', x: 20, y: 70, number: 2 },
    { id: 3, name: 'CB2', position: 'Centre Back', x: 20, y: 50, number: 3 },
    { id: 4, name: 'CB3', position: 'Centre Back', x: 20, y: 30, number: 4 },
    { id: 5, name: 'RWB', position: 'Right Wing Back', x: 40, y: 85, number: 5 },
    { id: 6, name: 'CM1', position: 'Centre Midfielder', x: 50, y: 65, number: 6 },
    { id: 7, name: 'CM2', position: 'Centre Midfielder', x: 50, y: 50, number: 7 },
    { id: 8, name: 'CM3', position: 'Centre Midfielder', x: 50, y: 35, number: 8 },
    { id: 9, name: 'LWB', position: 'Left Wing Back', x: 40, y: 15, number: 9 },
    { id: 10, name: 'ST1', position: 'Striker', x: 80, y: 60, number: 10 },
    { id: 11, name: 'ST2', position: 'Striker', x: 80, y: 40, number: 11 }
  ]
};

export function getFormationPlayers(formation: string): Player[] {
  return formations[formation as keyof typeof formations] || formations['4-4-2'];
}

export function getAvailableFormations(): string[] {
  return Object.keys(formations);
}
