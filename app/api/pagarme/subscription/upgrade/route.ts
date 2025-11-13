import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { obterAssinatura } from '@/lib/pagarme-subscriptions'
import { pagarmeRequest } from '@/lib/pagarme'

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
 * POST /api/pagarme/subscription/upgrade
 * Faz upgrade/downgrade de uma assinatura (troca de plano)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se supabaseAdmin está configurado
    if (!supabaseAdmin) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada')
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ Header Authorization não encontrado')
      return NextResponse.json(
        { error: 'Não autorizado. Token de acesso não fornecido.' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    
    if (!accessToken) {
      console.error('❌ Token de acesso vazio')
      return NextResponse.json(
        { error: 'Não autorizado. Token de acesso inválido.' },
        { status: 401 }
      )
    }

    // Verificar token com Supabase Admin
    let user = null
    let authError = null
    
    try {
      const authResult = await supabaseAdmin.auth.getUser(accessToken)
      user = authResult.data?.user || null
      authError = authResult.error || null
    } catch (error: any) {
      console.error('❌ Erro ao verificar token:', error)
      authError = error
    }

    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError?.message || 'Usuário não encontrado')
      return NextResponse.json(
        { error: 'Não autorizado. Token inválido ou expirado.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscription_id, new_plan_id } = body

    if (!subscription_id || !new_plan_id) {
      return NextResponse.json(
        { error: 'ID da assinatura e novo plano são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a assinatura pertence ao usuário
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('pagarme_subscription_id', subscription_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (subError) {
      console.error('❌ Erro ao buscar assinatura:', subError)
      return NextResponse.json(
        { error: 'Erro ao buscar assinatura', details: subError.message },
        { status: 500 }
      )
    }

    if (!subscription) {
      console.error('❌ Assinatura não encontrada para usuário:', user.id, 'subscription_id:', subscription_id)
      return NextResponse.json(
        { error: 'Assinatura não encontrada ou não pertence a este usuário' },
        { status: 404 }
      )
    }

    // Buscar o novo plano
    const { data: newPlan, error: planError } = await supabaseAdmin
      .from('pagarme_plans')
      .select('*')
      .eq('plan_type', new_plan_id)
      .maybeSingle()

    if (planError) {
      console.error('❌ Erro ao buscar plano:', planError)
      return NextResponse.json(
        { error: 'Erro ao buscar novo plano', details: planError.message },
        { status: 500 }
      )
    }

    if (!newPlan) {
      console.error('❌ Novo plano não encontrado:', new_plan_id)
      return NextResponse.json(
        { error: `Novo plano "${new_plan_id}" não encontrado` },
        { status: 404 }
      )
    }

    // Atualizar plano na Pagar.me
    // A Pagar.me permite atualizar o plano de uma assinatura via PATCH
    console.log('🔄 Atualizando plano na Pagar.me:', {
      subscription_id,
      old_plan: subscription.plan_type,
      new_plan: new_plan_id,
      pagarme_plan_id: newPlan.pagarme_plan_id
    })

    const result = await pagarmeRequest(`/subscriptions/${subscription_id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        plan_id: newPlan.pagarme_plan_id
      })
    })

    if (!result || result.error) {
      console.error('❌ Erro ao atualizar plano na Pagar.me:', result?.error)
      return NextResponse.json(
        { error: 'Erro ao atualizar plano na Pagar.me', details: result?.error || 'Erro desconhecido' },
        { status: 500 }
      )
    }

    // Atualizar no Supabase
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan_type: new_plan_id,
        amount: newPlan.amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('❌ Erro ao atualizar assinatura no Supabase:', updateError)
      // Não retornar erro aqui, pois a atualização na Pagar.me já foi feita
      // Apenas logar o erro e continuar
    }

    console.log('✅ Plano atualizado com sucesso:', {
      subscription_id,
      new_plan: new_plan_id,
      user_id: user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      subscription: result
    })

  } catch (error: any) {
    console.error('❌ Erro ao fazer upgrade:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao atualizar plano',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

