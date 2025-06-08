// src/types/eventData.ts

/**
 * Represents the data associated with a shot event.
 */
export interface ShotEventData {
  on_target: boolean;
  is_goal?: boolean; // Optional: can be a separate 'goal' event or an attribute of a shot.
                   // If a shot results in a goal, this could be true.
  body_part_used?: 'right_foot' | 'left_foot' | 'head' | 'other';
  assist_type?: 'through_ball' | 'cross' | 'pull_back' | 'set_piece' | 'rebound' | 'none' | string; // string for flexibility if new types emerge
  situation?: 'open_play' | 'fast_break' | 'corner_related' | 'free_kick_related' | 'penalty' | string;
  shot_type?: 'normal' | 'volley' | 'half_volley' | 'lob' | 'header' | string;
  xg_value?: number; // Expected Goal value, can be populated later by a model
}

/**
 * Represents data for a pressure event.
 */
export interface PressureEventData {
  outcome: 'regain_possession' | 'forced_turnover_error' | 'forced_pass_backwards' | 'no_effect' | 'foul_won' | string;
  target_player_id?: number | string; // Player being pressured
  pressure_type?: 'direct' | 'closing_down' | 'counter_pressure' | string; // Optional detail
}

/**
 * Represents data for a dribble attempt event.
 */
export interface DribbleAttemptEventData {
  success: boolean;
  outcome?: 'beat_opponent' | 'tackled' | 'ball_out_of_play' | 'possession_lost' | 'foul_won' | string;
  distance_covered?: number; // Optional
}

/**
 * Represents data for a ball recovery event (general recovery, not tackle/interception).
 */
export interface BallRecoveryEventData {
  recovery_type?: 'loose_ball' | 'second_ball' | string;
  subsequent_action?: 'pass_forward' | 'dribble' | 'held_possession' | string; // Optional
}

/**
 * Represents the data associated with a pass event.
 */
export interface PassEventData {
  success: boolean;
  recipient_player_id?: number | string;
  end_coordinates?: { x: number; y: number };
  pass_type?: 'short' | 'long' | 'cross' | 'through_ball' | 'cut_back' | 'header' | 'switch' | string;
  is_progressive?: boolean; // Can be calculated, but useful if manually tagged
  to_final_third?: boolean; // Can be calculated
  length?: number; // Pass length, can be calculated
  angle?: number; // Pass angle, can be calculated
}

/**
 * Represents the data associated with a tackle event.
 */
export interface TackleEventData {
  success: boolean;
  outcome?: 'regain_possession' | 'ball_out_of_play_home' | 'ball_out_of_play_away' | 'foul_committed' | 'clearance' | string;
  is_last_man_tackle?: boolean;
}

/**
 * Represents the data associated with an interception event.
 */
export interface InterceptionEventData {
  outcome?: 'regain_possession_controlled' | 'clearance' | 'deflected_out' | string;
}

/**
 * Represents the data associated with a foul committed event.
 */
export interface FoulCommittedEventData {
  card_awarded?: 'yellow' | 'red' | 'none';
  reason?: string; // e.g., 'holding', 'dangerous_play'
  is_penalty_conceded?: boolean;
}

/**
 * Represents the data associated with a card event (yellow or red).
 * This can be used if 'yellowCard' or 'redCard' are distinct event types.
 */
export interface CardEventData {
  card_type: 'yellow' | 'red';
  reason?: string;
  // player_id is on MatchEvent itself
}

/**
 * Represents data for a substitution event.
 */
export interface SubstitutionEventData {
  player_out_id: number | string;
  player_in_id: number | string;
  reason?: 'tactical' | 'injury' | 'other' | string;
}

/**
 * Represents data for a generic event if no specific interface matches.
 * This can be used as a fallback.
 */
export interface GenericEventData extends Record<string, any> {}

/**
 * Union type for all possible event_data structures.
 * This will be used in the MatchEvent interface.
 */
export type MatchSpecificEventData =
  | ShotEventData
  | PassEventData
  | TackleEventData
  | InterceptionEventData
  | FoulCommittedEventData
  | CardEventData
  | SubstitutionEventData
  | PressureEventData      // New
  | DribbleAttemptEventData  // New
  | BallRecoveryEventData    // New
  | GenericEventData; // GenericEventData should ideally be last or handled carefully
