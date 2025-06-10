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
  totalXg?: number; // Added for team xG
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

// New interface to hold all detailed team statistics, mirroring eventAggregator.TeamStats
// Ensure PlayerStatSummary is defined/updated before TeamDetailedStats if it's referenced,
// or define it after Player if Player is used within it.
// For now, PlayerStatSummary (updated version of PlayerStatistics) will be defined below.

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
  crosses: number; // Attempted crosses
  clearances: number;
  blocks: number; // Defensive blocks
  possession: number; // Placeholder, might be calculated differently
  totalXg: number;
  supportPasses: number;
  offensivePasses: number;
  ballsRecovered: number;
  ballsLost: number;
  ballsPlayed: number;
  contacts: number;
  freeKicks: number;
  sixMeterViolations: number;
  possessionMinutes: number; // Placeholder
  possessionPercentage: number; // Placeholder
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

// This interface is being updated to match PlayerStatSummary from eventAggregator
export interface PlayerStatSummary { // Renaming for clarity or stick to PlayerStatistics and update its content
  playerId: string | number;
  playerName: string;
  jerseyNumber?: number;
  team: 'home' | 'away';
  player?: Player; // Keeping this as it's useful for direct access to full Player object

  // Core stats
  shots: number;
  shotsOnTarget: number;
  goals: number;
  assists: number;
  passesAttempted: number;
  passesCompleted: number;
  foulsCommitted: number;
  yellowCards: number;
  redCards: number;
  tackles: number; // Consider if this is successful tackles or total attempts
  interceptions: number;
  crosses: number; // Attempted crosses
  clearances: number;
  blocks: number; // Defensive blocks by player
  dribbles: number; // Could be successful or total - assume consistent with aggregator
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
  successfulCrosses: number; // Successful crosses by player

  // Ball Handling
  ballsPlayed: number;
  ballsGiven: number; // Equivalent to balls_lost by this player
  ballsReceived: number;
  ballsRecovered: number;
  contacts: number;
  possessionTime: number; // Individual possession time in seconds or appropriate unit

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

  successfulDribbles: number; // Successful dribbles by player
}

// The existing PlayerStatistics can be replaced or aliased if other parts of the app use it.
// For this subtask, we'll assume PlayerStatSummary is the new standard for aggregated player data.
// If `IndividualPlayerCharts` and other new components import `PlayerStatSummary` from `@/types`, this definition is key.
// If they import `PlayerStatistics`, then the `PlayerStatistics` interface should be updated with these fields.
// Let's update PlayerStatistics directly to avoid breaking existing imports if they use that name.

export interface PlayerStatistics extends PlayerStatSummary {} // Simple way to keep PlayerStatistics name with new fields
// Or, redefine PlayerStatistics completely:
/*
export interface PlayerStatistics {
  playerId: string | number;
  playerName: string;
  jerseyNumber?: number;
  team: 'home' | 'away';
  player?: Player;

  shots: number;
  shotsOnTarget: number;
  // ... all fields from PlayerStatSummary above
  lateralPasses: number;
}
*/


export interface Statistics {
  home: TeamDetailedStats;
  away: TeamDetailedStats;
  // Top-level possession can still exist if calculated separately,
  // or be part of TeamDetailedStats (as it is now).
  // For simplicity, if possession is in TeamDetailedStats, this can be removed.
  // Let's assume TeamDetailedStats.possession and TeamDetailedStats.possessionPercentage are the source.
  // So, the specific possession field below might be redundant.
  // possession: { home: number; away: number }; // Can be removed if covered by TeamDetailedStats
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
  event_data?: MatchSpecificEventData | null; // Updated line
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
