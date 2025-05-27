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
      chapters: {
        Row: {
          content: string | null
          created_at: string
          id: string
          order_number: number
          thesis_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          order_number: number
          thesis_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          order_number?: number
          thesis_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_thesis_id_fkey"
            columns: ["thesis_id"]
            isOneToOne: false
            referencedRelation: "theses"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_commands: {
        Row: {
          command_action: string
          command_description: string | null
          command_name: string
          command_type: string
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          command_action: string
          command_description?: string | null
          command_name: string
          command_type: string
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          command_action?: string
          command_description?: string | null
          command_name?: string
          command_type?: string
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_commands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: []
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
        Relationships: []
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
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "references_thesis_id_fkey"
            columns: ["thesis_id"]
            isOneToOne: false
            referencedRelation: "theses"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          reviewer_id: string
          status: string | null
          thesis_id: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          reviewer_id: string
          status?: string | null
          thesis_id: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          reviewer_id?: string
          status?: string | null
          thesis_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_thesis_id_fkey"
            columns: ["thesis_id"]
            isOneToOne: false
            referencedRelation: "theses"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          chapter_id: string
          content: string | null
          created_at: string
          id: string
          order_number: number
          title: string
          updated_at: string
        }
        Insert: {
          chapter_id: string
          content?: string | null
          created_at?: string
          id?: string
          order_number: number
          title: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          content?: string | null
          created_at?: string
          id?: string
          order_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      theses: {
        Row: {
          created_at: string
          field: string | null
          id: string
          status: string | null
          supervisor: string | null
          title: string | null
          university: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field?: string | null
          id?: string
          status?: string | null
          supervisor?: string | null
          title?: string | null
          university?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          field?: string | null
          id?: string
          status?: string | null
          supervisor?: string | null
          title?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
