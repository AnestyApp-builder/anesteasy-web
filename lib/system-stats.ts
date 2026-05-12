import { supabase } from './supabase'

/**
 * Interface para as estatísticas do sistema
 */
export interface SystemStats {
  total_users: number
  active_users: number
  paying_users: number
  total_medicos: number
  active_medicos: number
  total_procedures: number
  procedures_this_month: number
  procedures_this_year: number
  total_subscriptions: number
  active_subscriptions: number
  pending_subscriptions: number
  last_updated: string
}

/**
 * Serviço para obter estatísticas do sistema
 */
export const systemStatsService = {
  /**
   * Obter estatísticas atualizadas do sistema
   * A função get_system_stats() atualiza automaticamente antes de retornar
   */
  async getStats(): Promise<SystemStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_system_stats')

      if (error) {
        console.error('❌ [SYSTEM STATS] Erro ao obter estatísticas:', error)
        return null
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ [SYSTEM STATS] Nenhuma estatística encontrada')
        return null
      }

      return data[0] as SystemStats
    } catch (error) {
      console.error('❌ [SYSTEM STATS] Erro ao obter estatísticas:', error)
      return null
    }
  },

  /**
   * Obter estatísticas diretamente da tabela (mais rápido, mas pode estar desatualizado)
   */
  async getStatsFromTable(): Promise<SystemStats | null> {
    try {
      const { data, error } = await supabase
        .from('system_stats')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error('❌ [SYSTEM STATS] Erro ao obter estatísticas da tabela:', error)
        return null
      }

      return data as SystemStats
    } catch (error) {
      console.error('❌ [SYSTEM STATS] Erro ao obter estatísticas da tabela:', error)
      return null
    }
  },

  /**
   * Forçar atualização das estatísticas
   * Útil para atualizar manualmente quando necessário
   */
  async refreshStats(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('calculate_system_stats')

      if (error) {
        console.error('❌ [SYSTEM STATS] Erro ao atualizar estatísticas:', error)
        return false
      }

      console.log('✅ [SYSTEM STATS] Estatísticas atualizadas com sucesso')
      return true
    } catch (error) {
      console.error('❌ [SYSTEM STATS] Erro ao atualizar estatísticas:', error)
      return false
    }
  }
}

