/**
 * Função universal para registrar erros no sistema
 * Pode ser usada tanto no app mobile (React Native) quanto no web (Next.js)
 */

import { supabase } from './supabase'

export interface LogErrorParams {
  screen: string
  action: string
  message: string
  userId?: string | null
  device?: string
  version?: string
}

/**
 * Registra um erro no sistema de logs
 * 
 * @param params - Parâmetros do erro a ser registrado
 * @returns Promise<boolean> - true se o erro foi registrado com sucesso, false caso contrário
 * 
 * @example
 * ```typescript
 * try {
 *   // código que pode gerar erro
 * } catch (error) {
 *   await logError({
 *     screen: 'Dashboard',
 *     action: 'loadProcedures',
 *     message: error instanceof Error ? error.message : 'Erro desconhecido',
 *     userId: user?.id,
 *     device: 'web',
 *     version: '1.0.0'
 *   })
 * }
 * ```
 */
export async function logError(params: LogErrorParams): Promise<boolean> {
  try {
    const {
      screen,
      action,
      message,
      userId = null,
      device = typeof window !== 'undefined' ? 'web' : 'mobile',
      version = '1.0.0'
    } = params

    // Validar parâmetros obrigatórios
    if (!screen || !action || !message) {
      console.warn('⚠️ [logError] Parâmetros obrigatórios faltando:', { screen, action, message })
      return false
    }

    // Tentar obter userId automaticamente se não fornecido
    let finalUserId = userId
    if (!finalUserId && typeof window !== 'undefined') {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        finalUserId = session?.user?.id || null
      } catch (error) {
        // Silenciar erro - continuar sem userId
        console.warn('⚠️ [logError] Não foi possível obter userId da sessão')
      }
    }

    // Inserir erro no banco de dados
    const { error: insertError } = await supabase
      .from('app_errors')
      .insert({
        user_id: finalUserId,
        screen,
        action,
        error_message: message,
        device,
        app_version: version
      })

    if (insertError) {
      console.error('❌ [logError] Erro ao registrar log no banco:', insertError)
      return false
    }

    console.log('✅ [logError] Erro registrado com sucesso:', { screen, action })
    return true
  } catch (error) {
    // Não queremos que erros no sistema de log quebrem a aplicação
    console.warn('⚠️ [logError] Erro ao registrar log:', error)
    return false
  }
}

/**
 * Helper para registrar erros automaticamente em blocos catch
 * 
 * @example
 * ```typescript
 * try {
 *   await someAsyncOperation()
 * } catch (error) {
 *   logErrorFromCatch(error, {
 *     screen: 'Dashboard',
 *     action: 'loadData'
 *   })
 * }
 * ```
 */
export async function logErrorFromCatch(
  error: unknown,
  context: {
    screen: string
    action: string
    userId?: string | null
    device?: string
    version?: string
  }
): Promise<boolean> {
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string'
    ? error
    : 'Erro desconhecido'

  return logError({
    ...context,
    message: errorMessage,
    device: context.device || (typeof window !== 'undefined' ? 'web' : 'mobile')
  })
}

