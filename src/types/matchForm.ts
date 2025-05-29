
export interface MatchFormData {
  id?: string;
  name: string;
  match_type: string;
  home_team_name: string;
  away_team_name: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed';
  description: string;
}

export interface Formation {
  id: string;
  name: string;
  positions: Array<{
    id: number;
    x: number;
    y: number;
    position: string;
  }>;
}
