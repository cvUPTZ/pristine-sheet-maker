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
      match_events: {
        Row: {
          coordinates: Json | null
          created_at: string
          created_by: string
          event_type: string
          id: string
          match_id: string
          player_id: number | null
          team: string | null
          timestamp: number | null
        }
        Insert: {
          coordinates?: Json | null
          created_at?: string
          created_by: string
          event_type: string
          id?: string
          match_id: string
          player_id?: number | null
          team?: string | null
          timestamp?: number | null
        }
        Update: {
          coordinates?: Json | null
          created_at?: string
          created_by?: string
          event_type?: string
          id?: string
          match_id?: string
          player_id?: number | null
          team?: string | null
          timestamp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      match_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          match_id: string
          message: string
          tracker_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          match_id: string
          message: string
          tracker_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          match_id?: string
          message?: string
          tracker_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_notifications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_tracker_assignments: {
        Row: {
          created_at: string
          id: string
          match_id: string
          player_id: number
          player_team_id: string
          tracker_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          player_id: number
          player_team_id: string
          tracker_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          player_id?: number
          player_team_id?: string
          tracker_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_tracker_assignments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_tracker_assignments_tracker_user_id_fkey"
            columns: ["tracker_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_team_formation: string | null
          away_team_name: string
          away_team_players: Json | null
          ball_tracking_data: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          home_team_formation: string | null
          home_team_name: string
          home_team_players: Json | null
          id: string
          match_date: string | null
          match_statistics: Json | null
          name: string | null
          status: string
          timer_current_value: number | null
          timer_last_started_at: string | null
          timer_status: string | null
          updated_at: string | null
        }
        Insert: {
          away_team_formation?: string | null
          away_team_name: string
          away_team_players?: Json | null
          ball_tracking_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          home_team_formation?: string | null
          home_team_name: string
          home_team_players?: Json | null
          id?: string
          match_date?: string | null
          match_statistics?: Json | null
          name?: string | null
          status?: string
          timer_current_value?: number | null
          timer_last_started_at?: string | null
          timer_status?: string | null
          updated_at?: string | null
        }
        Update: {
          away_team_formation?: string | null
          away_team_name?: string
          away_team_players?: Json | null
          ball_tracking_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          home_team_formation?: string | null
          home_team_name?: string
          home_team_players?: Json | null
          id?: string
          match_date?: string | null
          match_statistics?: Json | null
          name?: string | null
          status?: string
          timer_current_value?: number | null
          timer_last_started_at?: string | null
          timer_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          match_id: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      references: {
        Row: {
          citation_style: string | null
          citation_text: string
          created_at: string
          id: string
          thesis_id: string
        }
        Insert: {
          citation_style?: string | null
          citation_text: string
          created_at?: string
          id?: string
          thesis_id: string
        }
        Update: {
          citation_style?: string | null
          citation_text?: string
          created_at?: string
          id?: string
          thesis_id?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          image_url: string | null
          location: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          location: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tracker_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          event_category: string
          id: string
          tracker_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_category: string
          id?: string
          tracker_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_category?: string
          id?: string
          tracker_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracker_assignments_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
      user_event_assignments: {
        Row: {
          created_at: string | null
          event_type: string
          id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_event_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_role"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_profiles_with_role: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
          role: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_tracker_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          full_name: string
          email: string
        }[]
      }
      get_tracker_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          full_name: string
          email: string
        }[]
      }
      get_trackers_with_email: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          full_name: string
          email: string
          created_at: string
          updated_at: string
        }[]
      }
      get_user_role: {
        Args: { user_id_param: string }
        Returns: string
      }
      is_admin: {
        Args: { p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "teacher" | "user" | "tracker"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "teacher", "user", "tracker"],
    },
  },
} as const
