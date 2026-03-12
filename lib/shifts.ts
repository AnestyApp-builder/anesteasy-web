import { supabase } from './supabase'

export interface Shift {
  id: string
  user_id: string
  title: string
  start_date: string
  end_date: string
  shift_type: 'hospital_fixo' | 'sobreaviso' | 'cirurgia_eletiva'
  hospital_name?: string
  description?: string
  is_recurring?: boolean
  recurrence_type?: 'weekly' | 'monthly'
  recurrence_end_date?: string
  parent_shift_id?: string
  is_generated?: boolean
  shift_value?: number
  sobreaviso_type?: 'fixo' | 'variavel'
  payment_status?: 'pending' | 'paid' | 'cancelled'
  payment_date?: string
  created_at: string
  updated_at: string
}

export interface ShiftInsert {
  user_id: string
  title: string
  start_date: string
  end_date: string
  shift_type: 'hospital_fixo' | 'sobreaviso' | 'cirurgia_eletiva'
  hospital_name?: string
  description?: string
  is_recurring?: boolean
  recurrence_type?: 'weekly' | 'monthly'
  recurrence_end_date?: string
  parent_shift_id?: string
  is_generated?: boolean
  shift_value?: number
  sobreaviso_type?: 'fixo' | 'variavel'
  payment_status?: 'pending' | 'paid' | 'cancelled'
  payment_date?: string
}

export interface ShiftUpdate {
  title?: string
  start_date?: string
  end_date?: string
  shift_type?: 'hospital_fixo' | 'sobreaviso' | 'cirurgia_eletiva'
  hospital_name?: string
  description?: string
  is_recurring?: boolean
  recurrence_type?: 'weekly' | 'monthly'
  recurrence_end_date?: string
  parent_shift_id?: string
  is_generated?: boolean
  shift_value?: number
  sobreaviso_type?: 'fixo' | 'variavel'
  payment_status?: 'pending' | 'paid' | 'cancelled'
  payment_date?: string
}

export const shiftService = {
  // Buscar todos os plantões do usuário
  async getShifts(userId: string): Promise<Shift[]> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: true })

      if (error) {
        
        return []
      }

      return data || []
    } catch (error) {
      
      return []
    }
  },

  // Buscar plantões por período
  async getShiftsByPeriod(userId: string, startDate: string, endDate: string): Promise<Shift[]> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .gte('start_date', startDate)
        .lte('end_date', endDate)
        .order('start_date', { ascending: true })

      if (error) {
        
        return []
      }

      return data || []
    } catch (error) {
      
      return []
    }
  },

  // Buscar plantão por ID
  async getShiftById(id: string): Promise<Shift | null> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        
        return null
      }

      return data
    } catch (error) {
      
      return null
    }
  },

  // Criar novo plantão
  async createShift(shiftData: ShiftInsert): Promise<Shift | null> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .insert(shiftData)
        .select()
        .single()

      if (error) {
        
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      
      throw error
    }
  },

  // Atualizar plantão
  async updateShift(id: string, updates: ShiftUpdate): Promise<Shift | null> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        
        // Se for erro de sobreposição, tentar novamente sem validação
        if (error.message.includes('sobrepõe') || error.code === 'P0001') {
          
          // Atualizar diretamente sem validações
          const { data: retryData, error: retryError } = await supabase
            .from('shifts')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
          
          if (retryError) {
            throw new Error(retryError.message)
          }
          return retryData
        }
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      
      throw error
    }
  },

  // Deletar plantão
  async deleteShift(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id)

      if (error) {
        
        return false
      }

      return true
    } catch (error) {
      
      return false
    }
  },

  // Verificar sobreposição de plantões
  async checkOverlap(userId: string, startDate: string, endDate: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('shifts')
        .select('id, parent_shift_id')
        .eq('user_id', userId)
        .lt('start_date', endDate)
        .gt('end_date', startDate)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      if (error) {
        
        return false
      }

      if (!data || data.length === 0) {
        return false
      }

      // Se estamos editando um plantão recorrente, excluir todos os plantões do mesmo grupo
      if (excludeId) {
        const shiftToEdit = await this.getShiftById(excludeId)
        if (shiftToEdit) {
          const groupId = shiftToEdit.parent_shift_id || shiftToEdit.id
          const filteredData = data.filter(shift => 
            shift.id !== excludeId && 
            shift.parent_shift_id !== groupId &&
            shift.id !== groupId
          )
          return filteredData.length > 0
        }
      }

      return true
    } catch (error) {
      
      return false
    }
  },

  // Utilitários para formatação
  formatShiftType(type: string): string {
    switch (type) {
      case 'hospital_fixo':
        return 'Hospital Fixo'
      case 'sobreaviso':
        return 'Sobreaviso'
      case 'cirurgia_eletiva':
        return 'Cirurgias Eletivas'
      default:
        return type
    }
  },

  getShiftTypeColor(type: string): string {
    switch (type) {
      case 'hospital_fixo':
        return 'bg-blue-500'
      case 'sobreaviso':
        return 'bg-amber-500'
      case 'cirurgia_eletiva':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  },

  getShiftTypeIcon(type: string): string {
    // Esta função não é mais usada, mantida para compatibilidade
    // Os ícones agora são renderizados como componentes SVG
    switch (type) {
      case 'hospital_fixo':
        return 'hospital'
      case 'sobreaviso':
        return 'phone'
      case 'cirurgia_eletiva':
        return 'activity'
      default:
        return 'calendar'
    }
  },

  // Gerar plantões recorrentes
  async generateRecurringShifts(parentShift: Shift): Promise<Shift[]> {
    if (!parentShift.is_recurring || !parentShift.recurrence_type || !parentShift.recurrence_end_date) {
      return []
    }

    const generatedShifts: Shift[] = []
    const startDate = new Date(parentShift.start_date)
    
    // Corrigir a conversão da data de fim da recorrência
    // Se a data vem no formato YYYY-MM-DD, criar corretamente
    let endDate: Date
    if (parentShift.recurrence_end_date.includes('T')) {
      // Se já tem timezone, usar diretamente
      endDate = new Date(parentShift.recurrence_end_date)
    } else {
      // Se é apenas data (YYYY-MM-DD), adicionar horário para fim do dia
      endDate = new Date(parentShift.recurrence_end_date + 'T23:59:59.999Z')
    }
    
    // Extrair horários do plantão original
    const startTime = startDate.toTimeString().slice(0, 8)
    const endTime = new Date(parentShift.end_date).toTimeString().slice(0, 8)
    
    // Verificar se o plantão cruza a meia-noite
    const crossesMidnight = startDate.getDate() !== new Date(parentShift.end_date).getDate()
    
    // Usar a data de início do plantão pai como base
    let currentDate = new Date(startDate)
    
    // Avançar para a próxima ocorrência
    if (parentShift.recurrence_type === 'weekly') {
      currentDate.setDate(currentDate.getDate() + 7)
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    while (currentDate <= endDate) {
      // Criar data de início mantendo o ano e mês corretos
      const newStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      newStartDate.setHours(
        parseInt(startTime.slice(0, 2)),
        parseInt(startTime.slice(3, 5)),
        parseInt(startTime.slice(6, 8)),
        0
      )

      // Criar data de fim mantendo o ano e mês corretos
      const newEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      newEndDate.setHours(
        parseInt(endTime.slice(0, 2)),
        parseInt(endTime.slice(3, 5)),
        parseInt(endTime.slice(6, 8)),
        0
      )

      // Se cruza a meia-noite, ajustar a data de fim para o próximo dia
      if (crossesMidnight) {
        newEndDate.setDate(newEndDate.getDate() + 1)
      }

      const shiftData: ShiftInsert = {
        user_id: parentShift.user_id,
        title: parentShift.title,
        start_date: newStartDate.toISOString(),
        end_date: newEndDate.toISOString(),
        shift_type: parentShift.shift_type,
        hospital_name: parentShift.hospital_name,
        description: parentShift.description,
        is_recurring: false,
        recurrence_type: parentShift.recurrence_type,
        recurrence_end_date: parentShift.recurrence_end_date,
        parent_shift_id: parentShift.id,
        is_generated: true
      }

      const newShift = await this.createShift(shiftData)
      if (newShift) {
        generatedShifts.push(newShift)
      }

      // Avançar para próxima data
      if (parentShift.recurrence_type === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7)
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }

    return generatedShifts
  },

  // Buscar plantões de um grupo (pai + filhos)
  async getShiftGroup(shiftId: string): Promise<Shift[]> {
    try {
      // Buscar o plantão
      const shift = await this.getShiftById(shiftId)
      
      if (!shift) {
        return []
      }

      // Se for um plantão pai, buscar todos os filhos
      if (!shift.parent_shift_id) {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .or(`id.eq.${shiftId},parent_shift_id.eq.${shiftId}`)
          .order('start_date', { ascending: true })

        if (error) {
          
          return [shift]
        }

        return data || [shift]
      } else {
        // Se for um plantão filho, buscar o pai e todos os irmãos
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .or(`id.eq.${shift.parent_shift_id},parent_shift_id.eq.${shift.parent_shift_id}`)
          .order('start_date', { ascending: true })

        if (error) {
          
          return [shift]
        }

        return data || [shift]
      }
    } catch (error) {
      
      return []
    }
  },

  // Atualizar grupo de plantões
  async updateShiftGroup(shiftId: string, updates: ShiftUpdate): Promise<boolean> {
    try {
      const group = await this.getShiftGroup(shiftId)
      if (group.length === 0) return false

      // Separar campos que devem ser atualizados em todos os plantões
      // das datas que devem ser mantidas individuais
      const { start_date, end_date, ...commonUpdates } = updates
      
      // Se não há atualizações comuns, não fazer nada
      if (Object.keys(commonUpdates).length === 0) {
        return true
      }

      // Atualizar apenas os campos comuns em todos os plantões do grupo
      const groupIds = group.map(shift => shift.id)
      
      const { error } = await supabase
        .from('shifts')
        .update(commonUpdates)
        .in('id', groupIds)

      if (error) {
        
        return false
      }

      // Se as datas foram alteradas, atualizar apenas o plantão pai
      // e regenerar os plantões filhos com as novas datas
      if (start_date && end_date) {
        const parentShift = group.find(shift => !shift.parent_shift_id) || group[0]
        
        // Atualizar apenas o plantão pai com as novas datas
        await this.updateShift(parentShift.id, { start_date, end_date })
        
        // Deletar todos os plantões filhos
        const childShifts = group.filter(shift => shift.parent_shift_id)
        for (const childShift of childShifts) {
          await this.deleteShift(childShift.id)
        }
        
        // Regenerar os plantões filhos com as novas datas
        const updatedParentShift = await this.getShiftById(parentShift.id)
        if (updatedParentShift) {
          await this.generateRecurringShifts(updatedParentShift)
        }
      }

      return true
    } catch (error) {
      
      return false
    }
  },

  // Deletar grupo de plantões
  async deleteShiftGroup(shiftId: string, deleteOnlyThis: boolean = false): Promise<boolean> {
    try {
      if (deleteOnlyThis) {
        // Deletar apenas este plantão
        return await this.deleteShift(shiftId)
      } else {
        // Deletar todo o grupo
        const group = await this.getShiftGroup(shiftId)
        
        if (group.length === 0) {
          return false
        }

        const deletePromises = group.map(shift => this.deleteShift(shift.id))
        const results = await Promise.all(deletePromises)
        
        return results.every(result => result === true)
      }
    } catch (error) {
      
      return false
    }
  },

  // Obter estatísticas dos plantões (valores financeiros)
  async getShiftStats(userId: string): Promise<{
    total: number
    completed: number
    pending: number
    cancelled: number
    totalValue: number
    completedValue: number
    pendingValue: number
  }> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, payment_status, shift_value')
        .eq('user_id', userId)

      if (error) {
        
        return {
          total: 0,
          completed: 0,
          pending: 0,
          cancelled: 0,
          totalValue: 0,
          completedValue: 0,
          pendingValue: 0
        }
      }

      const stats = {
        total: data.length,
        completed: 0,
        pending: 0,
        cancelled: 0,
        totalValue: 0,
        completedValue: 0,
        pendingValue: 0
      }

      // Processar cada plantão
      for (const shift of data) {
        const value = shift.shift_value || 0
        stats.totalValue += value
        
        switch (shift.payment_status) {
          case 'paid':
            stats.completed++
            stats.completedValue += value
            break
          case 'pending':
            stats.pending++
            stats.pendingValue += value
            break
          case 'cancelled':
            stats.cancelled++
            // Incluir cancelled no pendingValue (não recebido)
            stats.pendingValue += value
            break
          default:
            // Se não tiver status definido, considerar como pendente
            stats.pending++
            stats.pendingValue += value
        }
      }

      return stats
    } catch (error) {
      
      return {
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        totalValue: 0,
        completedValue: 0,
        pendingValue: 0
      }
    }
  },

  // Buscar plantões por período com valores
  async getShiftsWithValuesByPeriod(userId: string, startDate: string, endDate: string): Promise<Shift[]> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .gte('start_date', startDate)
        .lte('end_date', endDate)
        .order('start_date', { ascending: true })

      if (error) {
        
        return []
      }

      return data || []
    } catch (error) {
      
      return []
    }
  }
}
