import { supabase } from './supabase'

export interface Goal {
  id: string
  user_id: string
  target_value: number
  reset_day: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface GoalInsert {
  user_id: string
  target_value: number
  reset_day: number
  is_enabled: boolean
}

export interface GoalUpdate {
  target_value?: number
  reset_day?: number
  is_enabled?: boolean
}

export const goalService = {
  // Buscar meta do usuário
  async getGoal(userId: string): Promise<Goal | null> {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST116') {
          // Nenhuma meta encontrada - retornar null
          return null
        }
        console.error('Erro ao buscar meta:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao buscar meta:', error)
      return null
    }
  },

  // Salvar ou atualizar meta
  async saveGoal(goalData: GoalInsert): Promise<Goal | null> {
    try {
      // Verificar se já existe uma meta para o usuário
      const existingGoal = await this.getGoal(goalData.user_id)
      
      if (existingGoal) {
        // Atualizar meta existente
        const { data, error } = await supabase
          .from('goals')
          .update({
            target_value: goalData.target_value,
            reset_day: goalData.reset_day,
            is_enabled: goalData.is_enabled
          })
          .eq('user_id', goalData.user_id)
          .select()
          .single()

        if (error) {
          console.error('Erro ao atualizar meta:', error)
          return null
        }

        return data
      } else {
        // Criar nova meta
        const { data, error } = await supabase
          .from('goals')
          .insert(goalData)
          .select()
          .single()

        if (error) {
          console.error('Erro ao criar meta:', error)
          return null
        }

        return data
      }
    } catch (error) {
      console.error('Erro ao salvar meta:', error)
      return null
    }
  },

  // Deletar meta
  async deleteGoal(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Erro ao deletar meta:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao deletar meta:', error)
      return false
    }
  },

  // Migrar dados do localStorage para o banco (função de migração)
  async migrateFromLocalStorage(userId: string): Promise<Goal | null> {
    try {
      // Tentar carregar do localStorage
      const savedGoal = localStorage.getItem(`monthlyGoal_${userId}`)
      
      if (savedGoal) {
        const goal = JSON.parse(savedGoal)
        
        // Converter formato do localStorage para formato do banco
        const goalData: GoalInsert = {
          user_id: userId,
          target_value: goal.targetValue || 0,
          reset_day: goal.resetDay || 1,
          is_enabled: goal.isEnabled || false
        }

        // Salvar no banco
        const savedGoalInDb = await this.saveGoal(goalData)
        
        if (savedGoalInDb) {
          // Remover do localStorage após migração bem-sucedida
          localStorage.removeItem(`monthlyGoal_${userId}`)
          console.log('Meta migrada do localStorage para o banco de dados')
        }

        return savedGoalInDb
      }

      return null
    } catch (error) {
      console.error('Erro ao migrar meta do localStorage:', error)
      return null
    }
  }
}
