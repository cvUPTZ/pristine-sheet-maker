
export type EventType = 'pass' | 'shot' | 'foul' | 'goal' | 'save' | 'offside' | 'corner' | 'sub' | 'yellowCard' | 'redCard' | 'tackle' | 'interception' | 'cross' | 'clearance';

export interface Player {
  id: number;
  name?: string;
  player_name?: string;
  position: string;
  number?: number;
  jersey_number?: number;
  team_context?: string;
}

export interface Team {
  id: string;
  name: string;
  formation: string;
  players: Player[];
}

export interface BallTrackingPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface Statistics {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  offsides: { home: number; away: number };
  passes: { home: number; away: number };
}

export interface TimeSegmentStatistics {
  startTime: number;
  endTime: number;
  timeSegment: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  teamId?: 'home' | 'away';
  team?: string;
  playerId?: number;
  player_id?: number;
  type: EventType;
  event_type?: string;
  timestamp: number;
  coordinates: { x: number; y: number };
  status?: 'pending' | 'confirmed' | 'synced';
  user_id?: string;
  created_by?: string;
  created_at?: string;
}

export interface Match {
  id: string;
  name?: string;
  status: string;
  match_date: string | null;
  matchDate?: string;
  home_team_name: string;
  away_team_name: string;
  homeTeamName?: string;
  awayTeamName?: string;
  home_team_formation: string | null;
  away_team_formation: string | null;
  home_team_players?: any;
  away_team_players?: any;
  home_team_score?: number | null;
  away_team_score?: number | null;
  location?: string | null | undefined;
  venue?: string;
  competition?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  statistics?: Statistics;
  ballTrackingData?: BallTrackingPoint[];
}

export interface Filter {
  searchTerm: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export type UserRoleType = 'admin' | 'tracker' | 'user' | 'viewer';
