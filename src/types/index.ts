
export interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  jersey_number: number;
  player_name: string;
}

export interface Team {
  name: string;
  formation: string;
  players: Player[];
}

export interface BallTrackingPoint {
  x: number;
  y: number;
  timestamp: number;
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
    shots: number;
    shotsOnTarget: number;
    corners: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
  };
  away: {
    possession: number;
    shots: number;
    shotsOnTarget: number;
    corners: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
  };
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  passes: number;
  saves: number;
  goals: number;
  substitutions: number;
  offsides: number;
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
