
export interface TrackerAssignment {
  id: string;
  match_id: string;
  tracker_user_id: string;
  player_id: number | null;
  player_team_id: string;
  assigned_event_types: string[];
  tracker_name: string;
  tracker_email: string;
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
    name: string | null;
    home_team_name: string;
    away_team_name: string;
  };
  profiles: {
    full_name: string | null;
    email: string | null;
  };
}

export interface MatrixData {
  match: {
    id: string;
    name: string;
    status: string;
    home_team_name: string;
    away_team_name: string;
    match_date: string | null;
  };
  generalTrackers: TrackerAssignment[];
  playerTrackers: TrackerAssignment[];
  eventTrackers: TrackerAssignment[];
  totalAssigned: number;
  replacementsDefined: number;
}
