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
  isHeader?: boolean;
  hitPost?: boolean;
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
  | SupportPassEventData
  | OffensivePassEventData
  | BallLostEventData
  | ContactEventData
  | FreeKickEventData
  | SixMeterViolationEventData
  | PostHitEventData
  | AerialDuelWonEventData
  | AerialDuelLostEventData
  | DecisivePassEventData
  | SuccessfulCrossEventData
  | SuccessfulDribbleEventData
  | LongPassEventData
  | ForwardPassEventData
  | BackwardPassEventData
  | LateralPassEventData
  | GenericEventData; // GenericEventData should ideally be last or handled carefully

// New interfaces for additional event types

export interface SupportPassEventData {
  recipient_player_id?: number | string;
  end_coordinates?: { x: number; y: number };
  length?: number;
  angle?: number;
}

export interface OffensivePassEventData {
  recipient_player_id?: number | string;
  end_coordinates?: { x: number; y: number };
  length?: number;
  angle?: number;
  is_progressive?: boolean;
  to_final_third?: boolean;
}

export interface BallLostEventData {
  lost_by_player_id?: number | string;
  reason?: 'error' | 'tackle' | 'interception' | 'other' | string;
  subsequent_event_type?: string; // e.g., 'opponent_shot', 'opponent_throw_in'
}

export interface ContactEventData {
  opponent_player_id?: number | string;
  outcome?: 'ball_retained' | 'ball_lost' | 'foul_won' | 'foul_committed' | string;
  contact_type?: 'tackle_attempt' | 'shoulder_charge' | 'block' | 'other' | string;
}

export interface FreeKickEventData {
  is_direct?: boolean;
  shot_taken?: boolean; // If the free kick was a shot
  shot_event_data?: ShotEventData; // If a shot was taken, link to its data
  pass_event_data?: PassEventData; // If it was a pass
  reason?: string; // Reason for the free kick
}

export interface SixMeterViolationEventData {
  violating_player_id?: number | string; // Player who committed the violation
  violation_type?: 'encroachment' | 'illegal_block' | 'other' | string; // Type of 6m violation
}

export interface PostHitEventData {
  // Typically linked to a shot event, but can be standalone if needed for specific analysis
  shot_event_id?: string; // ID of the ShotEvent that hit the post
  player_id?: number | string; // Player who took the shot
  team_id?: string;
}

export interface AerialDuelWonEventData {
  opponent_player_id?: number | string;
  outcome?: 'retained_possession' | 'headed_to_teammate' | 'clearance' | 'flick_on' | string;
}

export interface AerialDuelLostEventData {
  opponent_player_id?: number | string;
  reason?: 'outjumped' | 'mistimed_jump' | 'foul_committed' | string;
}

export interface DecisivePassEventData {
  // Often a precursor to an assist or key pass leading to a shot
  recipient_player_id?: number | string;
  end_coordinates?: { x: number; y: number };
  pass_type?: 'through_ball' | 'cross' | 'cut_back' | 'long_ball' | string;
  creates_shot_opportunity?: boolean;
}

export interface SuccessfulCrossEventData {
  recipient_player_id?: number | string; // Player who received the cross
  cross_type?: 'whipped' | 'floated' | 'low' | 'ground' | string;
  outcome?: 'shot' | 'header_shot' | 'goal_assist' | 'retained_possession' | string;
  end_coordinates?: { x: number; y: number };
}

export interface SuccessfulDribbleEventData {
  opponent_beaten_id?: number | string; // Player dribbled past
  outcome?: 'shot_opportunity_created' | 'pass_opportunity_created' | 'advanced_play' | 'retained_possession' | string;
  distance?: number; // Distance covered during the dribble
}

export interface LongPassEventData {
  success: boolean;
  recipient_player_id?: number | string;
  end_coordinates?: { x: number; y: number };
  length: number; // Typically > 25-30 meters
  is_progressive?: boolean;
  to_final_third?: boolean;
  pass_type?: 'switch' | 'direct_ball_forward' | 'clearance_pass' | string;
}

export interface ForwardPassEventData {
  success: boolean;
  recipient_player_id?: number | string;
  end_coordinates?: { x: number; y: number };
  length?: number;
  is_progressive: true; // By definition
  pass_type?: 'ground_pass' | 'lobbed_pass' | string;
}

export interface BackwardPassEventData {
  success: boolean;
  recipient_player_id?: number | string;
  end_coordinates?: { x: number; y: number };
  length?: number;
  reason?: 'maintain_possession' | 'switch_play_via_back' | 'evade_pressure' | string;
}

export interface LateralPassEventData {
  success: boolean;
  recipient_player_id?: number | string;
  end_coordinates?: { x: number; y: number };
  length?: number;
  direction: 'left_to_right' | 'right_to_left';
  reason?: 'maintain_possession' | 'switch_play' | 'open_up_space' | string;
}
