import { supabase } from './supabase'

/**
 * Verifica se um usuário é uma secretária
 * @param userId ID do usuário no Supabase Auth
 * @returns true se for secretária, false caso contrário
 */
export async function isSecretaria(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('secretarias')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao verificar se é secretária:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Erro ao verificar se é secretária:', error)
    return false
  }
}

/**
 * Verifica se um usuário é um anestesista (existe na tabela users)
 * @param userId ID do usuário no Supabase Auth
 * @returns true se for anestesista, false caso contrário
 */
export async function isAnestesista(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao verificar se é anestesista:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Erro ao verificar se é anestesista:', error)
    return false
  }
}

