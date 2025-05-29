
export interface MatchFormData {
  id?: string;
  name: string;
  match_type: string;
  home_team_name: string;
  away_team_name: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed';
  description: string;
  home_team_score?: number;
  away_team_score?: number;
  notes?: string;
  match_date?: string;
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

export interface FormationOption {
  value: string;
  label: string;
  formation: Formation;
}
