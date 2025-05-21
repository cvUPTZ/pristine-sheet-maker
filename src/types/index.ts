
export interface Player {
  id: number;
  name: string;
  number: number;
  position: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  formation?: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  date: Date;
  duration: number; // in minutes
}

export type EventType = 
  | 'shot' 
  | 'goal' 
  | 'foul' 
  | 'pass' 
  | 'card' 
  | 'offside' 
  | 'corner' 
  | 'penalty' 
  | 'free-kick' 
  | 'goal-kick' 
  | 'throw-in'
  | 'tackle'
  | 'interception'
  | 'dribble'
  | 'cross'
  | 'header';

export interface MatchEvent {
  id: string;
  matchId: string;
  teamId: string;
  playerId: number;
  type: EventType;
  timestamp: number; // seconds from match start
  coordinates: { x: number; y: number };
  additionalData?: Record<string, any>; // For extra event-specific data
}

export interface Statistics {
  possession: {
    home: number;
    away: number;
  };
  shots: {
    home: {
      onTarget: number;
      offTarget: number;
    };
    away: {
      onTarget: number;
      offTarget: number;
    };
  };
  passes: {
    home: {
      successful: number;
      attempted: number;
    };
    away: {
      successful: number;
      attempted: number;
    };
  };
  ballsPlayed: {
    home: number;
    away: number;
  };
  ballsLost: {
    home: number;
    away: number;
  };
  // New statistics based on the manual
  duels: {
    home: {
      won: number;
      lost: number;
      aerial: number;
    };
    away: {
      won: number;
      lost: number;
      aerial: number;
    };
  };
  cards: {
    home: {
      yellow: number;
      red: number;
    };
    away: {
      yellow: number;
      red: number;
    };
  };
  crosses: {
    home: {
      total: number;
      successful: number;
    };
    away: {
      total: number;
      successful: number;
    };
  };
  dribbles: {
    home: {
      successful: number;
      attempted: number;
    };
    away: {
      successful: number;
      attempted: number;
    };
  };
  corners: {
    home: number;
    away: number;
  };
  offsides: {
    home: number;
    away: number;
  };
  freeKicks: {
    home: number;
    away: number;
  };
}

export interface FormationPosition {
  x: number;
  y: number;
}

export interface PlayerStatistics {
  player: Player;
  team: string;
  goals: number;
  assists: number;
  passes: number;
  shots: number;
  ballsPlayed: number;
  fouls: number;
  // New player statistics
  ballsReceived: number;
  ballsRecovered: number;
  touches: number;
  duelsWon: number;
  duelsLost: number;
  aerialDuelsWon: number;
  successfulDribbles: number;
  successfulCrosses: number;
  passesForward: number;
  passesBackward: number;
  passesLateral: number;
  longPasses: number;
}

export interface BallTrackingPoint {
  x: number;
  y: number;
  timestamp: number;
  teamId?: string;
  playerId?: number;
}

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '5-3-2' | '4-2-3-1' | '3-4-3';

export type FormationPositions = Record<Formation, FormationPosition[]>;

export interface TimeSegmentStatistics {
  timeSegment: string; // e.g., "0-5", "5-10", etc.
  ballsPlayed: {
    home: number;
    away: number;
  };
  ballsGiven: {
    home: number;
    away: number;
  };
  ballsRecovered: {
    home: number;
    away: number;
  };
  ballsLost: {
    home: number;
    away: number;
  };
  possession: {
    home: number;
    away: number;
  };
  recoveryTime: {
    home: number;
    away: number;
  };
}
