import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarPaymentLink, obterPaymentLink } from '@/lib/pagarme'

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

/**
 * POST /api/pagarme/payment-link
 * Cria um novo Payment Link
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin?.auth.getUser(accessToken) || { data: { user: null }, error: null }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Suportar tanto o formato direto quanto o formato do checkout antigo
    let items, customer, payment_config, expires_in, success_url, cancel_url, metadata
    
    if (body.items && body.customer) {
      // Formato direto (items, customer, etc)
      ({ items, customer, payment_config, expires_in, success_url, cancel_url, metadata } = body)
    } else if (body.plan_id) {
      // Formato do checkout antigo (plan_id, customer_data)
      const PLAN_PRICES: Record<string, number> = {
        monthly: 7900,
        quarterly: 22500,
        annual: 85000
      }
      const PLAN_NAMES: Record<string, string> = {
        monthly: 'Plano Mensal - AnestEasy',
        quarterly: 'Plano Trimestral - AnestEasy',
        annual: 'Plano Anual - AnestEasy'
      }
      
      const amount = PLAN_PRICES[body.plan_id] || 7900
      const planName = PLAN_NAMES[body.plan_id] || 'Plano - AnestEasy'
      
      // Buscar dados do usuário
      const { data: userData } = await supabaseAdmin
        ?.from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle() || { data: null }
      
      const customerName = body.customer_data?.name || userData?.name || user.email?.split('@')[0] || 'Cliente'
      const customerEmail = user.email || ''
      
      // CPF do usuário
      let customerDocument = body.customer_data?.document?.replace(/\D/g, '') || ''
      if (!customerDocument || customerDocument.length !== 11) {
        customerDocument = user.user_metadata?.cpf?.replace(/\D/g, '') || ''
        if (!customerDocument || customerDocument.length !== 11) {
          const userIdHash = user.id.replace(/-/g, '').substring(0, 9)
          customerDocument = userIdHash.padEnd(9, '0').substring(0, 9) + '00'
        }
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      
      items = [{
        amount: amount,
        description: planName,
        quantity: 1,
        code: `plan_${body.plan_id}`
      }]
      
      customer = {
        name: customerName,
        email: customerEmail,
        document: customerDocument,
        type: 'individual',
        document_type: 'CPF'
      }
      
      if (body.customer_data?.phone && body.customer_data.phone.length >= 10) {
        customer.phones = {
          mobile_phone: {
            country_code: '55',
            area_code: body.customer_data.phone.substring(0, 2) || '11',
            number: body.customer_data.phone.substring(2) || '999999999'
          }
        }
      }
      
      payment_config = {
        credit_card: {
          enabled: true,
          installments: [{ number: 1, total: amount }]
        },
        boleto: { enabled: false },
        pix: { enabled: false }
      }
      
      expires_in = 30 * 60
      success_url = `${baseUrl}/checkout/success?plan=${body.plan_id}&user_id=${user.id}`
      cancel_url = `${baseUrl}/planos?checkout=cancelled`
      metadata = {
        plan_id: body.plan_id,
        user_id: user.id
      }
    } else {
      return NextResponse.json(
        { error: 'Dados inválidos. Forneça items/customer ou plan_id' },
        { status: 400 }
      )
    }

    // Validar dados obrigatórios
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items são obrigatórios' },
        { status: 400 }
      )
    }

    if (!customer || !customer.email) {
      return NextResponse.json(
        { error: 'Customer com email é obrigatório' },
        { status: 400 }
      )
    }

    // Criar Payment Link
    const paymentLink = await criarPaymentLink({
      items,
      customer,
      payment_config: payment_config || {
        credit_card: {
          enabled: true,
          installments: [{ number: 1, total: items[0].amount }]
        }
      },
      expires_in: expires_in || 30 * 60,
      success_url,
      cancel_url,
      metadata: {
        ...metadata,
        user_id: user.id
      }
    })

    // (Opcional) Salvar link_id no Supabase para controle e auditoria
    if (supabaseAdmin && paymentLink.id) {
      try {
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: user.id,
            pagarme_subscription_id: paymentLink.id.toString(),
            status: 'pending',
            plan_type: metadata?.plan_id || 'monthly',
            amount: items[0].amount / 100,
            current_period_start: new Date().toISOString()
          })
          .select()
          .single()
      } catch (error) {
        // Não falhar se não conseguir salvar - apenas logar
        console.warn('⚠️ Não foi possível salvar link_id no Supabase:', error)
      }
    }

    return NextResponse.json({
      checkout_url: paymentLink.url,
      link_id: paymentLink.id,
      status: paymentLink.status
    })

  } catch (error: any) {
    console.error('Erro ao criar payment link:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar payment link' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pagarme/payment-link?link_id=xxx
 * Obtém um Payment Link existente
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin?.auth.getUser(accessToken) || { data: { user: null }, error: null }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('link_id')

    if (!linkId) {
      return NextResponse.json(
        { error: 'link_id é obrigatório' },
        { status: 400 }
      )
    }

    // Obter Payment Link
    const paymentLink = await obterPaymentLink(linkId)

    return NextResponse.json({
      checkout_url: paymentLink.url,
      link_id: paymentLink.id,
      status: paymentLink.status,
      ...paymentLink
    })

  } catch (error: any) {
    console.error('Erro ao obter payment link:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao obter payment link' },
      { status: 500 }
    )
  }
}

