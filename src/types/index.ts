export interface Statistics {
  possession?: { home: number; away: number };
  shots?: { home: number; away: number };
  shotsOnTarget?: { home: number; away: number };
  passes?: { home: number; away: number };
  fouls?: { home: number; away: number };
  yellowCards?: { home: number; away: number };
  redCards?: { home: number; away: number };
  corners?: { home: number; away: number };
  offsides?: { home: number; away: number };
  duels?: { home: number; away: number };
  crosses?: { home: number; away: number };
  dribbles?: { home: number; away: number };
  ballsPlayed?: { home: number; away: number };
  ballsLost?: { home: number; away: number };
  cards?: { home: number; away: number };
  freeKicks?: { home: number; away: number };
}

export interface Player {
  id: number;
  name: string;
  player_name: string;
  number: number;
  jersey_number: number;
  position: string;
}

export interface BallTrackingPoint {
  id: string;
  x: number;
  y: number;
  timestamp: number;
  player_id?: number;
  team?: 'home' | 'away';
}

export interface FlowPlayerNode {
  id: number;
  name: string;
  x: number;
  y: number;
  count: number;
  team: 'home' | 'away';
}

export interface TimeSegmentStatistics {
  timeSegment: string;
  homeStats: Statistics;
  awayStats: Statistics;
}

export interface MatchFormData {
  name: string;
  description?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamPlayers?: Player[];
  awayTeamPlayers?: Player[];
  homeTeamFormation?: string;
  awayTeamFormation?: string;
  matchDate?: string;
  location?: string;
  venue?: string;
  competition?: string;
  status?: string;
  matchType?: string;
  homeTeamScore?: string;
  awayTeamScore?: string;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'tracker' | 'teacher';
}

export interface UserEventAssignment {
  id: string;
  user_id: string;
  event_type: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

export interface PlayerAssignment {
  id: string;
  match_id: string;
  tracker_user_id: string;
  player_id: number;
  player_team_id: string;
  assigned_event_types: string[];
  created_at: string;
  matches: {
    name: string;
    home_team_name: string;
    away_team_name: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}
