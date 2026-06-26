export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cities: {
        Row: {
          name: string
          slug: string
          state_slug: string
          study_count: number
        }
        Insert: {
          name: string
          slug: string
          state_slug: string
          study_count?: number
        }
        Update: {
          name?: string
          slug?: string
          state_slug?: string
          study_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cities_state_slug_fkey"
            columns: ["state_slug"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["slug"]
          },
        ]
      }
      conditions: {
        Row: {
          name: string
          overview: string | null
          slug: string
          study_count: number
        }
        Insert: {
          name: string
          overview?: string | null
          slug: string
          study_count?: number
        }
        Update: {
          name?: string
          overview?: string | null
          slug?: string
          study_count?: number
        }
        Relationships: []
      }
      import_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: number
          inserted: number
          pages: number
          params: Json
          started_at: string
          status: string
          updated: number
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: number
          inserted?: number
          pages?: number
          params?: Json
          started_at?: string
          status?: string
          updated?: number
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: number
          inserted?: number
          pages?: number
          params?: Json
          started_at?: string
          status?: string
          updated?: number
        }
        Relationships: []
      }
      locations: {
        Row: {
          city: string | null
          city_slug: string | null
          country: string | null
          facility: string | null
          id: number
          nct_id: string
          state: string | null
          state_slug: string | null
          status: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          city_slug?: string | null
          country?: string | null
          facility?: string | null
          id?: number
          nct_id: string
          state?: string | null
          state_slug?: string | null
          status?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          city_slug?: string | null
          country?: string | null
          facility?: string | null
          id?: number
          nct_id?: string
          state?: string | null
          state_slug?: string | null
          status?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_nct_id_fkey"
            columns: ["nct_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["nct_id"]
          },
        ]
      }
      sponsors: {
        Row: {
          name: string
          slug: string
          study_count: number
        }
        Insert: {
          name: string
          slug: string
          study_count?: number
        }
        Update: {
          name?: string
          slug?: string
          study_count?: number
        }
        Relationships: []
      }
      states: {
        Row: {
          abbr: string
          name: string
          slug: string
          study_count: number
        }
        Insert: {
          abbr: string
          name: string
          slug: string
          study_count?: number
        }
        Update: {
          abbr?: string
          name?: string
          slug?: string
          study_count?: number
        }
        Relationships: []
      }
      studies: {
        Row: {
          brief_summary: string | null
          city_slugs: string[]
          collaborators: string[]
          completion_date: string | null
          condition_slugs: string[]
          conditions: string[]
          detailed_description: string | null
          eligibility: Json
          enrollment: number | null
          gender: string | null
          imported_at: string
          interventions: Json
          last_update_posted: string | null
          max_age_years: number | null
          min_age_years: number | null
          nct_id: string
          overall_status: string | null
          phase: string | null
          search_tsv: unknown
          sponsor_name: string | null
          sponsor_slug: string | null
          start_date: string | null
          state_slugs: string[]
          study_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brief_summary?: string | null
          city_slugs?: string[]
          collaborators?: string[]
          completion_date?: string | null
          condition_slugs?: string[]
          conditions?: string[]
          detailed_description?: string | null
          eligibility?: Json
          enrollment?: number | null
          gender?: string | null
          imported_at?: string
          interventions?: Json
          last_update_posted?: string | null
          max_age_years?: number | null
          min_age_years?: number | null
          nct_id: string
          overall_status?: string | null
          phase?: string | null
          search_tsv?: unknown
          sponsor_name?: string | null
          sponsor_slug?: string | null
          start_date?: string | null
          state_slugs?: string[]
          study_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          brief_summary?: string | null
          city_slugs?: string[]
          collaborators?: string[]
          completion_date?: string | null
          condition_slugs?: string[]
          conditions?: string[]
          detailed_description?: string | null
          eligibility?: Json
          enrollment?: number | null
          gender?: string | null
          imported_at?: string
          interventions?: Json
          last_update_posted?: string | null
          max_age_years?: number | null
          min_age_years?: number | null
          nct_id?: string
          overall_status?: string | null
          phase?: string | null
          search_tsv?: unknown
          sponsor_name?: string | null
          sponsor_slug?: string | null
          start_date?: string | null
          state_slugs?: string[]
          study_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
