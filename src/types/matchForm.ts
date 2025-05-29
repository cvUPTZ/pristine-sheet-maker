
export interface MatchFormData {
  name: string;
  status: 'draft' | 'published' | 'live' | 'completed' | 'archived';
  match_type: string;
  home_team_name: string;
  away_team_name: string;
  home_team_score: string;
  away_team_score: string;
  description: string;
  notes: string;
}

export interface TrackerAssignment {
  trackerId: string;
  eventTypes: string[];
  playerIds: string[];
}
