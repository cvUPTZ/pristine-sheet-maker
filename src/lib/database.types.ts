
export type Database = {
  public: {
    Tables: {
      matches: {
        Row: {
          id: string;
          name: string | null;
          status: string;
          match_date: string;
          home_team_name: string;
          away_team_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          status?: string;
          match_date?: string;
          home_team_name: string;
          away_team_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          status?: string;
          match_date?: string;
          home_team_name?: string;
          away_team_name?: string;
          created_at?: string;
        };
      };
      match_events: {
        Row: {
          id: string;
          match_id: string;
          event_type_key: string;
          player_roster_id: string | null;
          team_context: string | null;
          created_at: string;
          event_data: any;
        };
        Insert: {
          id?: string;
          match_id: string;
          event_type_key: string;
          player_roster_id?: string | null;
          team_context?: string | null;
          created_at?: string;
          event_data?: any;
        };
        Update: {
          id?: string;
          match_id?: string;
          event_type_key?: string;
          player_roster_id?: string | null;
          team_context?: string | null;
          created_at?: string;
          event_data?: any;
        };
      };
      match_rosters: {
        Row: {
          id: string;
          match_id: string;
          player_name: string;
          jersey_number: number;
          team_context: string;
          position: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_name: string;
          jersey_number: number;
          team_context: string;
          position: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_name?: string;
          jersey_number?: number;
          team_context?: string;
          position?: string;
        };
      };
    };
  };
};
