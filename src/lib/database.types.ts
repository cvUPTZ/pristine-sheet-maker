
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      matches: {
        Row: {
          id: string;
          name: string | null;
          status: string;
          match_date: string | null;
          home_team_name: string;
          away_team_name: string;
          home_team_formation: string | null;
          away_team_formation: string | null;
          home_team_players: Json;
          away_team_players: Json;
          created_at: string;
          updated_at: string | null;
          created_by: string | null;
          description: string | null;
          notes: string | null;
          competition: string | null;
          location: string | null;
          match_type: string | null;
          home_team_score: number | null;
          away_team_score: number | null;
          timer_status: string | null;
          timer_current_value: number | null;
          timer_last_started_at: string | null;
          match_statistics: Json;
          ball_tracking_data: Json;
        };
        Insert: {
          id?: string;
          name?: string | null;
          status?: string;
          match_date?: string | null;
          home_team_name: string;
          away_team_name: string;
          home_team_formation?: string | null;
          away_team_formation?: string | null;
          home_team_players?: Json;
          away_team_players?: Json;
          created_at?: string;
          updated_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          notes?: string | null;
          competition?: string | null;
          location?: string | null;
          match_type?: string | null;
          home_team_score?: number | null;
          away_team_score?: number | null;
          timer_status?: string | null;
          timer_current_value?: number | null;
          timer_last_started_at?: string | null;
          match_statistics?: Json;
          ball_tracking_data?: Json;
        };
        Update: {
          id?: string;
          name?: string | null;
          status?: string;
          match_date?: string | null;
          home_team_name?: string;
          away_team_name?: string;
          home_team_formation?: string | null;
          away_team_formation?: string | null;
          home_team_players?: Json;
          away_team_players?: Json;
          created_at?: string;
          updated_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          notes?: string | null;
          competition?: string | null;
          location?: string | null;
          match_type?: string | null;
          home_team_score?: number | null;
          away_team_score?: number | null;
          timer_status?: string | null;
          timer_current_value?: number | null;
          timer_last_started_at?: string | null;
          match_statistics?: Json;
          ball_tracking_data?: Json;
        };
        Relationships: [];
      };
      match_events: {
        Row: {
          id: string;
          match_id: string;
          event_type: string;
          timestamp: number | null;
          player_id: number | null;
          team: string | null;
          coordinates: Json;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          event_type: string;
          timestamp?: number | null;
          player_id?: number | null;
          team?: string | null;
          coordinates?: Json;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          event_type?: string;
          timestamp?: number | null;
          player_id?: number | null;
          team?: string | null;
          coordinates?: Json;
          created_at?: string;
          created_by?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never;
