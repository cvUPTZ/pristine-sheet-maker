
export interface Statistics {
  possession?: { home: number; away: number };
  shots?: { 
    home: { onTarget: number; offTarget: number; total: number }; 
    away: { onTarget: number; offTarget: number; total: number }; 
  };
  shotsOnTarget?: { home: number; away: number };
  passes?: { 
    home: { successful: number; attempted: number }; 
    away: { successful: number; attempted: number }; 
  };
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

export interface Team {
  id: string;
  name: string;
  players: Player[];
  formation?: string;
  color?: string;
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
  fx?: number;
  fy?: number;
}

export interface TimeSegmentStatistics {
  timeSegment: string;
  startTime: number;
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

// Match interface for admin management
export interface Match {
  id: string;
  name: string;
  status: string;
  match_date: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_formation: string | null;
  away_team_formation: string | null;
  home_team_score: number | null;
  away_team_score: number | null;
  home_team_players: any[];
  away_team_players: any[];
  venue?: string;
  location?: string;
  competition?: string;
  created_at: string;
  updated_at: string | null;
}

// Add missing types
export type EventType = 
  | 'pass' | 'shot' | 'tackle' | 'foul' | 'corner' | 'offside' | 'goal'
  | 'assist' | 'yellowCard' | 'redCard' | 'substitution' | 'card'
  | 'penalty' | 'free-kick' | 'goal-kick' | 'throw-in' | 'interception'
  | 'possession' | 'ballLost' | 'ballRecovered' | 'dribble' | 'cross'
  | 'clearance' | 'block' | 'save' | 'ownGoal' | 'freeKick' | 'throwIn'
  | 'goalKick' | 'aerialDuel' | 'groundDuel';

export interface MatchEvent {
  id: string;
  type: EventType;
  timestamp: number;
  team: 'home' | 'away';
  player?: Player;
  coordinates?: { x: number; y: number };
  description?: string;
}

export interface TimelineEvent {
  id: string;
  type: EventType;
  timestamp: number;
  team: 'home' | 'away';
  player?: Player;
  coordinates?: { x: number; y: number };
  description?: string;
}

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2' | '3-4-3';

export interface NotificationSettings {
  trackerAssigned: boolean;
  matchStarts: boolean;
  matchEnds: boolean;
  customMessage?: string;
}

export interface TrackerAssignmentDetails {
  eventCategories: string[];
  specificEvents: string[];
  assignedPlayers: {
    home: number[];
    away: number[];
  };
  notificationSettings: NotificationSettings;
}

export interface PlayerStatsTableProps {
  events: MatchEvent[];
  homeTeam: Team;
  awayTeam: Team;
}

export interface MatchEventsTimelineProps {
  events: MatchEvent[];
  onEventSelect?: (event: MatchEvent) => void;
  onEventUpdate?: (event: MatchEvent) => void;
  onEventDelete: (eventId: string) => Promise<void>;
}

export type UserRoleType = 'admin' | 'user' | 'tracker' | 'teacher';
