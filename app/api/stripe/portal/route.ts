import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCustomerPortalSession } from '@/lib/stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export async function POST(request: NextRequest) {
  try {
    // Verificar configuração do Supabase
    if (!supabaseAdmin) {
      console.error('❌ Supabase Admin não inicializado')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ Header de autorização não encontrado')
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      console.error('❌ Erro ao validar token:', authError?.message)
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    console.log('✅ Usuário autenticado:', user.id, user.email)

    // Verificar se é secretária
    const { data: secretaria } = await supabaseAdmin
      .from('secretarias')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (secretaria) {
      return NextResponse.json(
        { error: 'Secretárias não têm acesso ao portal de assinatura' },
        { status: 403 }
      )
    }

    // Verificar se tem assinatura ativa
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!subscription) {
      return NextResponse.json(
        { error: 'Você não possui uma assinatura ativa' },
        { status: 400 }
      )
    }

    // URL de retorno
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/assinatura`

    console.log('📤 Criando Customer Portal Session na Stripe...')

    // Criar sessão do Customer Portal na Stripe
    const session = await createCustomerPortalSession({
      userId: user.id,
      userEmail: user.email || '',
      returnUrl
    })

    console.log('✅ Customer Portal Session criada:', session.id)

    return NextResponse.json({
      portal_url: session.url
    })

  } catch (error: any) {
    console.error('❌ Erro ao criar portal session:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao acessar portal',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

