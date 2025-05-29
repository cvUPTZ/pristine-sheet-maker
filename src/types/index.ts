
export interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  jersey_number: number;
  player_name: string;
}

export interface Team {
  id?: string;
  name: string;
  formation: Formation;
  players: Player[];
}

export interface BallTrackingPoint {
  x: number;
  y: number;
  timestamp: number;
  teamId?: 'home' | 'away';
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: string;
  timestamp: number;
  playerId: string | number;
  teamId: 'home' | 'away';
  coordinates?: { x: number; y: number };
  status?: string;
  user_id?: string;
  clientId?: string;
  optimisticCreationTime?: number;
}

export interface TimelineEvent {
  id: string;
  matchId: string;
  type: string;
  timestamp: number;
  playerId: string | number;
  teamId: 'home' | 'away';
  coordinates?: { x: number; y: number };
}

export interface Statistics {
  home: {
    possession: number;
    shots: {
      onTarget: number;
      offTarget: number;
    };
    shotsOnTarget: number;
    corners: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
    passes: {
      successful: number;
      attempted: number;
    };
  };
  away: {
    possession: number;
    shots: {
      onTarget: number;
      offTarget: number;
    };
    shotsOnTarget: number;
    corners: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
    passes: {
      successful: number;
      attempted: number;
    };
  };
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
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
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
  saves: number;
  goals: number;
  substitutions: number;
  offsides: number;
  ballsPlayed: {
    home: number;
    away: number;
  };
  ballsLost: {
    home: number;
    away: number;
  };
}

export interface Match {
  id: string;
  name?: string;
  description?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamPlayers: Player[];
  awayTeamPlayers: Player[];
  homeTeamFormation?: string;
  awayTeamFormation?: string;
  status: string;
  matchDate?: string;
  statistics?: Statistics;
  ballTrackingData?: BallTrackingPoint[];
  home_team_name: string;
  away_team_name: string;
  home_team_players: Player[];
  away_team_players: Player[];
  home_team_formation?: string;
  away_team_formation?: string;
  match_date?: string;
  match_statistics?: Statistics;
  ball_tracking_data?: BallTrackingPoint[];
}

export interface LiveMatch {
  id: string;
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string;
}

export interface PlayerNode {
  id: string;
  name: string;
  position: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  jersey_number?: number;
}

export type UserRoleType = 'admin' | 'tracker' | 'viewer' | 'user';

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '5-3-2' | '4-2-3-1' | '3-4-3';

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
  | 'interception' 
  | 'possession' 
  | 'ballLost' 
  | 'ballRecovered' 
  | 'dribble' 
  | 'cross' 
  | 'clearance' 
  | 'block' 
  | 'save' 
  | 'ownGoal' 
  | 'freeKick' 
  | 'throwIn' 
  | 'goalKick' 
  | 'aerialDuel' 
  | 'groundDuel';
