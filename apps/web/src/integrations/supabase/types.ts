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
      agents: {
        Row: {
          calls_per_day: string
          created_at: string
          department: string
          discovered_at: string
          id: string
          model: string
          name: string
          owner: string
          reg_tags: string[]
          source: string
          status: string
          tier: number
        }
        Insert: {
          calls_per_day: string
          created_at?: string
          department: string
          discovered_at: string
          id: string
          model: string
          name: string
          owner: string
          reg_tags?: string[]
          source: string
          status: string
          tier: number
        }
        Update: {
          calls_per_day?: string
          created_at?: string
          department?: string
          discovered_at?: string
          id?: string
          model?: string
          name?: string
          owner?: string
          reg_tags?: string[]
          source?: string
          status?: string
          tier?: number
        }
        Relationships: []
      }
      audit_vault: {
        Row: {
          actor_display_name: string | null
          actor_id: string | null
          created_at: string
          hash: string
          id: string
          kind: string
          payload: Json
          ref: string
        }
        Insert: {
          actor_display_name?: string | null
          actor_id?: string | null
          created_at?: string
          hash: string
          id?: string
          kind: string
          payload?: Json
          ref: string
        }
        Update: {
          actor_display_name?: string | null
          actor_id?: string | null
          created_at?: string
          hash?: string
          id?: string
          kind?: string
          payload?: Json
          ref?: string
        }
        Relationships: []
      }
      discovery_stats: {
        Row: {
          covered: number
          description: string
          found: number
          new_7d: number
          source: string
          updated_at: string
        }
        Insert: {
          covered: number
          description: string
          found: number
          new_7d: number
          source: string
          updated_at?: string
        }
        Update: {
          covered?: number
          description?: string
          found?: number
          new_7d?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          surface: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          surface: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          surface?: string
        }
        Relationships: []
      }
      guardrail_events: {
        Row: {
          action: string
          agent_id: string | null
          agent_name: string
          category: string
          created_at: string
          id: string
          prompt: string
          reg_ref: string
          rule: string
          tier: number
          ts: string
          user_label: string
          user_trust: number
        }
        Insert: {
          action: string
          agent_id?: string | null
          agent_name: string
          category: string
          created_at?: string
          id: string
          prompt: string
          reg_ref: string
          rule: string
          tier: number
          ts?: string
          user_label: string
          user_trust: number
        }
        Update: {
          action?: string
          agent_id?: string | null
          agent_name?: string
          category?: string
          created_at?: string
          id?: string
          prompt?: string
          reg_ref?: string
          rule?: string
          tier?: number
          ts?: string
          user_label?: string
          user_trust?: number
        }
        Relationships: [
          {
            foreignKeyName: "guardrail_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_downloads: {
        Row: {
          created_at: string
          downloaded_by: string
          downloaded_by_name: string
          downloaded_by_role: Database["public"]["Enums"]["app_role"]
          evidence_hash: string
          exam_id: string
          id: string
          pack_hash: string
        }
        Insert: {
          created_at?: string
          downloaded_by: string
          downloaded_by_name: string
          downloaded_by_role: Database["public"]["Enums"]["app_role"]
          evidence_hash: string
          exam_id: string
          id?: string
          pack_hash: string
        }
        Update: {
          created_at?: string
          downloaded_by?: string
          downloaded_by_name?: string
          downloaded_by_role?: Database["public"]["Enums"]["app_role"]
          evidence_hash?: string
          exam_id?: string
          id?: string
          pack_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_downloads_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exams: {
        Row: {
          agent_count: number
          created_at: string
          event_count: number
          filename: string | null
          generation_ms: number | null
          hours: number
          id: string
          manifest: Json
          override_count: number
          pack_hash: string
          requested_at: string
          run_by: string
          run_by_name: string
          score: number
        }
        Insert: {
          agent_count: number
          created_at?: string
          event_count: number
          filename?: string | null
          generation_ms?: number | null
          hours: number
          id?: string
          manifest?: Json
          override_count: number
          pack_hash: string
          requested_at?: string
          run_by: string
          run_by_name: string
          score: number
        }
        Update: {
          agent_count?: number
          created_at?: string
          event_count?: number
          filename?: string | null
          generation_ms?: number | null
          hours?: number
          id?: string
          manifest?: Json
          override_count?: number
          pack_hash?: string
          requested_at?: string
          run_by?: string
          run_by_name?: string
          score?: number
        }
        Relationships: []
      }
      outcome_kpis: {
        Row: {
          id: string
          kpi_key: string
          measured_at: string
          outcome_key: string
          unit: string
          value: number
          window_label: string
        }
        Insert: {
          id?: string
          kpi_key: string
          measured_at?: string
          outcome_key: string
          unit?: string
          value: number
          window_label?: string
        }
        Update: {
          id?: string
          kpi_key?: string
          measured_at?: string
          outcome_key?: string
          unit?: string
          value?: number
          window_label?: string
        }
        Relationships: []
      }
      override_events: {
        Row: {
          created_at: string
          event_id: string
          evidence_hash: string
          id: string
          justification: string
          user_display_name: string
          user_id: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          event_id: string
          evidence_hash: string
          id?: string
          justification: string
          user_display_name: string
          user_id: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          event_id?: string
          evidence_hash?: string
          id?: string
          justification?: string
          user_display_name?: string
          user_id?: string
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "override_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "guardrail_events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          display_name: string
          id: string
          trust_score: number
        }
        Insert: {
          created_at?: string
          department?: string | null
          display_name: string
          id: string
          trust_score?: number
        }
        Update: {
          created_at?: string
          department?: string | null
          display_name?: string
          id?: string
          trust_score?: number
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
      app_role: "ciso" | "md" | "analyst"
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
      app_role: ["ciso", "md", "analyst"],
    },
  },
} as const
