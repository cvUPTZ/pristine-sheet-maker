export interface Statistics {
  home: TeamStats;
  away: TeamStats;
}

export interface TeamStats {
  passes: number;
  shots: number;
  tackles: number;
  fouls: number;
  possession: number;
}

export interface TimeSegmentStatistics {
  startTime: number;
  endTime: number;
  events?: any[];
}

export interface Player {
  id: number;
  name: string;
  position: { x: number; y: number };
  [key: string]: any; // Allow additional properties for JSON compatibility
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  formation: string;
}

export interface Match {
  id: string;
  name?: string;
  description?: string;
  home_team_name: string;
  away_team_name: string;
  home_team_formation?: string;
  away_team_formation?: string;
  status: string;
  match_date: string;
  created_at: string;
  home_team_players?: Player[];
  away_team_players?: Player[];
}

export type EventType = 
  | 'pass' | 'shot' | 'tackle' | 'foul' | 'corner' | 'offside' | 'goal'
  | 'assist' | 'yellowCard' | 'redCard' | 'substitution' | 'card'
  | 'penalty' | 'free-kick' | 'goal-kick' | 'throw-in' | 'interception'
  | 'possession' | 'ballLost' | 'ballRecovered' | 'dribble' | 'cross'
  | 'clearance' | 'block' | 'save' | 'ownGoal' | 'freeKick' | 'throwIn'
  | 'goalKick' | 'aerialDuel' | 'groundDuel';
