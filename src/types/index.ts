
export interface Player {
  id: number;
  name: string;
  number: number;
  position?: string;
  x?: number;
  y?: number;
  isSelected?: boolean;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  formation: string;
  score?: number;
}

export interface Match {
  id: string;
  name?: string;
  description?: string;
  match_type?: string;
  home_team_name: string;
  away_team_name: string;
  home_team_formation?: string;
  away_team_formation?: string;
  home_team_players?: Player[];
  away_team_players?: Player[];
  status: string;
  match_date?: string;
  created_at: string;
  updated_at?: string;
  home_team_score?: number;
  away_team_score?: number;
  ball_tracking_data?: BallTrackingPoint[];
  match_statistics?: Statistics;
}

export interface MatchEvent {
  id: string;
  type: EventType;
  timestamp: number;
  playerId?: number;
  teamId?: 'home' | 'away';
  coordinates?: { x: number; y: number };
  description?: string;
  player?: Player;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  category: string;
  location: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface BallTrackingPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface Statistics {
  home: TeamStats;
  away: TeamStats;
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  passes: { home: number; away: number };
  passAccuracy: { home: number; away: number };
  crosses: { home: number; away: number };
  tackles: { home: number; away: number };
  interceptions: { home: number; away: number };
  offsides: { home: number; away: number };
}

export interface TeamStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  possession: number;
  passes: number;
  passAccuracy: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  crosses: number;
  tackles: number;
  interceptions: number;
  offsides: number;
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

export type UserRoleType = 'admin' | 'tracker' | 'teacher' | 'user';

export interface LiveMatch {
  id: string;
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string;
}

export interface PlayerNode extends Player {
  fx?: number;
  fy?: number;
  x?: number;
  y?: number;
}
