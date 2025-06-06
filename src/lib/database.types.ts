
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
          id: string
          name: string | null
          status: string
          match_date: string | null
          home_team_name: string
          away_team_name: string
          home_team_formation: string | null
          away_team_formation: string | null
          home_team_color: string | null
          away_team_color: string | null
          match_duration: number | null
          created_at: string
          updated_at: string | null
          timer_status: string | null
          current_half: number | null
          elapsed_time: number | null
          home_score: number | null
          away_score: number | null
          notes: string | null
          weather: string | null
          venue: string | null
          referee: string | null
          assistant_referees: string[] | null
          fourth_official: string | null
          competition: string | null
          season: string | null
          matchday: number | null
          ball_tracking_data: Json
        }
        Insert: {
          id?: string
          name?: string | null
          status?: string
          match_date?: string | null
          home_team_name: string
          away_team_name: string
          home_team_formation?: string | null
          away_team_formation?: string | null
          home_team_color?: string | null
          away_team_color?: string | null
          match_duration?: number | null
          created_at?: string
          updated_at?: string | null
          timer_status?: string | null
          current_half?: number | null
          elapsed_time?: number | null
          home_score?: number | null
          away_score?: number | null
          notes?: string | null
          weather?: string | null
          venue?: string | null
          referee?: string | null
          assistant_referees?: string[] | null
          fourth_official?: string | null
          competition?: string | null
          season?: string | null
          matchday?: number | null
          ball_tracking_data?: Json
        }
        Update: {
          id?: string
          name?: string | null
          status?: string
          match_date?: string | null
          home_team_name?: string
          away_team_name?: string
          home_team_formation?: string | null
          away_team_formation?: string | null
          home_team_color?: string | null
          away_team_color?: string | null
          match_duration?: number | null
          created_at?: string
          updated_at?: string | null
          timer_status?: string | null
          current_half?: number | null
          elapsed_time?: number | null
          home_score?: number | null
          away_score?: number | null
          notes?: string | null
          weather?: string | null
          venue?: string | null
          referee?: string | null
          assistant_referees?: string[] | null
          fourth_official?: string | null
          competition?: string | null
          season?: string | null
          matchday?: number | null
          ball_tracking_data?: Json
        }
        Relationships: []
      }
      match_events: {
        Row: {
          id: string
          match_id: string
          event_type: string
          team: string | null
          player: string | null
          timestamp: string
          x_coordinate: number | null
          y_coordinate: number | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          event_type: string
          team?: string | null
          player?: string | null
          timestamp: string
          x_coordinate?: number | null
          y_coordinate?: number | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          event_type?: string
          team?: string | null
          player?: string | null
          timestamp?: string
          x_coordinate?: number | null
          y_coordinate?: number | null
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_tracker_assignments: {
        Row: {
          id: string
          match_id: string
          tracker_user_id: string
          player_id: string | null
          event_type: string | null
          assignment_type: string
          created_at: string
          updated_at: string | null
          replacement_tracker_id: string | null
        }
        Insert: {
          id?: string
          match_id: string
          tracker_user_id: string
          player_id?: string | null
          event_type?: string | null
          assignment_type?: string
          created_at?: string
          updated_at?: string | null
          replacement_tracker_id?: string | null
        }
        Update: {
          id?: string
          match_id?: string
          tracker_user_id?: string
          player_id?: string | null
          event_type?: string | null
          assignment_type?: string
          created_at?: string
          updated_at?: string | null
          replacement_tracker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_tracker_assignments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          created_at: string
          data: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          read?: boolean
          created_at?: string
          data?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          created_at?: string
          data?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_event_assignments: {
        Row: {
          id: string
          user_id: string
          event_type: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_rooms: {
        Row: {
          id: string
          match_id: string
          name: string
          description: string | null
          max_participants: number
          priority: number
          permissions: string[]
          is_private: boolean
          is_active: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          match_id: string
          name: string
          description?: string | null
          max_participants?: number
          priority?: number
          permissions?: string[]
          is_private?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          match_id?: string
          name?: string
          description?: string | null
          max_participants?: number
          priority?: number
          permissions?: string[]
          is_private?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_rooms_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_room_participants: {
        Row: {
          id: string
          room_id: string
          user_id: string
          joined_at: string
          left_at: string | null
          is_muted: boolean
          is_speaking: boolean
          permissions: string[]
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          joined_at?: string
          left_at?: string | null
          is_muted?: boolean
          is_speaking?: boolean
          permissions?: string[]
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          joined_at?: string
          left_at?: string | null
          is_muted?: boolean
          is_speaking?: boolean
          permissions?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "voice_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "voice_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      match_tracker_assignments_view: {
        Row: {
          id: string | null
          match_id: string | null
          tracker_user_id: string | null
          player_id: string | null
          event_type: string | null
          assignment_type: string | null
          created_at: string | null
          updated_at: string | null
          replacement_tracker_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role_from_auth: {
        Args: {
          user_id_param: string
        }
        Returns: string
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}

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
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

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
    : never
