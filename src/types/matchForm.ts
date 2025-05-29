
export interface MatchFormData {
  name: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed' | 'postponed' | 'cancelled';
  matchType: string;
  matchDate: string;
  location: string;
  competition: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamScore: number | null;
  awayTeamScore: number | null;
  notes: string;
}

export interface TrackerAssignment {
  trackerId: string;
  eventTypes: string[];
  playerIds: string[];
}
