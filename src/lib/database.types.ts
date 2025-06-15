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
          home_team_flag_url: string | null;
          away_team_flag_url: string | null;
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
          home_team_flag_url?: string | null;
          away_team_flag_url?: string | null;
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
          home_team_flag_url?: string | null;
          away_team_flag_url?: string | null;
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
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string | null;
          created_at: string;
          updated_at: string | null;
          custom_permissions: Json | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
          updated_at?: string | null;
          custom_permissions?: Json | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
          updated_at?: string | null;
          custom_permissions?: Json | null;
        };
        Relationships: [];
      };
      match_tracker_assignments: {
        Row: {
          id: string;
          match_id: string;
          tracker_user_id: string;
          player_id: number | null;
          player_team_id: string;
          assigned_event_types: string[] | null;
          created_at: string;
          updated_at: string | null;
          assigned_player_id: number | null;
          tracker_id?: string | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          tracker_user_id: string;
          player_id?: number | null;
          player_team_id: string;
          assigned_event_types?: string[] | null;
          created_at?: string;
          updated_at?: string | null;
          assigned_player_id?: number | null;
          tracker_id?: string | null;
        };
        Update: {
          id?: string;
          match_id?: string;
          tracker_user_id?: string;
          player_id?: number | null;
          player_team_id?: string;
          assigned_event_types?: string[] | null;
          created_at?: string;
          updated_at?: string | null;
          assigned_player_id?: number | null;
          tracker_id?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          match_id: string | null;
          type: string | null;
          title: string;
          message: string;
          notification_data: Json | null;
          is_read: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id?: string | null;
          type?: string | null;
          title: string;
          message: string;
          notification_data?: Json | null;
          is_read?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string | null;
          type?: string | null;
          title?: string;
          message?: string;
          notification_data?: Json | null;
          is_read?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      video_jobs: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          input_video_path: string;
          video_title: string | null;
          video_duration: number | null;
          result_data: Json | null;
          error_message: string | null;
          progress: number;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          input_video_path: string;
          video_title?: string | null;
          video_duration?: number | null;
          result_data?: Json | null;
          error_message?: string | null;
          progress?: number;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          input_video_path?: string;
          video_title?: string | null;
          video_duration?: number | null;
          result_data?: Json | null;
          error_message?: string | null;
          progress?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      voice_rooms: {
        Row: {
          id: string;
          match_id: string;
          name: string;
          description: string | null;
          max_participants: number;
          priority: number;
          permissions: string[];
          is_private: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          name: string;
          description?: string | null;
          max_participants?: number;
          priority?: number;
          permissions?: string[];
          is_private?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          match_id?: string;
          name?: string;
          description?: string | null;
          max_participants?: number;
          priority?: number;
          permissions?: string[];
          is_private?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      voice_room_participants: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          user_role: string;
          is_muted: boolean;
          is_speaking: boolean;
          joined_at: string;
          last_activity: string;
          connection_quality: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          user_role: string;
          is_muted?: boolean;
          is_speaking?: boolean;
          joined_at?: string;
          last_activity?: string;
          connection_quality?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          user_role?: string;
          is_muted?: boolean;
          is_speaking?: boolean;
          joined_at?: string;
          last_activity?: string;
          connection_quality?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'manager' | 'tracker' | 'teacher' | 'user' | 'viewer' | 'special' | string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'admin' | 'manager' | 'tracker' | 'teacher' | 'user' | 'viewer' | 'special' | string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'admin' | 'manager' | 'tracker' | 'teacher' | 'user' | 'viewer' | 'special' | string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_event_assignments: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      match_tracker_assignments_view: {
        Row: {
          id: string | null;
          match_id: string | null;
          tracker_user_id: string | null;
          player_id: number | null;
          player_team_id: string | null;
          assigned_event_types: string[] | null;
          created_at: string | null;
          updated_at: string | null;
          tracker_email: string | null;
          assigned_player_id: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_user_role_from_auth: {
        Args: {
          user_id_param: string;
        };
        Returns: string;
      };
    };
    Enums: {
      job_status: 'pending' | 'processing' | 'completed' | 'failed';
      user_role: 'admin' | 'manager' | 'tracker' | 'user' | 'special';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type UserRole = 'admin' | 'manager' | 'tracker' | 'teacher' | 'user' | 'viewer' | 'special' | string;

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
