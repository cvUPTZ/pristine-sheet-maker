
export interface TrackerUser {
  id: string;
  email: string;
  full_name: string;
}

export interface Assignment {
  id: string;
  tracker_user_id: string;
  player_id: number | null;
  player_team_id: 'home' | 'away' | null;
  assigned_event_types: string[] | null;
  tracker_name?: string;
  tracker_email?: string;
}

export interface Player {
  id: number;
  jersey_number: number;
  player_name: string;
  team?: 'home' | 'away';
}

export const EVENT_TYPES = [
  'pass', 'shot', 'goal', 'foul', 'card', 'substitution',
  'corner', 'throw_in', 'offside', 'tackle', 'interception',
  'cross', 'header', 'save', 'clearance'
];
