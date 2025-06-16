import { MatchSpecificEventData } from './eventData';

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
  | 'sub'
  | 'pressure'
  | 'dribble_attempt'
  | 'ball_recovery'
  | 'supportPass'
  | 'offensivePass'
  | 'ballLost'
  | 'ballRecovered'
  | 'contact'
  | 'freeKick'
  | '6MeterViolation'
  | 'postHit'
  | 'aerialDuelWon'
  | 'aerialDuelLost'
  | 'decisivePass'
  | 'successfulCross'
  | 'successfulDribble'
  | 'longPass'
  | 'forwardPass'
  | 'backwardPass'
  | 'lateralPass';

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
  totalXg?: number;
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

export interface TeamDetailedStats {
  shots: number;
  shotsOnTarget: number;
  goals: number;
  assists: number;
  passesAttempted: number;
  passesCompleted: number;
  foulsCommitted: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  offsides: number;
  tackles: number;
  interceptions: number;
  crosses: number;
  clearances: number;
  blocks: number;
  possession: number;
  totalXg: number;
  supportPasses: number;
  offensivePasses: number;
  ballsRecovered: number;
  ballsLost: number;
  ballsPlayed: number;
  contacts: number;
  freeKicks: number;
  sixMeterViolations: number;
  possessionMinutes: number;
  possessionPercentage: number;
  dangerousFootShots: number;
  nonDangerousFootShots: number;
  footShotsOnTarget: number;
  footShotsOffTarget: number;
  footShotsPostHits: number;
  footShotsBlocked: number;
  dangerousHeaderShots: number;
  nonDangerousHeaderShots: number;
  headerShotsOnTarget: number;
  headerShotsOffTarget: number;
  headerShotsPostHits: number;
  headerShotsBlocked: number;
  duelsWon: number;
  duelsLost: number;
  aerialDuelsWon: number;
  aerialDuelsLost: number;
  decisivePasses: number;
  successfulCrosses: number;
  successfulDribbles: number;
  longPasses: number;
  forwardPasses: number;
  backwardPasses: number;
  lateralPasses: number;
}

export interface PlayerStatSummary {
  playerId: string | number;
  playerName: string;
  jerseyNumber?: number;
  team: 'home' | 'away';
  player?: Player;

  // Core stats - keeping simple number types for compatibility
  shots: number;
  shotsOnTarget: number;
  goals: number;
  assists: number;
  passesAttempted: number;
  passesCompleted: number;
  foulsCommitted: number;
  yellowCards: number;
  redCards: number;
  tackles: number;
  interceptions: number;
  crosses: number;
  clearances: number;
  blocks: number;
  dribbles: number;
  totalXg: number;

  // Advanced Passing
  progressivePasses: number;
  passesToFinalThird: number;
  passNetworkSent: Array<{ toPlayerId: string | number, count: number, successfulCount: number }>;
  supportPasses: number;
  decisivePasses: number;
  longPasses: number;
  forwardPasses: number;
  backwardPasses: number;
  lateralPasses: number;
  successfulCrosses: number;

  // Ball Handling
  ballsPlayed: number;
  ballsGiven: number;
  ballsReceived: number;
  ballsRecovered: number;
  contacts: number;
  possessionTime: number;

  // Pressure
  totalPressures: number;
  successfulPressures: number;
  pressureRegains: number;

  // Detailed Shooting
  dangerousFootShots: number;
  nonDangerousFootShots: number;
  footShotsOnTarget: number;
  footShotsOffTarget: number;
  footShotsPostHits: number;
  footShotsBlocked: number;
  dangerousHeaderShots: number;
  nonDangerousHeaderShots: number;
  headerShotsOnTarget: number;
  headerShotsOffTarget: number;
  headerShotsPostHits: number;
  headerShotsBlocked: number;

  // Duels
  duelsWon: number;
  duelsLost: number;
  aerialDuelsWon: number;
  aerialDuelsLost: number;

  successfulDribbles: number;
}

export interface PlayerStatistics extends PlayerStatSummary {}

export interface Statistics {
  home: TeamDetailedStats;
  away: TeamDetailedStats;
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
  event_data?: MatchSpecificEventData | null;
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
  relatedPlayerId?: string | number;
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
  size?: string;
  url?: string;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  duration: number;
  thumbnail: string;
  formats: VideoFormat[];
}

export interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  file?: File;
  fileName?: string;
  size?: number;
  segmentUrl?: string;
}

export interface AnalysisEvent {
  type: string;
  timestamp: number;
  confidence: number;
  [key: string]: any;
}

export interface BallPossessionStats {
  home: number;
  away: number;
}

export interface VideoStatistics {
  ballPossession?: BallPossessionStats;
  passes?: PassStats;
  shots?: number;
  [key: string]: any;
}

export interface AnalysisResults {
  segmentId: string;
  events: AnalysisEvent[];
  statistics: VideoStatistics;
  heatmapUrl?: string;
  playerTrackingDataUrl?: string;
}

export interface ApiKeyInfo {
  hasYouTubeApiKey: boolean;
  hasGoogleColabApiKey: boolean;
}

export interface AnalysisJob {
  id: string;
  segmentId: string;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: AnalysisResults;
  error?: string;
  colabLogUrl?: string;
}
