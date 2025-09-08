import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdHd3YWp5aHVzeXJ1Z29ieHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzYzNzAsImV4cCI6MjA3MjkxMjM3MH0.NC6t2w_jFWTMJjVv5FmPLouVyOVgCTBReCr0zOA2dx8'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Tipos exportados para uso na aplicação
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Tipos específicos para o AnestEasy
export type User = Tables<'users'>
export type Procedure = Tables<'procedures'>
export type Payment = Tables<'payments'>
export type Report = Tables<'reports'>
export type UserSettings = Tables<'user_settings'>

export type UserInsert = TablesInsert<'users'>
export type ProcedureInsert = TablesInsert<'procedures'>
export type PaymentInsert = TablesInsert<'payments'>
export type ReportInsert = TablesInsert<'reports'>
export type UserSettingsInsert = TablesInsert<'user_settings'>

export type UserUpdate = TablesUpdate<'users'>
export type ProcedureUpdate = TablesUpdate<'procedures'>
export type PaymentUpdate = TablesUpdate<'payments'>
export type ReportUpdate = TablesUpdate<'reports'>
export type UserSettingsUpdate = TablesUpdate<'user_settings'>
