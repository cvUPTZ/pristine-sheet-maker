
export interface Statistics {
  home: TeamStats;
  away: TeamStats;
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

export interface TeamStats {
  passes: number;
  shots: number;
  tackles: number;
  fouls: number;
  possession: number;
}

export interface TimeSegmentStatistics {
  startTime: number;
  endTime: number;
  timeSegment: string;
  events?: MatchEvent[];
}

export interface Player {
  id: number;
  name: string;
  number?: number;
  position: string;
  [key: string]: any;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  formation: string;
}

export interface Match {
  id: string;
  name?: string;
  description?: string;
  home_team_name: string;
  away_team_name: string;
  home_team_formation?: string;
  away_team_formation?: string;
  status: string;
  match_date: string;
  created_at: string;
  home_team_players?: Player[];
  away_team_players?: Player[];
}

export interface SavedMatch extends Match {
  date: string;
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
  ballTrackingPoints: BallTrackingPoint[];
  timeSegments: TimeSegmentStatistics[];
  statistics: Statistics;
  matchId?: string;
}

export interface MatchEvent {
  id: string;
  type: EventType;
  timestamp: number;
  playerId: number;
  teamId: 'home' | 'away';
  coordinates: { x: number; y: number };
  status?: 'optimistic' | 'pending_confirmation' | 'confirmed' | 'failed';
  clientId?: string;
  optimisticCreationTime?: number;
  user_id?: string;
  matchId?: string;
}

export interface BallTrackingPoint {
  x: number;
  y: number;
  timestamp: number;
  teamId?: 'home' | 'away';
  playerId?: number;
}

export interface PlayerStatistics {
  playerId: number;
  playerName: string;
  team: 'home' | 'away';
  goals?: number;
  assists?: number;
  passes?: number;
  shots?: number;
  fouls?: number;
  player?: {
    number?: number;
  };
}

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '5-3-2' | '4-2-3-1' | '3-4-3' | 'Unknown';

export interface FormationPositions {
  [key: string]: { x: number; y: number };
}

export type EventType = 
  | 'pass' | 'shot' | 'tackle' | 'foul' | 'corner' | 'offside' | 'goal'
  | 'assist' | 'yellowCard' | 'redCard' | 'substitution' | 'card'
  | 'penalty' | 'free-kick' | 'goal-kick' | 'throw-in' | 'interception'
  | 'possession' | 'ballLost' | 'ballRecovered' | 'dribble' | 'cross'
  | 'clearance' | 'block' | 'save' | 'ownGoal' | 'freeKick' | 'throwIn'
  | 'goalKick' | 'aerialDuel' | 'groundDuel';

export type UserRoleType = 'admin' | 'tracker' | 'viewer' | 'user';
