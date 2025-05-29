
import { Player } from './index';

export interface MatchFormData {
  name: string;
  description: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamPlayers: Player[];
  awayTeamPlayers: Player[];
  homeTeamFormation: string;
  awayTeamFormation: string;
  matchDate: string;
  location: string; // Changed from venue to location
  competition: string;
  status: string;
  matchType: string;
  homeTeamScore: string;
  awayTeamScore: string;
  notes: string;
}

export interface EventTypeCategory {
  key: string;
  label: string;
  color: string;
  events: EventType[];
}

export interface EventType {
  key: string;
  label: string;
  category?: string;
}
