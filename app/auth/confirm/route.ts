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
  // IMPORTANTE: NÃO criar registro na tabela users se for secretária
  if (type === 'signup') {
    try {
      // Verificar se é secretária ANTES de qualquer coisa
      const isSecretaria = user.user_metadata?.role === 'secretaria'
      
      // Se for secretária, verificar se já existe na tabela secretarias
      if (isSecretaria) {
        const { data: secretaria } = await supabase
          .from('secretarias')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        
        if (!secretaria) {
          console.warn('⚠️ [CONFIRM] Secretária confirmou email mas não existe na tabela secretarias. ID:', user.id)
        } else {
          console.log('✅ [CONFIRM] Secretária confirmada. ID:', user.id, 'Email:', user.email)
        }
        
        // CRÍTICO: Verificar se existe registro incorreto na tabela users e remover
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        
        if (existingUser) {
          console.error('❌ [CONFIRM] ERRO CRÍTICO: Secretária existe na tabela users! Removendo...')
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id)
          
          if (deleteError) {
            console.error('❌ [CONFIRM] Erro ao remover registro incorreto da tabela users:', deleteError)
          } else {
            console.log('✅ [CONFIRM] Registro incorreto removido da tabela users')
          }
        }
        
        // NÃO criar registro na tabela users para secretárias
        return NextResponse.redirect(new URL(next, baseUrl))
      }
      
      // Se NÃO for secretária, criar registro na tabela users
      // Verificar se já existe para evitar duplicação
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      
      if (existingUser) {
        console.log('ℹ️ [CONFIRM] Usuário já existe na tabela users. Pulando criação.')
        return NextResponse.redirect(new URL(next, baseUrl))
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || 'Usuário',
          specialty: user.user_metadata?.specialty || 'Anestesiologia',
          crm: user.user_metadata?.crm || '',
          gender: user.user_metadata?.gender || null,
          phone: user.user_metadata?.phone || null,
          password_hash: '', // Não armazenar senha na tabela users
          subscription_plan: 'premium',
          subscription_status: 'active' // Status ativo após confirmação
        })
        .select()

      if (insertError) {
        console.error('❌ [CONFIRM] Erro ao criar registro na tabela users:', insertError)
      } else {
        console.log('✅ [CONFIRM] Registro criado na tabela users para anestesista')
      }
    } catch (insertError) {
      console.error('❌ [CONFIRM] Erro ao processar confirmação de email:', insertError)
    }
  }

  // Redirecionar para o próximo destino
  return NextResponse.redirect(new URL(next, baseUrl))
}
