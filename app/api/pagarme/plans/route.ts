import { NextRequest, NextResponse } from 'next/server'
import { criarPlano, listarPlanos } from '@/lib/pagarme-subscriptions'
import { createClient } from '@supabase/supabase-js'

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
 * GET /api/pagarme/plans
 * Lista todos os planos do Supabase
 * ⚠️ NÃO cria planos automaticamente - use POST /api/pagarme/plans/init para criar
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 Listando Planos')

    // Verificar se já existem planos no Supabase
    const { data: existingPlans, error } = await supabaseAdmin
      ?.from('pagarme_plans')
      .select('*')
      .order('created_at', { ascending: true }) || { data: [], error: null }

    if (error) {
      console.error('❌ Erro ao buscar planos:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar planos' },
        { status: 500 }
      )
    }

    // Retornar planos encontrados (pode ser array vazio)
    console.log('✅ Planos encontrados no Supabase:', existingPlans?.length || 0)
    return NextResponse.json({ 
      plans: existingPlans || [],
      message: existingPlans && existingPlans.length > 0 
        ? `${existingPlans.length} planos encontrados`
        : 'Nenhum plano encontrado. Use POST /api/pagarme/plans/init para criar os planos.'
    })
  } catch (error: any) {
    console.error('Erro ao listar planos:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar planos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pagarme/plans
 * Cria um novo plano manualmente
 * ⚠️ ATENÇÃO: Apenas os 3 planos padrão são permitidos (monthly, quarterly, annual)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar que apenas os 3 tipos de plano permitidos podem ser criados
    const allowedPlanTypes = ['monthly', 'quarterly', 'annual']
    const planType = body.metadata?.plan_type
    
    if (planType && !allowedPlanTypes.includes(planType)) {
      return NextResponse.json(
        { 
          error: `Tipo de plano não permitido. Apenas os seguintes tipos são permitidos: ${allowedPlanTypes.join(', ')}`,
          allowed_types: allowedPlanTypes
        },
        { status: 400 }
      )
    }

    // Verificar se já existe um plano deste tipo
    if (planType) {
      const { data: existing } = await supabaseAdmin
        ?.from('pagarme_plans')
        .select('*')
        .eq('plan_type', planType)
        .maybeSingle() || { data: null }
      
      if (existing) {
        return NextResponse.json(
          { 
            error: `Já existe um plano do tipo '${planType}'. Use PUT para atualizar ou DELETE para remover antes de criar um novo.`,
            existing_plan: existing
          },
          { status: 409 }
        )
      }
    }
    
    const plan = await criarPlano(body)

    // Salvar no Supabase
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('pagarme_plans')
        .insert({
          pagarme_plan_id: plan.id,
          name: plan.name,
          description: plan.description,
          interval: plan.interval,
          interval_count: plan.interval_count,
          amount: plan.items[0].pricing_scheme.price / 100,
          plan_type: body.metadata?.plan_type || 'monthly',
          created_at: new Date().toISOString()
        })
    }

    return NextResponse.json({ plan })

  } catch (error: any) {
    console.error('Erro ao criar plano:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar plano' },
      { status: 500 }
    )
  }
}

