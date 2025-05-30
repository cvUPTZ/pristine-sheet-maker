
export type EventType = 'pass' | 'shot' | 'foul' | 'goal' | 'save' | 'offside' | 'corner' | 'substitution' | 'yellowCard' | 'redCard' | 'tackle' | 'interception' | 'cross' | 'clearance' | 'card' | 'penalty' | 'free-kick' | 'goal-kick' | 'throw-in' | 'assist' | 'possession' | 'ballLost' | 'ballRecovered' | 'dribble' | 'block' | 'ownGoal' | 'freeKick' | 'throwIn' | 'goalKick' | 'aerialDuel' | 'groundDuel' | 'sub';

export type Formation = string;

export interface FlowPlayerNode {
  id: string;
  name: string;
  x: number;
  y: number;
  passes: number;
  fx?: number;
  fy?: number;
}

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
  id?: string;
  x: number;
  y: number;
  timestamp: number;
  team?: 'home' | 'away';
  player_id?: number;
}

export interface ShotStatistics {
  onTarget: number;
  offTarget: number;
  total?: number;
  won?: number;
}

export interface PassStatistics {
  successful: number;
  attempted: number;
  total?: number;
}

export interface DuelStatistics {
  home: number;
  away: number;
  won?: number;
  total?: number;
}

export interface CrossStatistics {
  home: number;
  away: number;
}

export interface Statistics {
  possession: { home: number; away: number };
  shots: { home: ShotStatistics; away: ShotStatistics };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  offsides: { home: number; away: number };
  passes: { home: PassStatistics; away: PassStatistics };
  ballsPlayed: { home: number; away: number };
  ballsLost: { home: number; away: number };
  duels: DuelStatistics;
  crosses: CrossStatistics;
}

export interface TimeSegmentStatistics {
  startTime: number;
  endTime: number;
  timeSegment: string;
  events?: any[];
}

export interface MatchEvent {
  id: string;
  match_id: string;
  teamId?: 'home' | 'away';
  team?: 'home' | 'away';
  playerId?: number | undefined;
  player_id?: number | undefined;
  player?: Player;
  type: EventType;
  event_type?: string;
  timestamp: number;
  coordinates: { x: number; y: number };
  status?: 'pending' | 'confirmed' | 'synced';
  user_id?: string;
  created_by?: string;
  created_at?: string;
  description?: string;
}

export interface Match {
  id: string;
  name?: string | undefined;
  status: string;
  match_date: string | undefined;
  matchDate?: string;
  home_team_name: string;
  away_team_name: string;
  homeTeamName?: string;
  awayTeamName?: string;
  home_team_formation: string | undefined;
  away_team_formation: string | undefined;
  home_team_players?: any;
  away_team_players?: any;
  home_team_score?: number | undefined;
  away_team_score?: number | undefined;
  location?: string | undefined;
  venue?: string | undefined;
  competition?: string | undefined;
  notes?: string | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
  created_by?: string | undefined;
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

export interface PlayerStatsTableProps {
  homeTeam: Team;
  awayTeam: Team;
  events?: MatchEvent[];
  stats?: { name: string; value: number; }[];
}

export type UserRoleType = 'admin' | 'tracker' | 'user' | 'viewer';

export interface SavedMatch extends Match {
  // Additional properties for saved matches if needed
}
