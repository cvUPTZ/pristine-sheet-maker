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

export type UserRoleType = 'admin' | 'tracker' | 'viewer' | 'user' | 'manager' | 'teacher';

export interface Player {
  id: string | number;
  name: string;
  player_name?: string;
  position: string;
  number: number;
  jersey_number?: number;
  teamId?: string;
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
  total?: number;
}

export interface DuelStats {
  won?: number;
  total?: number;
}

export interface CrossStats {
  total?: number;
  successful?: number;
}

export interface PlayerStatistics {
  playerId: string | number;
  playerName: string;
  team: 'home' | 'away';
  teamId?: string;
  player?: Player;
  ballsPlayed?: number;
  ballsLost?: number;
  ballsRecovered?: number;
  passesCompleted?: number;
  passesAttempted?: number;
  possessionTime?: number;
  contacts?: number;
  lossRatio?: number;
  goals?: number;
  assists?: number;
  passes?: number;
  shots?: number;
  fouls?: number;
  events: {
    passes: { successful: number; attempted: number };
    shots: { onTarget: number; offTarget: number };
    tackles: { successful: number; attempted: number };
    fouls: number;
    cards: { yellow: number; red: number };
    goals: number;
    assists: number;
    [key: string]: any;
  };
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
  timestamp: number; // Keep as number for consistency
  event_type: string;
  type: EventType;
  event_data: Record<string, any>;
  created_at: string;
  tracker_id: string;
  team_id: string | null;
  player_id?: number | null;
  team?: 'home' | 'away';
  coordinates: { x: number; y: number };
  created_by: string;
}

export interface Match {
  id: string;
  name?: string | null;
  status: string;
  home_team_name: string;
  away_team_name: string;
  home_team_formation?: string | null;
  away_team_formation?: string | null;
  match_date?: string | null;
  location?: string | null;
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

export interface TrackerSyncEvent {
  trackerId: string;
  matchId: string;
  timestamp: number;
  eventType: 'tracker_status' | 'tracker_action';
  payload: {
    status?: 'active' | 'inactive' | 'paused';
    currentAction?: string;
  };
}

export interface AssignedPlayerForMatch {
  id: string | number;
  name: string;
  teamId: 'home' | 'away';
  teamName: string;
}

// Video Analysis Types
export interface VideoFormat {
  quality: string;
  format: string;
  size?: string; // Made optional as backend might not always provide it precisely
  url?: string; // URL for direct download if backend provides it
}

export interface VideoInfo {
  videoId: string;
  title: string;
  duration: number; // Duration in SECONDS
  thumbnail: string;
  formats: VideoFormat[];
}

export interface VideoSegment {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  duration: number;  // in seconds
  status: 'pending' | 'processing' | 'completed' | 'error';
  file?: File; // This would likely be a URL or identifier if segments are backend-managed
  fileName?: string; // If file is not on client
  size?: number;     // Estimated or actual size in bytes
  segmentUrl?: string; // URL to the processed segment on the backend/CDN
}

export interface AnalysisEvent {
  type: string;
  timestamp: number;
  confidence: number;
  [key: string]: any; // For other event-specific data
}

export interface BallPossessionStats {
  home: number;
  away: number;
}

export interface VideoStatistics {
  ballPossession?: BallPossessionStats;
  passes?: PassStats;
  shots?: number;
  [key: string]: any; // For other stats
}

export interface AnalysisResults {
  segmentId: string; // To link back to the original segment
  events: AnalysisEvent[];
  statistics: VideoStatistics;
  heatmapUrl?: string; // URL to the heatmap image
  playerTrackingDataUrl?: string; // URL to player tracking data
}

export interface ApiKeyInfo {
  hasYouTubeApiKey: boolean;
  hasGoogleColabApiKey: boolean; // Or whatever AI service key
}

// For ColabIntegration component's job tracking
export interface AnalysisJob {
  id: string; // Corresponds to VideoSegment.id
  segmentId: string;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: AnalysisResults; // Store results here
  error?: string;
  colabLogUrl?: string; // Link to a specific Colab output/log if applicable
}
