import { supabase } from './supabase'

export interface Despesa {
  id?: string
  procedure_id?: string | null
  user_id?: string
  group_id?: string | null
  descricao: string
  categoria: string
  valor: number
  data_despesa: string
  created_at?: string
  updated_at?: string
}

export const CATEGORIAS_DESPESA = [
  { value: 'imposto', label: 'Imposto' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'transporte', label: 'Transporte / Gasolina' },
  { value: 'equipamento', label: 'Ferramentas / Equipamento' },
  { value: 'software', label: 'Software / Assinatura' },
  { value: 'material_medico', label: 'Material Médico' },
  { value: 'pessoal', label: 'Pessoal / RH' },
  { value: 'outros', label: 'Outros' },
]

export const despesaService = {
  async getByGroup(groupId: string): Promise<Despesa[]> {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('group_id', groupId)
      .is('procedure_id', null)
      .order('data_despesa', { ascending: false })
    if (error) return []
    return data || []
  },

  async createGroupDespesa(groupId: string, despesa: { descricao: string; categoria: string; valor: number; data_despesa: string }): Promise<Despesa | null> {
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from('despesas')
      .insert({
        group_id: groupId,
        procedure_id: null,
        user_id: session?.user?.id,
        ...despesa,
      })
      .select()
      .single()
    if (error) { console.error('Erro ao criar despesa:', error); return null }
    return data
  },

  async deleteDespesa(id: string): Promise<boolean> {
    const { error } = await supabase.from('despesas').delete().eq('id', id)
    if (error) { console.error('Erro ao excluir despesa:', error); return false }
    return true
  },

  async getTotalByGroup(groupId: string, year: number): Promise<number> {
    const { data, error } = await supabase
      .from('despesas')
      .select('valor')
      .eq('group_id', groupId)
      .gte('data_despesa', `${year}-01-01`)
      .lte('data_despesa', `${year}-12-31`)
    if (error) return 0
    return (data || []).reduce((s, d) => s + (d.valor || 0), 0)
  },

  async getTotalByGroupMonth(groupId: string, year: number, month: number): Promise<number> {
    const m = String(month + 1).padStart(2, '0')
    const lastDay = new Date(year, month + 1, 0).getDate()
    const { data, error } = await supabase
      .from('despesas')
      .select('valor')
      .eq('group_id', groupId)
      .gte('data_despesa', `${year}-${m}-01`)
      .lte('data_despesa', `${year}-${m}-${lastDay}`)
    if (error) return 0
    return (data || []).reduce((s, d) => s + (d.valor || 0), 0)
  },
}
