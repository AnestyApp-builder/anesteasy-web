import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      payments: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          due_date: string | null
          external_payment_id: string | null
          id: string
          metadata: Json | null
          payment_date: string | null
          payment_method: string
          payment_status: string | null
          payment_type: string
          procedure_id: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          external_payment_id?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method: string
          payment_status?: string | null
          payment_type: string
          procedure_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          external_payment_id?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string
          payment_status?: string | null
          payment_type?: string
          procedure_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          anesthesiologist_name: string | null
          carteirinha: string | null
          convenio: string | null
          created_at: string | null
          data_cirurgia: string | null
          data_nascimento: string | null
          duracao_minutos: number | null
          duration_minutes: number | null
          especialidade_cirurgiao: string | null
          fichas_anestesicas: Json | null
          forma_pagamento: string | null
          hora_inicio: string | null
          hora_termino: string | null
          hospital_clinic: string | null
          id: string
          nome_cirurgiao: string | null
          notes: string | null
          observacoes_financeiras: string | null
          patient_age: number | null
          patient_gender: string | null
          patient_name: string | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          procedure_date: string
          procedure_name: string
          procedure_time: string | null
          procedure_type: string
          procedure_value: number
          room_number: string | null
          surgeon_name: string | null
          tipo_anestesia: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          anesthesiologist_name?: string | null
          carteirinha?: string | null
          convenio?: string | null
          created_at?: string | null
          data_cirurgia?: string | null
          data_nascimento?: string | null
          duracao_minutos?: number | null
          duration_minutes?: number | null
          especialidade_cirurgiao?: string | null
          fichas_anestesicas?: Json | null
          forma_pagamento?: string | null
          hora_inicio?: string | null
          hora_termino?: string | null
          hospital_clinic?: string | null
          id?: string
          nome_cirurgiao?: string | null
          notes?: string | null
          observacoes_financeiras?: string | null
          patient_age?: number | null
          patient_gender?: string | null
          patient_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          procedure_date: string
          procedure_name: string
          procedure_time?: string | null
          procedure_type: string
          procedure_value: number
          room_number?: string | null
          surgeon_name?: string | null
          tipo_anestesia?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          anesthesiologist_name?: string | null
          carteirinha?: string | null
          convenio?: string | null
          created_at?: string | null
          data_cirurgia?: string | null
          data_nascimento?: string | null
          duracao_minutos?: number | null
          duration_minutes?: number | null
          especialidade_cirurgiao?: string | null
          fichas_anestesicas?: Json | null
          forma_pagamento?: string | null
          hora_inicio?: string | null
          hora_termino?: string | null
          hospital_clinic?: string | null
          id?: string
          nome_cirurgiao?: string | null
          notes?: string | null
          observacoes_financeiras?: string | null
          patient_age?: number | null
          patient_gender?: string | null
          patient_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          procedure_date?: string
          procedure_name?: string
          procedure_time?: string | null
          procedure_type?: string
          procedure_value?: number
          room_number?: string | null
          surgeon_name?: string | null
          tipo_anestesia?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          average_procedure_value: number | null
          created_at: string | null
          end_date: string
          generated_at: string | null
          id: string
          most_common_procedure: string | null
          report_data: Json | null
          report_name: string
          report_type: string
          start_date: string
          total_paid: number | null
          total_pending: number | null
          total_procedures: number | null
          total_revenue: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_procedure_value?: number | null
          created_at?: string | null
          end_date: string
          generated_at?: string | null
          id?: string
          most_common_procedure?: string | null
          report_data?: Json | null
          report_name: string
          report_type: string
          start_date: string
          total_paid?: number | null
          total_pending?: number | null
          total_procedures?: number | null
          total_revenue?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_procedure_value?: number | null
          created_at?: string | null
          end_date?: string
          generated_at?: string | null
          id?: string
          most_common_procedure?: string | null
          report_data?: Json | null
          report_name?: string
          report_type?: string
          start_date?: string
          total_paid?: number | null
          total_pending?: number | null
          total_procedures?: number | null
          total_revenue?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_backup: boolean | null
          backup_frequency: string | null
          created_at: string | null
          currency: string | null
          dashboard_layout: Json | null
          date_format: string | null
          default_procedure_duration: number | null
          id: string
          language: string | null
          notifications_email: boolean | null
          notifications_push: boolean | null
          notifications_sms: boolean | null
          theme: string | null
          time_format: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_backup?: boolean | null
          backup_frequency?: string | null
          created_at?: string | null
          currency?: string | null
          dashboard_layout?: Json | null
          date_format?: string | null
          default_procedure_duration?: number | null
          id?: string
          language?: string | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          notifications_sms?: boolean | null
          theme?: string | null
          time_format?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_backup?: boolean | null
          backup_frequency?: string | null
          created_at?: string | null
          currency?: string | null
          dashboard_layout?: Json | null
          date_format?: string | null
          default_procedure_duration?: number | null
          id?: string
          language?: string | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          notifications_sms?: boolean | null
          theme?: string | null
          time_format?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          crm: string | null
          email: string
          id: string
          last_login_at: string | null
          name: string
          password_hash: string
          phone: string | null
          specialty: string
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          crm?: string | null
          email: string
          id?: string
          last_login_at?: string | null
          name: string
          password_hash: string
          phone?: string | null
          specialty?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          crm?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          name?: string
          password_hash?: string
          phone?: string | null
          specialty?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_monthly_report: {
        Args: { report_month: string; user_uuid: string }
        Returns: Json
      }
      get_user_stats: {
        Args: { user_uuid: string }
        Returns: Json
      }
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
    Enums: {},
  },
} as const