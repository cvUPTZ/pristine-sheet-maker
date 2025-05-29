
export interface EventType {
  key: string;
  label: string;
}

export interface PlayerForPianoInput {
  id: string;
  player_name: string;
  jersey_number: number;
  team_context: string;
}

export interface AssignedPlayers {
  home: PlayerForPianoInput[];
  away: PlayerForPianoInput[];
}

export interface MatchRosterPlayer {
  id: string;
  player_name: string;
  jersey_number: number;
  team_context: string;
}

export interface DisplayableMatchEvent {
  id: string;
  event_type_key: string;
  event_type_label: string;
  player_name: string | null;
  player_jersey_number: number | null;
  team_context: string | null;
  created_at: string;
  event_data?: any;
  player_roster_id?: string;
  is_new: boolean;
}

export interface MatchEventPayload {
  id: string;
  event_type_key: string;
  player_roster_id?: string;
  team_context?: string;
  created_at: string;
  event_data?: any;
}
