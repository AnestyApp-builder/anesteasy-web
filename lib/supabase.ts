import { createClient as createBrowserClient } from '@/utils/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'

// Criar cliente usando @supabase/ssr (apenas no browser)
const supabase = typeof window !== 'undefined' ? createBrowserClient() : (null as unknown as SupabaseClient)

export { supabase }

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
      admin_login_attempts: {
        Row: {
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          admin_user_id: string
          channel: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message_text: string
          status: string | null
          target_phone: string
          target_user_id: string
          whatsapp_message_id: string | null
        }
        Insert: {
          admin_user_id: string
          channel?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_text: string
          status?: string | null
          target_phone: string
          target_user_id: string
          whatsapp_message_id?: string | null
        }
        Update: {
          admin_user_id?: string
          channel?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_text?: string
          status?: string | null
          target_phone?: string
          target_user_id?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_messages_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      anestesista_secretaria: {
        Row: {
          anestesista_id: string
          created_at: string | null
          id: string
          secretaria_id: string
        }
        Insert: {
          anestesista_id: string
          created_at?: string | null
          id?: string
          secretaria_id: string
        }
        Update: {
          anestesista_id?: string
          created_at?: string | null
          id?: string
          secretaria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anestesista_secretaria_anestesista_id_fkey"
            columns: ["anestesista_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anestesista_secretaria_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      anestesistas: {
        Row: {
          cep: string | null
          cidade: string | null
          created_at: string | null
          crm: string
          data_nascimento: string | null
          email: string
          endereco: string | null
          especialidade: string | null
          estado: string | null
          id: string
          nome: string
          status: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          crm: string
          data_nascimento?: string | null
          email: string
          endereco?: string | null
          especialidade?: string | null
          estado?: string | null
          id: string
          nome: string
          status?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          crm?: string
          data_nascimento?: string | null
          email?: string
          endereco?: string | null
          especialidade?: string | null
          estado?: string | null
          id?: string
          nome?: string
          status?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          action: string
          app_version: string | null
          created_at: string | null
          device: string | null
          error_message: string
          id: string
          screen: string
          user_id: string | null
        }
        Insert: {
          action: string
          app_version?: string | null
          created_at?: string | null
          device?: string | null
          error_message: string
          id?: string
          screen: string
          user_id?: string | null
        }
        Update: {
          action?: string
          app_version?: string | null
          created_at?: string | null
          device?: string | null
          error_message?: string
          id?: string
          screen?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_links: {
        Row: {
          created_at: string | null
          email_cirurgiao: string
          expires_at: string
          id: string
          procedure_id: string | null
          responded_at: string | null
          telefone_cirurgiao: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email_cirurgiao: string
          expires_at: string
          id?: string
          procedure_id?: string | null
          responded_at?: string | null
          telefone_cirurgiao?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          email_cirurgiao?: string
          expires_at?: string
          id?: string
          procedure_id?: string | null
          responded_at?: string | null
          telefone_cirurgiao?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_links_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          anemia_transfusao: boolean
          cefaleia: boolean
          comentarios: string | null
          created_at: string | null
          dor_lombar: boolean
          feedback_link_id: string | null
          id: string
          nausea_vomito: boolean
          satisfacao: number | null
        }
        Insert: {
          anemia_transfusao: boolean
          cefaleia: boolean
          comentarios?: string | null
          created_at?: string | null
          dor_lombar: boolean
          feedback_link_id?: string | null
          id?: string
          nausea_vomito: boolean
          satisfacao?: number | null
        }
        Update: {
          anemia_transfusao?: boolean
          cefaleia?: boolean
          comentarios?: string | null
          created_at?: string | null
          dor_lombar?: boolean
          feedback_link_id?: string | null
          id?: string
          nausea_vomito?: boolean
          satisfacao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_feedback_link_id_fkey"
            columns: ["feedback_link_id"]
            isOneToOne: false
            referencedRelation: "feedback_links"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          reset_day: number
          target_value: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          reset_day?: number
          target_value?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          reset_day?: number
          target_value?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          invited_by: string | null
          joined_at: string
          role: string
          user_id: string
          quota_percent: number | null
          quota_since: string | null
          status: string | null
          invited_at: string | null
        }
        Insert: {
          group_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role: string
          user_id: string
          quota_percent?: number | null
          quota_since?: string | null
          status?: string | null
          invited_at?: string | null
        }
        Update: {
          group_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          user_id?: string
          quota_percent?: number | null
          quota_since?: string | null
          status?: string | null
          invited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          share_financials: boolean
          type: string | null
          cnpj: string | null
          google_sheets_id: string | null
          google_sheets_sync_enabled: boolean | null
          google_sheets_last_sync: string | null
        }
        Insert: {
          color: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          share_financials?: boolean
          type?: string | null
          cnpj?: string | null
          google_sheets_id?: string | null
          google_sheets_sync_enabled?: boolean | null
          google_sheets_last_sync?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          share_financials?: boolean
          type?: string | null
          cnpj?: string | null
          google_sheets_id?: string | null
          google_sheets_sync_enabled?: boolean | null
          google_sheets_last_sync?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_quota_history: {
        Row: {
          id: string
          group_id: string
          user_id: string
          quota_percent: number
          valid_from: string
          valid_until: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          quota_percent: number
          valid_from: string
          valid_until?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          quota_percent?: number
          valid_from?: string
          valid_until?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_quota_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_quota_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_quota_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      group_secretary_permissions: {
        Row: {
          id: string
          secretary_id: string
          module: string
          granted_by: string | null
          granted_at: string
        }
        Insert: {
          id?: string
          secretary_id: string
          module: string
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          id?: string
          secretary_id?: string
          module?: string
          granted_by?: string | null
          granted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_secretary_permissions_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_secretary_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          procedure_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          procedure_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          procedure_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_logs: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          parsed: Json | null
          raw_text: string
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          parsed?: Json | null
          raw_text: string
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          parsed?: Json | null
          raw_text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_messages: {
        Row: {
          cost_llm: number | null
          cost_ocr: number | null
          created_at: string | null
          doc_type: string | null
          error_log: string | null
          id: string
          media_id: string | null
          phone: string
          raw_text: string | null
          status: string
          structured_data: Json | null
        }
        Insert: {
          cost_llm?: number | null
          cost_ocr?: number | null
          created_at?: string | null
          doc_type?: string | null
          error_log?: string | null
          id?: string
          media_id?: string | null
          phone: string
          raw_text?: string | null
          status?: string
          structured_data?: Json | null
        }
        Update: {
          cost_llm?: number | null
          cost_ocr?: number | null
          created_at?: string | null
          doc_type?: string | null
          error_log?: string | null
          id?: string
          media_id?: string | null
          phone?: string
          raw_text?: string | null
          status?: string
          structured_data?: Json | null
        }
        Relationships: []
      }
      pagarme_plans: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          interval: string
          interval_count: number
          name: string
          pagarme_plan_id: string
          plan_type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          interval: string
          interval_count: number
          name: string
          pagarme_plan_id: string
          plan_type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          interval?: string
          interval_count?: number
          name?: string
          pagarme_plan_id?: string
          plan_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      parcelas: {
        Row: {
          created_at: string | null
          data_recebimento: string | null
          id: string
          numero_parcela: number
          procedure_id: string
          recebida: boolean | null
          updated_at: string | null
          valor_parcela: number
        }
        Insert: {
          created_at?: string | null
          data_recebimento?: string | null
          id?: string
          numero_parcela: number
          procedure_id: string
          recebida?: boolean | null
          updated_at?: string | null
          valor_parcela: number
        }
        Update: {
          created_at?: string | null
          data_recebimento?: string | null
          id?: string
          numero_parcela?: number
          procedure_id?: string
          recebida?: boolean | null
          updated_at?: string | null
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          barcode: string | null
          card_brand: string | null
          card_last_digits: string | null
          created_at: string | null
          id: string
          installments: number | null
          pagarme_transaction_id: string
          paid_at: string | null
          payment_method: string
          pix_qr_code: string | null
          status: string
          stripe_transaction_id: string | null
          subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          barcode?: string | null
          card_brand?: string | null
          card_last_digits?: string | null
          created_at?: string | null
          id?: string
          installments?: number | null
          pagarme_transaction_id: string
          paid_at?: string | null
          payment_method: string
          pix_qr_code?: string | null
          status: string
          stripe_transaction_id?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          barcode?: string | null
          card_brand?: string | null
          card_last_digits?: string | null
          created_at?: string | null
          id?: string
          installments?: number | null
          pagarme_transaction_id?: string
          paid_at?: string | null
          payment_method?: string
          pix_qr_code?: string | null
          status?: string
          stripe_transaction_id?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
      procedure_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          procedure_id: string
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          procedure_id: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          procedure_id?: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_attachments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_logs: {
        Row: {
          changed_by_id: string
          changed_by_name: string
          changed_by_type: string
          created_at: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          procedure_id: string
        }
        Insert: {
          changed_by_id: string
          changed_by_name: string
          changed_by_type: string
          created_at?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          procedure_id: string
        }
        Update: {
          changed_by_id?: string
          changed_by_name?: string
          changed_by_type?: string
          created_at?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          procedure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_logs_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          acompanhamento_antes: string | null
          anesthesiologist_name: string | null
          carteirinha: string | null
          codigo_tssu: string | null
          convenio: string | null
          created_at: string | null
          data_cirurgia: string | null
          data_nascimento: string | null
          descricao_indicacao_cesariana: string | null
          dor: string | null
          duracao_minutos: number | null
          duration_minutes: number | null
          email_cirurgiao: string | null
          especialidade_cirurgiao: string | null
          expected_payment_date: string | null
          feedback_solicitado: boolean | null
          fichas_anestesicas: Json | null
          forma_pagamento: string | null
          grau_laceracao: string | null
          group_id: string | null
          grupo_anestesico: string | null
          hemorragia_puerperal: string | null
          hora_inicio: string | null
          hora_termino: string | null
          horario: string | null
          hospital_clinic: string | null
          id: string
          indicacao_cesariana: string | null
          laceracao_presente: string | null
          nausea_vomito: string | null
          nome_cirurgiao: string | null
          nome_equipe: string | null
          notes: string | null
          numero_parcelas: number | null
          observacoes_financeiras: string | null
          observacoes_procedimento: string | null
          paid_at: string | null
          parcelas_recebidas: number | null
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
          retencao_placenta: string | null
          room_number: string | null
          sangramento: string | null
          secretaria_id: string | null
          sent_at: string | null
          show_to_secretary: boolean | null
          surgeon_name: string | null
          tecnica_anestesica: string | null
          telefone_cirurgiao: string | null
          tipo_anestesia: string | null
          tipo_cesariana: string | null
          tipo_parto: string | null
          transfusao_realizada: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          acompanhamento_antes?: string | null
          anesthesiologist_name?: string | null
          carteirinha?: string | null
          codigo_tssu?: string | null
          convenio?: string | null
          created_at?: string | null
          data_cirurgia?: string | null
          data_nascimento?: string | null
          descricao_indicacao_cesariana?: string | null
          dor?: string | null
          duracao_minutos?: number | null
          duration_minutes?: number | null
          email_cirurgiao?: string | null
          especialidade_cirurgiao?: string | null
          expected_payment_date?: string | null
          feedback_solicitado?: boolean | null
          fichas_anestesicas?: Json | null
          forma_pagamento?: string | null
          grau_laceracao?: string | null
          group_id?: string | null
          grupo_anestesico?: string | null
          hemorragia_puerperal?: string | null
          hora_inicio?: string | null
          hora_termino?: string | null
          horario?: string | null
          hospital_clinic?: string | null
          id?: string
          indicacao_cesariana?: string | null
          laceracao_presente?: string | null
          nausea_vomito?: string | null
          nome_cirurgiao?: string | null
          nome_equipe?: string | null
          notes?: string | null
          numero_parcelas?: number | null
          observacoes_financeiras?: string | null
          observacoes_procedimento?: string | null
          paid_at?: string | null
          parcelas_recebidas?: number | null
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
          retencao_placenta?: string | null
          room_number?: string | null
          sangramento?: string | null
          secretaria_id?: string | null
          sent_at?: string | null
          show_to_secretary?: boolean | null
          surgeon_name?: string | null
          tecnica_anestesica?: string | null
          telefone_cirurgiao?: string | null
          tipo_anestesia?: string | null
          tipo_cesariana?: string | null
          tipo_parto?: string | null
          transfusao_realizada?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          acompanhamento_antes?: string | null
          anesthesiologist_name?: string | null
          carteirinha?: string | null
          codigo_tssu?: string | null
          convenio?: string | null
          created_at?: string | null
          data_cirurgia?: string | null
          data_nascimento?: string | null
          descricao_indicacao_cesariana?: string | null
          dor?: string | null
          duracao_minutos?: number | null
          duration_minutes?: number | null
          email_cirurgiao?: string | null
          especialidade_cirurgiao?: string | null
          expected_payment_date?: string | null
          feedback_solicitado?: boolean | null
          fichas_anestesicas?: Json | null
          forma_pagamento?: string | null
          grau_laceracao?: string | null
          group_id?: string | null
          grupo_anestesico?: string | null
          hemorragia_puerperal?: string | null
          hora_inicio?: string | null
          hora_termino?: string | null
          horario?: string | null
          hospital_clinic?: string | null
          id?: string
          indicacao_cesariana?: string | null
          laceracao_presente?: string | null
          nausea_vomito?: string | null
          nome_cirurgiao?: string | null
          nome_equipe?: string | null
          notes?: string | null
          numero_parcelas?: number | null
          observacoes_financeiras?: string | null
          observacoes_procedimento?: string | null
          paid_at?: string | null
          parcelas_recebidas?: number | null
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
          retencao_placenta?: string | null
          room_number?: string | null
          sangramento?: string | null
          secretaria_id?: string | null
          sent_at?: string | null
          show_to_secretary?: boolean | null
          surgeon_name?: string | null
          tecnica_anestesica?: string | null
          telefone_cirurgiao?: string | null
          tipo_anestesia?: string | null
          tipo_cesariana?: string | null
          tipo_parto?: string | null
          transfusao_realizada?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhooks: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          status?: string
        }
        Relationships: []
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
      secretaria_invites: {
        Row: {
          anestesista_id: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          updated_at: string | null
          used_at: string | null
          group_id: string | null
        }
        Insert: {
          anestesista_id?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          updated_at?: string | null
          used_at?: string | null
          group_id?: string | null
        }
        Update: {
          anestesista_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          updated_at?: string | null
          used_at?: string | null
          group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secretaria_invites_anestesista_id_fkey"
            columns: ["anestesista_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretaria_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      secretaria_link_requests: {
        Row: {
          anestesista_id: string
          created_at: string | null
          id: string
          notification_id: string | null
          secretaria_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          anestesista_id: string
          created_at?: string | null
          id?: string
          notification_id?: string | null
          secretaria_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          anestesista_id?: string
          created_at?: string | null
          id?: string
          notification_id?: string | null
          secretaria_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secretaria_link_requests_anestesista_id_fkey"
            columns: ["anestesista_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretaria_link_requests_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretaria_link_requests_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      secretarias: {
        Row: {
          cpf: string | null
          created_at: string | null
          data_cadastro: string | null
          email: string
          id: string
          nome: string
          status: string | null
          telefone: string | null
          updated_at: string | null
          type: string
          group_id: string | null
          password_hash: string | null
          invite_token: string | null
          invite_expires_at: string | null
          created_by: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email: string
          id?: string
          nome: string
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          type?: string
          group_id?: string | null
          password_hash?: string | null
          invite_token?: string | null
          invite_expires_at?: string | null
          created_by?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          email?: string
          id?: string
          nome?: string
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          type?: string
          group_id?: string | null
          password_hash?: string | null
          invite_token?: string | null
          invite_expires_at?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secretarias_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretarias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      shared_links: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          last_used_at: string | null
          last_used_ip: string | null
          permissions: Json | null
          revoked: boolean | null
          token: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          last_used_at?: string | null
          last_used_ip?: string | null
          permissions?: Json | null
          revoked?: boolean | null
          token?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          last_used_at?: string | null
          last_used_ip?: string | null
          permissions?: Json | null
          revoked?: boolean | null
          token?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          hospital_name: string | null
          id: string
          is_generated: boolean | null
          is_recurring: boolean | null
          parent_shift_id: string | null
          payment_date: string | null
          payment_status: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          shift_type: string
          shift_value: number | null
          sobreaviso_type: string | null
          start_date: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          hospital_name?: string | null
          id?: string
          is_generated?: boolean | null
          is_recurring?: boolean | null
          parent_shift_id?: string | null
          payment_date?: string | null
          payment_status?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          shift_type: string
          shift_value?: number | null
          sobreaviso_type?: string | null
          start_date: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          hospital_name?: string | null
          id?: string
          is_generated?: boolean | null
          is_recurring?: boolean | null
          parent_shift_id?: string | null
          payment_date?: string | null
          payment_status?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          shift_type?: string
          shift_value?: number | null
          sobreaviso_type?: string | null
          start_date?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_parent_shift_id_fkey"
            columns: ["parent_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          days_used: number | null
          id: string
          pagarme_customer_id: string | null
          pagarme_payment_link_id: string | null
          pagarme_subscription_id: string | null
          pending_plan_change_at: string | null
          pending_plan_type: string | null
          plan_type: string
          refund_eligible: boolean | null
          refund_processed_at: string | null
          refund_requested: boolean | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          days_used?: number | null
          id?: string
          pagarme_customer_id?: string | null
          pagarme_payment_link_id?: string | null
          pagarme_subscription_id?: string | null
          pending_plan_change_at?: string | null
          pending_plan_type?: string | null
          plan_type: string
          refund_eligible?: boolean | null
          refund_processed_at?: string | null
          refund_requested?: boolean | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          days_used?: number | null
          id?: string
          pagarme_customer_id?: string | null
          pagarme_payment_link_id?: string | null
          pagarme_subscription_id?: string | null
          pending_plan_change_at?: string | null
          pending_plan_type?: string | null
          plan_type?: string
          refund_eligible?: boolean | null
          refund_processed_at?: string | null
          refund_requested?: boolean | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_stats: {
        Row: {
          active_medicos: number | null
          active_secretarias: number | null
          active_subscriptions: number | null
          active_users: number | null
          created_at: string | null
          id: string
          last_updated: string | null
          paying_users: number | null
          pending_subscriptions: number | null
          procedures_this_month: number | null
          procedures_this_year: number | null
          total_medicos: number | null
          total_procedures: number | null
          total_secretarias: number | null
          total_subscriptions: number | null
          total_users: number | null
          updated_at: string | null
        }
        Insert: {
          active_medicos?: number | null
          active_secretarias?: number | null
          active_subscriptions?: number | null
          active_users?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          paying_users?: number | null
          pending_subscriptions?: number | null
          procedures_this_month?: number | null
          procedures_this_year?: number | null
          total_medicos?: number | null
          total_procedures?: number | null
          total_secretarias?: number | null
          total_subscriptions?: number | null
          total_users?: number | null
          updated_at?: string | null
        }
        Update: {
          active_medicos?: number | null
          active_secretarias?: number | null
          active_subscriptions?: number | null
          active_users?: number | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          paying_users?: number | null
          pending_subscriptions?: number | null
          procedures_this_month?: number | null
          procedures_this_year?: number | null
          total_medicos?: number | null
          total_procedures?: number | null
          total_secretarias?: number | null
          total_subscriptions?: number | null
          total_users?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
          cpf: string | null
          created_at: string | null
          created_by_admin: boolean | null
          crm: string | null
          email: string
          free_months: number | null
          gender: string | null
          id: string
          is_system_admin: boolean | null
          last_login_at: string | null
          name: string
          password_hash: string | null
          phone: string | null
          role: string | null
          specialty: string
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by_admin?: boolean | null
          crm?: string | null
          email: string
          free_months?: number | null
          gender?: string | null
          id?: string
          is_system_admin?: boolean | null
          last_login_at?: string | null
          name: string
          password_hash?: string | null
          phone?: string | null
          role?: string | null
          specialty?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by_admin?: boolean | null
          crm?: string | null
          email?: string
          free_months?: number | null
          gender?: string | null
          id?: string
          is_system_admin?: boolean | null
          last_login_at?: string | null
          name?: string
          password_hash?: string | null
          phone?: string | null
          role?: string | null
          specialty?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_msg: string | null
          id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          error_msg?: string | null
          id?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          error_msg?: string | null
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      whatsapp_accounts: {
        Row: {
          created_at: string | null
          id: string
          phone_number: string
          updated_at: string | null
          user_id: string
          verification_code: string | null
          verification_expires_at: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone_number: string
          updated_at?: string | null
          user_id: string
          verification_code?: string | null
          verification_expires_at?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          phone_number?: string
          updated_at?: string | null
          user_id?: string
          verification_code?: string | null
          verification_expires_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_extractions: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          expires_at: string | null
          extracted_fields: Json | null
          field_confidences: Json | null
          id: string
          image_storage_path: string | null
          message_id: string | null
          missing_required: string[] | null
          ocr_confidence: number | null
          overall_confidence: number | null
          procedure_id: string | null
          raw_ocr_text: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          extracted_fields?: Json | null
          field_confidences?: Json | null
          id?: string
          image_storage_path?: string | null
          message_id?: string | null
          missing_required?: string[] | null
          ocr_confidence?: number | null
          overall_confidence?: number | null
          procedure_id?: string | null
          raw_ocr_text?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          extracted_fields?: Json | null
          field_confidences?: Json | null
          id?: string
          image_storage_path?: string | null
          message_id?: string | null
          missing_required?: string[] | null
          ocr_confidence?: number | null
          overall_confidence?: number | null
          procedure_id?: string | null
          raw_ocr_text?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_extractions_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          direction: string | null
          error_message: string | null
          id: string
          media_id: string | null
          media_url: string | null
          message_type: string
          phone_number: string
          status: string | null
          text_content: string | null
          user_id: string | null
          wamid: string
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          error_message?: string | null
          id?: string
          media_id?: string | null
          media_url?: string | null
          message_type: string
          phone_number: string
          status?: string | null
          text_content?: string | null
          user_id?: string | null
          wamid: string
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          error_message?: string | null
          id?: string
          media_id?: string | null
          media_url?: string | null
          message_type?: string
          phone_number?: string
          status?: string | null
          text_content?: string | null
          user_id?: string | null
          wamid?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_system_stats: { Args: never; Returns: undefined }
      generate_monthly_report: {
        Args: { report_month: string; user_uuid: string }
        Returns: Json
      }
      get_secretaria_id_by_email: {
        Args: { check_email: string }
        Returns: string
      }
      get_system_stats: {
        Args: never
        Returns: {
          active_medicos: number
          active_secretarias: number
          active_subscriptions: number
          active_users: number
          last_updated: string
          paying_users: number
          pending_subscriptions: number
          procedures_this_month: number
          procedures_this_year: number
          total_medicos: number
          total_procedures: number
          total_secretarias: number
          total_subscriptions: number
          total_users: number
        }[]
      }
      get_user_stats: { Args: { user_uuid: string }; Returns: Json }
      login_user: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      register_user: {
        Args: {
          p_crm?: string
          p_email: string
          p_name: string
          p_password: string
          p_specialty?: string
        }
        Returns: Json
      }
      send_feedback_email: {
        Args: {
          anesthesiologist_name: string
          procedure_id: string
          to_email: string
          token: string
        }
        Returns: undefined
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
