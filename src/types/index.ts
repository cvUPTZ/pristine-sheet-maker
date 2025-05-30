
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
  shots: { home: ShotStats | number; away: ShotStats | number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  offsides: { home: number; away: number };
  passes: { home: PassStats | number; away: PassStats | number };
  ballsPlayed: { home: number; away: number };
  ballsLost: { home: number; away: number };
  duels: { home: DuelStats | number; away: DuelStats | number };
  crosses: { home: CrossStats | number; away: CrossStats | number };
}

export interface MatchEvent {
  id: string;
  match_id: string;
  timestamp: number;
  event_type: string;
  event_data?: Record<string, any> | null;
  created_at?: string;
  tracker_id?: string | null;
  team_id?: string | null;
  player_id?: number | null;
  team?: 'home' | 'away';
  coordinates: { x: number; y: number };
  created_by?: string;
  type: EventType;
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
}
