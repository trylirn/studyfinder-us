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
      clinic_claims: {
        Row: {
          clinic_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          note: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_claims_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_images: {
        Row: {
          alt: string | null
          clinic_id: string
          created_at: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_images_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          city: string | null
          claim_status: string
          claimed_by: string | null
          created_at: string
          description: string | null
          equipment: string[]
          featured_until: string | null
          gallery_images: string[]
          hero_image: string | null
          id: string
          intake_email: string | null
          intake_webhook_url: string | null
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          plan: string
          published: boolean
          recruiting_count: number
          slug: string
          specialties: string[]
          state: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          claim_status?: string
          claimed_by?: string | null
          created_at?: string
          description?: string | null
          equipment?: string[]
          featured_until?: string | null
          gallery_images?: string[]
          hero_image?: string | null
          id?: string
          intake_email?: string | null
          intake_webhook_url?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          plan?: string
          published?: boolean
          recruiting_count?: number
          slug: string
          specialties?: string[]
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          claim_status?: string
          claimed_by?: string | null
          created_at?: string
          description?: string | null
          equipment?: string[]
          featured_until?: string | null
          gallery_images?: string[]
          hero_image?: string | null
          id?: string
          intake_email?: string | null
          intake_webhook_url?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          plan?: string
          published?: boolean
          recruiting_count?: number
          slug?: string
          specialties?: string[]
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      condition_views: {
        Row: {
          condition_slug: string
          count: number
          day: string
        }
        Insert: {
          condition_slug: string
          count?: number
          day?: string
        }
        Update: {
          condition_slug?: string
          count?: number
          day?: string
        }
        Relationships: []
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
      lead_delivery_log: {
        Row: {
          channel: string
          clinic_id: string | null
          delivered_at: string
          error: string | null
          id: string
          nct_id: string
          status: string
        }
        Insert: {
          channel: string
          clinic_id?: string | null
          delivered_at?: string
          error?: string | null
          id?: string
          nct_id: string
          status: string
        }
        Update: {
          channel?: string
          clinic_id?: string | null
          delivered_at?: string
          error?: string | null
          id?: string
          nct_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_delivery_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city: string | null
          city_slug: string | null
          clinic_id: string | null
          country: string | null
          facility: string | null
          id: number
          lat: number | null
          lng: number | null
          nct_id: string
          state: string | null
          state_slug: string | null
          status: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          city_slug?: string | null
          clinic_id?: string | null
          country?: string | null
          facility?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          nct_id: string
          state?: string | null
          state_slug?: string | null
          status?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          city_slug?: string | null
          clinic_id?: string | null
          country?: string | null
          facility?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          nct_id?: string
          state?: string | null
          state_slug?: string | null
          status?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
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
      study_simplifications: {
        Row: {
          created_at: string
          id: string
          model: string
          nct_id: string
          section: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          model: string
          nct_id: string
          section: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string
          nct_id?: string
          section?: string
          text?: string
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
      bump_condition_view: { Args: { _slug: string }; Returns: undefined }
      generate_clinics_from_locations: {
        Args: never
        Returns: {
          inserted_count: number
          linked_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      nearby_sites: {
        Args: {
          _lat: number
          _lng: number
          _nct_id?: string
          _radius_mi: number
        }
        Returns: {
          city: string
          clinic_id: string
          distance_mi: number
          facility: string
          id: number
          lat: number
          lng: number
          nct_id: string
          state: string
          status: string
          zip: string
        }[]
      }
      refresh_directory_counts: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "clinic_admin"
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
      app_role: ["admin", "clinic_admin"],
    },
  },
} as const
