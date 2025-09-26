import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const code = searchParams.get('code')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/login'
  

  // Tentar com token_hash primeiro (formato novo)
  if (token_hash && type) {
    try {
      
      const { data, error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })

      if (error) {
        return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
      }

      if (data.user) {
        return await handleSuccessfulConfirmation(data.user, next, request.url, type)
      }
    } catch (error) {
    }
  }

  // Tentar com code (formato antigo)
  if (code) {
    try {

      // Tentar com type se disponível
      if (type) {
        const { data, error } = await supabase.auth.verifyOtp({
          type,
          token: code,
        })

        if (!error && data.user) {
          return await handleSuccessfulConfirmation(data.user, next, request.url)
        }
      }

      // Tentar sem type (auto-detect)
      const { data, error } = await supabase.auth.verifyOtp({
        token: code,
      })

      if (error) {
        return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
      }

      if (data.user) {
        return await handleSuccessfulConfirmation(data.user, next, request.url, type)
      }
    } catch (error) {
    }
  }

  // Redirecionar para página de erro
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}

async function handleSuccessfulConfirmation(user: any, next: string, baseUrl: string, type?: EmailOtpType | null) {
  // Se for recuperação de senha (recovery), redirecionar para reset-password
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', baseUrl))
  }
  
  // Se for confirmação de email (signup), criar usuário na tabela users
  if (type === 'signup') {
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'Usuário',
          specialty: user.user_metadata?.specialty || 'Anestesiologia',
          crm: user.user_metadata?.crm || '',
          password_hash: '', // Não armazenar senha na tabela users
          subscription_plan: 'premium',
          subscription_status: 'active' // Status ativo após confirmação
        })
        .select()

      if (insertError) {
        // Erro silencioso - usuário pode tentar novamente
      }
    } catch (insertError) {
      // Erro silencioso - usuário pode tentar novamente
    }
  }

  // Redirecionar para o próximo destino
  return NextResponse.redirect(new URL(next, baseUrl))
}
