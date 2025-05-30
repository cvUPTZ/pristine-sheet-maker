
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
  | 'groundDuel'
  | 'sub';

export type Formation = 
  | '4-4-2' | '4-3-3' | '3-5-2' | '4-5-1' | '4-2-3-1' | '3-4-3' | '5-3-2'
  | 'Unknown';

export type UserRoleType = 'admin' | 'tracker' | 'viewer' | 'user';

export interface Player {
  id: string | number;
  name: string;
  player_name?: string;
  position: string;
  number: number;
  jersey_number?: number;
}

export interface Team {
  id?: string;
  name: string;
  formation: Formation;
  players: Player[];
}

export interface BallTrackingPoint {
  id?: string;
  x: number;
  y: number;
  timestamp: number;
  team?: 'home' | 'away';
  player_id?: string | number;
}

export interface FlowPlayerNode {
  id: string | number;
  name: string;
  x: number;
  y: number;
  count: number;
  team: 'home' | 'away';
  fx?: number;
  fy?: number;
}

export interface Filter {
  searchTerm: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
}

export interface ShotStats {
  onTarget: number;
  offTarget: number;
  total?: number;
}

export interface PassStats {
  successful: number;
  attempted: number;
}

export interface DuelStats {
  won?: number;
  total?: number;
}

export interface CrossStats {
  total?: number;
  successful?: number;
}

export interface Statistics {
  possession: { home: number; away: number };
  shots: { home: ShotStats; away: ShotStats };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  offsides: { home: number; away: number };
  passes: { home: PassStats; away: PassStats };
  ballsPlayed: { home: number; away: number };
  ballsLost: { home: number; away: number };
  duels: { home: DuelStats; away: DuelStats };
  crosses: { home: CrossStats; away: CrossStats };
}

export interface TimeSegmentStatistics {
  startTime: number;
  endTime: number;
  timeSegment: string;
  events: any[];
  possession?: { home: number; away: number };
  cumulativePossession?: { home: number; away: number };
  possessionDifference?: { home: number; away: number };
  ballsPlayed?: { home: number; away: number };
  cumulativeBallsPlayed?: { home: number; away: number };
  ballsPlayedDifference?: { home: number; away: number };
  ballsGiven?: { home: number; away: number };
  cumulativeBallsGiven?: { home: number; away: number };
  ballsGivenDifference?: { home: number; away: number };
  ballsRecovered?: { home: number; away: number };
  cumulativeBallsRecovered?: { home: number; away: number };
  recoveryTime?: { home: number; away: number };
  cumulativeRecoveryTime?: { home: number; away: number };
}

export interface MatchEvent {
  id: string;
  match_id: string;
  timestamp: number;
  event_type: string;
  type: EventType;
  event_data?: Record<string, any> | null;
  created_at?: string;
  tracker_id?: string | null;
  team_id?: string | null;
  player_id?: number | null;
  team?: 'home' | 'away';
  coordinates: { x: number; y: number };
  created_by?: string;
  status?: string;
  user_id?: string;
  clientId?: string;
  optimisticCreationTime?: number;
  player?: Player;
  description?: string;
}

export interface Match {
  id: string;
  name?: string;
  status: string;
  home_team_name: string;
  away_team_name: string;
  home_team_formation?: string;
  away_team_formation?: string;
  match_date?: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  description?: string;
  match_type?: string;
  timer_status?: string;
  timer_current_value?: number;
  timer_last_started_at?: string;
  home_team_score?: number;
  away_team_score?: number;
  competition?: string;
  notes?: string;
  home_team_players?: any;
  away_team_players?: any;
  match_statistics?: any;
  ball_tracking_data?: any;
  homeTeamName?: string;
  awayTeamName?: string;
  matchDate?: string;
  venue?: string;
  statistics?: Statistics;
  ballTrackingData?: BallTrackingPoint[];
  homeTeam?: Team;
  awayTeam?: Team;
  ballTrackingPoints?: BallTrackingPoint[];
  timeSegments?: TimeSegmentStatistics[];
  date?: string;
  matchId?: string;
  events?: MatchEvent[];
}

export interface SavedMatch extends Match {
  events?: MatchEvent[];
}
