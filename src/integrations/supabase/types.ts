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
      attendance: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          program_id: string
          recorded_by: string | null
          session_date: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          program_id: string
          recorded_by?: string | null
          session_date: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          program_id?: string
          recorded_by?: string | null
          session_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          email: string | null
          experience: string | null
          first_name: string
          hire_date: string
          id: string
          last_name: string
          notes: string | null
          phone: string
          specialty: string
          status: string
        }
        Insert: {
          email?: string | null
          experience?: string | null
          first_name: string
          hire_date?: string
          id?: string
          last_name: string
          notes?: string | null
          phone: string
          specialty: string
          status?: string
        }
        Update: {
          email?: string | null
          experience?: string | null
          first_name?: string
          hire_date?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string
          specialty?: string
          status?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          active: boolean
          content: string
          created_at: string
          id: string
          order_index: number
          section: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          id?: string
          order_index: number
          section: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          order_index?: number
          section?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          coach_id: string
          discipline: number
          evaluation_date: string
          id: string
          notes: string | null
          physical_fitness: number
          student_id: string
          tactical_understanding: number
          teamwork: number
          technical_skills: number
        }
        Insert: {
          coach_id: string
          discipline: number
          evaluation_date?: string
          id?: string
          notes?: string | null
          physical_fitness: number
          student_id: string
          tactical_understanding: number
          teamwork: number
          technical_skills: number
        }
        Update: {
          coach_id?: string
          discipline?: number
          evaluation_date?: string
          id?: string
          notes?: string | null
          physical_fitness?: number
          student_id?: string
          tactical_understanding?: number
          teamwork?: number
          technical_skills?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          description: string | null
          id: string
          payment_date: string
          payment_method: string
          recipient: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          category: string
          description?: string | null
          id?: string
          payment_date?: string
          payment_method: string
          recipient?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          category?: string
          description?: string | null
          id?: string
          payment_date?: string
          payment_method?: string
          recipient?: string | null
          reference_number?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          student_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          student_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          student_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          description: string | null
          id: string
          payment_date: string
          payment_method: string
          payment_type: string
          reference_number: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          amount: number
          description?: string | null
          id?: string
          payment_date?: string
          payment_method: string
          payment_type: string
          reference_number?: string | null
          status?: string
          student_id?: string | null
        }
        Update: {
          amount?: number
          description?: string | null
          id?: string
          payment_date?: string
          payment_method?: string
          payment_type?: string
          reference_number?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          coach_id: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      program_coaches: {
        Row: {
          coach_id: string
          id: string
          program_id: string
        }
        Insert: {
          coach_id: string
          id?: string
          program_id: string
        }
        Update: {
          coach_id?: string
          id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_coaches_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_coaches_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          age_group: string
          created_at: string
          description: string | null
          id: string
          max_students: number
          name: string
        }
        Insert: {
          age_group: string
          created_at?: string
          description?: string | null
          id?: string
          max_students?: number
          name: string
        }
        Update: {
          age_group?: string
          created_at?: string
          description?: string | null
          id?: string
          max_students?: number
          name?: string
        }
        Relationships: []
      }
      registration_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          day_of_week: string
          end_time: string
          id: string
          program_id: string
          start_time: string
        }
        Insert: {
          day_of_week: string
          end_time: string
          id?: string
          program_id: string
          start_time: string
        }
        Update: {
          day_of_week?: string
          end_time?: string
          id?: string
          program_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          birth_date: string
          coach_id: string | null
          first_name: string
          group_id: string | null
          id: string
          last_name: string
          notes: string | null
          parent_id: string | null
          parent_name: string
          parent_phone: string
          phone: string | null
          registration_date: string
          status: string
        }
        Insert: {
          address?: string | null
          birth_date: string
          coach_id?: string | null
          first_name: string
          group_id?: string | null
          id?: string
          last_name: string
          notes?: string | null
          parent_id?: string | null
          parent_name: string
          parent_phone: string
          phone?: string | null
          registration_date?: string
          status?: string
        }
        Update: {
          address?: string | null
          birth_date?: string
          coach_id?: string | null
          first_name?: string
          group_id?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          parent_id?: string | null
          parent_name?: string
          parent_phone?: string
          phone?: string | null
          registration_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { permission_name: string }
        Returns: boolean
      }
      is_registration_active: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "coach" | "parent"
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
      user_role: ["admin", "coach", "parent"],
    },
  },
} as const
