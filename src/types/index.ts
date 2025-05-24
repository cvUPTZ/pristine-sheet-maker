export interface Match {
  id: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  date: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  formation: string;
}

export interface Player {
  id: number;
  name: string;
  number: number;
  position: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  teamId: string;
  playerId: number;
  type: EventType;
  timestamp: number;
  coordinates: { x: number; y: number };
  status?: 'optimistic' | 'pending_confirmation' | 'confirmed' | 'failed';
  clientId?: string;
  optimisticCreationTime?: number;
}

export type EventType =
  | 'pass'
  | 'shot'
  | 'tackle'
  | 'foul'
  | 'corner'
  | 'offside'
  | 'goal'
  | 'assist'
  | 'yellowCard'
  | 'redCard'
  | 'substitution'
  | 'card'         // Added
  | 'penalty'      // Added
  | 'free-kick'    // Added
  | 'goal-kick'    // Added
  | 'throw-in'     // Added
  | 'interception'; // Added

export interface Statistics {
  possession: { home: number; away: number };
  shots: { 
    home: { onTarget: number; offTarget: number; total?: number }; 
    away: { onTarget: number; offTarget: number; total?: number } 
  };
  passes: { 
    home: { successful: number; attempted: number; total?: number }; 
    away: { successful: number; attempted: number; total?: number } 
  };
  ballsPlayed: { home: number; away: number };
  ballsLost: { home: number; away: number };
  duels: { home: { won: number; lost: number; aerial: number }; away: { won: number; lost: number; aerial: number } };
  cards: { home: { yellow: number; red: number }; away: { yellow: number; red: number } };
  crosses: { home: { total: number; successful: number }; away: { total: number; successful: number } };
  dribbles: { home: { successful: number; attempted: number }; away: { successful: number; attempted: number } };
  corners: { home: number; away: number };
  offsides: { home: number; away: number };
  freeKicks: { home: number; away: number };
}

export interface BallTrackingPoint {
  x: number;
  y: number;
  timestamp: number;
  playerId?: number;
  teamId?: string;
}

// Update TimeSegmentStatistics to include additional metrics
export interface TimeSegmentStatistics {
  id: string;
  timeSegment: string; // e.g. "0-5"
  possession: { home: number; away: number };
  ballsPlayed: { home: number; away: number };
  ballsGiven: { home: number; away: number };  // Balls lost
  ballsRecovered: { home: number; away: number };
  recoveryTime: { home: number; away: number };
  contacts: { home: number; away: number };
  // Added cumulative statistics
  cumulativePossession: { home: number; away: number };
  cumulativeBallsPlayed: { home: number; away: number };
  cumulativeBallsGiven: { home: number; away: number };
  cumulativeBallsRecovered: { home: number; away: number };
  cumulativeRecoveryTime: { home: number; away: number };
  cumulativeContacts: { home: number; away: number };
  // Added difference statistics
  possessionDifference: { home: number; away: number };
  ballsPlayedDifference: { home: number; away: number };
  ballsGivenDifference: { home: number; away: number };
  ballsRecoveredDifference: { home: number; away: number };
}

// Update PlayerStatistics type to include all required properties
export interface PlayerStatistics {
  playerId: number;
  playerName: string;
  teamId: string;
  team: string; // Added
  player: Player;  // Added
  ballsPlayed: number;
  ballsLost: number;
  ballsRecovered: number;
  passesCompleted: number;
  passesAttempted: number;
  possessionTime: number;
  contacts: number;
  lossRatio: number;
  goals: number;    // Added
  assists: number;  // Added
  passes: number;   // Added
  shots: number;    // Added
  fouls: number;    // Added
}

// Update Formation type
export type Formation = string;

// Add FormationPositions type
export interface FormationPositions {
  [key: string]: { [key: number]: { x: number; y: number } };
}

// Add SavedMatch interface for Statistics.tsx
export interface SavedMatch {
  matchId: string;
  date: string;
  elapsedTime: number;
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
  statistics: Statistics;
  ballTrackingPoints: BallTrackingPoint[];
  timeSegments: TimeSegmentStatistics[];
  playerStats: PlayerStatistics[];
}
