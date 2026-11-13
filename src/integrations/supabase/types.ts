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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      inquiries: {
        Row: {
          contact_email: string
          contact_name: string
          created_at: string
          delivery_status: string
          expected_attendance: number | null
          id: string
          inquiry_type: string
          intended_use: string | null
          match_snapshot: Json | null
          message: string
          property_id: string
          proposed_budget: number | null
          proposed_end: string | null
          proposed_start: string | null
          requirements: Json | null
        }
        Insert: {
          contact_email: string
          contact_name: string
          created_at?: string
          delivery_status?: string
          expected_attendance?: number | null
          id?: string
          inquiry_type: string
          intended_use?: string | null
          match_snapshot?: Json | null
          message: string
          property_id: string
          proposed_budget?: number | null
          proposed_end?: string | null
          proposed_start?: string | null
          requirements?: Json | null
        }
        Update: {
          contact_email?: string
          contact_name?: string
          created_at?: string
          delivery_status?: string
          expected_attendance?: number | null
          id?: string
          inquiry_type?: string
          intended_use?: string | null
          match_snapshot?: Json | null
          message?: string
          property_id?: string
          proposed_budget?: number | null
          proposed_end?: string | null
          proposed_start?: string | null
          requirements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_submissions: {
        Row: {
          contact_email: string
          contact_name: string
          created_at: string
          id: string
          payload: Json
          review_status: string
        }
        Insert: {
          contact_email: string
          contact_name: string
          created_at?: string
          id?: string
          payload: Json
          review_status?: string
        }
        Update: {
          contact_email?: string
          contact_name?: string
          created_at?: string
          id?: string
          payload?: Json
          review_status?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          amenities: string[]
          amenities_unavailable: string[]
          available_from: string | null
          available_notes: string | null
          available_to: string | null
          capacity: number | null
          coord_precision: string
          created_at: string
          description: string | null
          flexible_negotiable: boolean | null
          id: string
          landlord_requirements: string[]
          last_verified: string
          lat: number | null
          lng: number | null
          min_duration_days: number | null
          name: string
          neighborhood: string | null
          owner_contact_authorized: boolean
          permitted_uses: string[]
          photo_url: string | null
          price_amount: number | null
          price_notes: string | null
          price_period: string | null
          prohibited_uses: string[]
          property_type: string | null
          published: boolean
          short_term_confirmed: boolean
          source_name: string
          source_url: string
          sqft_max: number | null
          sqft_min: number | null
          verification_status: string
        }
        Insert: {
          address: string
          amenities?: string[]
          amenities_unavailable?: string[]
          available_from?: string | null
          available_notes?: string | null
          available_to?: string | null
          capacity?: number | null
          coord_precision?: string
          created_at?: string
          description?: string | null
          flexible_negotiable?: boolean | null
          id: string
          landlord_requirements?: string[]
          last_verified: string
          lat?: number | null
          lng?: number | null
          min_duration_days?: number | null
          name: string
          neighborhood?: string | null
          owner_contact_authorized?: boolean
          permitted_uses?: string[]
          photo_url?: string | null
          price_amount?: number | null
          price_notes?: string | null
          price_period?: string | null
          prohibited_uses?: string[]
          property_type?: string | null
          published?: boolean
          short_term_confirmed?: boolean
          source_name: string
          source_url: string
          sqft_max?: number | null
          sqft_min?: number | null
          verification_status?: string
        }
        Update: {
          address?: string
          amenities?: string[]
          amenities_unavailable?: string[]
          available_from?: string | null
          available_notes?: string | null
          available_to?: string | null
          capacity?: number | null
          coord_precision?: string
          created_at?: string
          description?: string | null
          flexible_negotiable?: boolean | null
          id?: string
          landlord_requirements?: string[]
          last_verified?: string
          lat?: number | null
          lng?: number | null
          min_duration_days?: number | null
          name?: string
          neighborhood?: string | null
          owner_contact_authorized?: boolean
          permitted_uses?: string[]
          photo_url?: string | null
          price_amount?: number | null
          price_notes?: string | null
          price_period?: string | null
          prohibited_uses?: string[]
          property_type?: string | null
          published?: boolean
          short_term_confirmed?: boolean
          source_name?: string
          source_url?: string
          sqft_max?: number | null
          sqft_min?: number | null
          verification_status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
