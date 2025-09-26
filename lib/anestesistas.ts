import { supabase } from './supabase'

export interface Anestesista {
  id: string
  nome: string
  email: string
  crm: string
  telefone?: string
  especialidade?: string
  data_nascimento?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  status: 'ativo' | 'inativo' | 'pendente'
  created_at?: string
  updated_at?: string
}

export interface AnestesistaInsert extends Omit<Anestesista, 'id' | 'created_at' | 'updated_at'> {}
export interface AnestesistaUpdate extends Partial<AnestesistaInsert> {}

export const anestesistaService = {
  // Buscar anestesista por ID
  async getAnestesistaById(id: string): Promise<Anestesista | null> {
    try {
      const { data, error } = await supabase
        .from('anestesistas')
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

  // Buscar anestesista por email
  async getAnestesistaByEmail(email: string): Promise<Anestesista | null> {
    try {
      const { data, error } = await supabase
        .from('anestesistas')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        
        return null
      }

      return data
    } catch (error) {
      
      return null
    }
  },

  // Criar novo anestesista
  async createAnestesista(anestesista: AnestesistaInsert): Promise<Anestesista | null> {
    try {
      const { data, error } = await supabase
        .from('anestesistas')
        .insert(anestesista)
        .select()
        .single()

      if (error) {
        
        return null
      }

      return data
    } catch (error) {
      
      return null
    }
  },

  // Atualizar anestesista
  async updateAnestesista(id: string, updates: AnestesistaUpdate): Promise<Anestesista | null> {
    try {
      const { data, error } = await supabase
        .from('anestesistas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        
        return null
      }

      return data
    } catch (error) {
      
      return null
    }
  },

  // Buscar todos os anestesistas ativos
  async getAnestesistasAtivos(): Promise<Anestesista[]> {
    try {
      const { data, error } = await supabase
        .from('anestesistas')
        .select('*')
        .eq('status', 'ativo')
        .order('nome')

      if (error) {
        
        return []
      }

      return data || []
    } catch (error) {
      
      return []
    }
  },

  // Buscar anestesistas por status
  async getAnestesistasByStatus(status: 'ativo' | 'inativo' | 'pendente'): Promise<Anestesista[]> {
    try {
      const { data, error } = await supabase
        .from('anestesistas')
        .select('*')
        .eq('status', status)
        .order('nome')

      if (error) {
        
        return []
      }

      return data || []
    } catch (error) {
      
      return []
    }
  }
}
