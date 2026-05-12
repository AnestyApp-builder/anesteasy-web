import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { adminNotifier } from '@/lib/notifications/admin-service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/login'

  const supabase = await createClient()

  // Formato atual do Supabase: token_hash + type
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (error) {
      console.error('[CONFIRM] verifyOtp error:', error.message)
      return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
    }

    if (data.user) {
      return handleSuccessfulConfirmation(data.user, next, request.url, type)
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}

async function handleSuccessfulConfirmation(
  user: any,
  next: string,
  baseUrl: string,
  type: EmailOtpType | null
) {
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', baseUrl))
  }

  if (type === 'signup') {
    try {
      // O Trigger public.handle_new_user() já deve ter criado o registro em public.users
      // No entanto, vamos garantir que o registro exista (fallback de segurança)
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!existingUser) {
        console.log('[CONFIRM] Usuário não encontrado via trigger, tentando criação manual de emergência...')
        const trialEndsAt = new Date()
        trialEndsAt.setDate(trialEndsAt.getDate() + 7)

        await supabaseAdmin
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || 'Usuário',
            specialty: user.user_metadata?.specialty || 'Anestesiologia',
            crm: user.user_metadata?.crm || null,
            subscription_plan: 'premium',
            subscription_status: 'active',
            trial_ends_at: trialEndsAt.toISOString(),
          })
      }

      // Notificar admin via WhatsApp (não bloqueia o redirect)
      adminNotifier.notifyNewUserConfirmed({
        name: user.user_metadata?.name || 'Usuário',
        email: user.email,
        specialty: user.user_metadata?.specialty || '',
        crm: user.user_metadata?.crm || '',
      }).catch(() => {})

      return NextResponse.redirect(new URL('/login?confirmed=true', baseUrl))
    } catch (err) {
      console.error('[CONFIRM] Erro inesperado:', err)
      // Mesmo com erro, tentamos o login pois o registro pode ter sido criado pelo trigger
      return NextResponse.redirect(new URL('/login?confirmed=true', baseUrl))
    }
  }

  return NextResponse.redirect(new URL(next, baseUrl))
}
