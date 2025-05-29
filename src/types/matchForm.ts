
export interface MatchFormData {
  name: string;
  status: 'draft' | 'published' | 'live' | 'completed' | 'archived';
  matchType: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamScore: string;
  awayTeamScore: string;
  description: string;
  notes: string;
}

export interface TrackerAssignment {
  trackerId: string;
  eventTypes: string[];
  playerIds: string[];
}

export interface TrackerUser {
  id: string;
  full_name: string;
  email: string;
}

export interface NotificationSettings {
  sendOnAssignment: boolean;
  sendOnMatchStart: boolean;
  sendOnMatchEnd: boolean;
  customMessage?: string;
}
