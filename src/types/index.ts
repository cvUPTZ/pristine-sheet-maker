export interface Match {
  id: string;
  name?: string | null;
  description?: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_formation?: string | null;
  away_team_formation?: string | null;
  home_team_players?: any;
  away_team_players?: any;
  match_date?: string | null;
  status: 'published' | 'draft' | 'live' | 'completed' | 'archived';
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
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
  teamId?: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  teamId: string;
  playerId: number;
  type: EventType;
  timestamp: number;
  coordinates?: { x: number; y: number };
  status?: 'optimistic' | 'pending_confirmation' | 'confirmed' | 'failed';
  clientId?: string;
  optimisticCreationTime?: number;
  user_id?: string;
  relatedPlayerId?: number;
  meta?: any;
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
  | 'card'
  | 'penalty'
  | 'free-kick'
  | 'goal-kick'
  | 'throw-in'
  | 'interception';

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

export interface TimeSegmentStatistics {
  id: string;
  timeSegment: string;
  possession: { home: number; away: number };
  ballsPlayed: { home: number; away: number };
  ballsGiven: { home: number; away: number };
  ballsRecovered: { home: number; away: number };
  recoveryTime: { home: number; away: number };
  contacts: { home: number; away: number };
  cumulativePossession: { home: number; away: number };
  cumulativeBallsPlayed: { home: number; away: number };
  cumulativeBallsGiven: { home: number; away: number };
  cumulativeBallsRecovered: { home: number; away: number };
  cumulativeRecoveryTime: { home: number; away: number };
  cumulativeContacts: { home: number; away: number };
  possessionDifference: { home: number; away: number };
  ballsPlayedDifference: { home: number; away: number };
  ballsGivenDifference: { home: number; away: number };
  ballsRecoveredDifference: { home: number; away: number };
}

export interface PlayerStatistics {
  playerId: number;
  playerName: string;
  teamId: string;
  team: string;
  player: Player;
  ballsPlayed: number;
  ballsLost: number;
  ballsRecovered: number;
  passesCompleted: number;
  passesAttempted: number;
  possessionTime: number;
  contacts: number;
  lossRatio: number;
  goals: number;
  assists: number;
  passes: number;
  shots: number;
  fouls: number;
}

export type Formation = string;

export interface FormationPositions {
  [key: string]: { [key: number]: { x: number; y: number } };
}

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

export interface BallPath {
  id?: string;
  clientId?: string;
  startCoordinates: { x: number; y: number };
  endCoordinates: { x: number; y: number };
  status: 'optimistic' | 'pending_confirmation' | 'confirmed' | 'failed';
}
