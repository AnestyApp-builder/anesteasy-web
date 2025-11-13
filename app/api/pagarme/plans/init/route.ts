import { NextRequest, NextResponse } from 'next/server'
import { criarPlano } from '@/lib/pagarme-subscriptions'
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
 * POST /api/pagarme/plans/init
 * Endpoint de inicialização - Cria os 3 planos automaticamente
 * ⚠️ ATENÇÃO: Este endpoint não requer autenticação (apenas para desenvolvimento)
 * Em produção, considere proteger com uma chave secreta
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Inicializando criação de planos...')

    // Verificar se já existem planos e validar se existem na Pagar.me
    const { data: existingPlans } = await supabaseAdmin
      ?.from('pagarme_plans')
      .select('*')
      .order('created_at', { ascending: true }) || { data: [] }

    // Validar se os planos existem na Pagar.me
    if (existingPlans && existingPlans.length >= 3) {
      const { obterPlano } = await import('@/lib/pagarme-subscriptions')
      let allPlansValid = true
      
      for (const plan of existingPlans) {
        try {
          await obterPlano(plan.pagarme_plan_id)
        } catch (error) {
          console.log(`⚠️ Plano ${plan.pagarme_plan_id} não existe na Pagar.me, será recriado`)
          allPlansValid = false
          break
        }
      }
      
      if (allPlansValid) {
        console.log('✅ Planos já existem e são válidos:', existingPlans.length)
        return NextResponse.json({ 
          message: 'Planos já existem',
          plans: existingPlans 
        })
      } else {
        // Limpar planos inválidos antes de recriar
        console.log('🗑️ Limpando planos inválidos...')
        await supabaseAdmin?.from('pagarme_plans').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }
    }

    // Criar planos na Pagar.me
    const plansToCreate = [
      {
        name: 'Plano Mensal - AnestEasy',
        description: 'Assinatura mensal do AnestEasy',
        interval: 'month' as const,
        interval_count: 1,
        billing_type: 'prepaid' as const,
        currency: 'BRL',
        items: [{
          name: 'Assinatura Mensal',
          quantity: 1,
          pricing_scheme: {
            scheme_type: 'unit' as const,
            price: 7900 // R$ 79,00 em centavos
          }
        }],
        metadata: {
          plan_type: 'monthly',
          plan_name: 'Mensal'
        }
      },
      {
        name: 'Plano Trimestral - AnestEasy',
        description: 'Assinatura trimestral do AnestEasy (3 meses)',
        interval: 'month' as const,
        interval_count: 3,
        billing_type: 'prepaid' as const,
        currency: 'BRL',
        items: [{
          name: 'Assinatura Trimestral',
          quantity: 1,
          pricing_scheme: {
            scheme_type: 'unit' as const,
            price: 19900 // R$ 199,00 em centavos (desconto de 5%)
          }
        }],
        metadata: {
          plan_type: 'quarterly',
          plan_name: 'Trimestral'
        }
      },
      {
        name: 'Plano Anual - AnestEasy',
        description: 'Assinatura anual do AnestEasy (12 meses)',
        interval: 'year' as const,
        interval_count: 1,
        billing_type: 'prepaid' as const,
        currency: 'BRL',
        items: [{
          name: 'Assinatura Anual',
          quantity: 1,
          pricing_scheme: {
            scheme_type: 'unit' as const,
            price: 69000 // R$ 690,00 em centavos (desconto de 10%)
          }
        }],
        metadata: {
          plan_type: 'annual',
          plan_name: 'Anual'
        }
      }
    ]

    const createdPlans = []
    const errors = []

    for (const planData of plansToCreate) {
      try {
        // Verificar se já existe no Supabase
        const { data: existing } = await supabaseAdmin
          ?.from('pagarme_plans')
          .select('*')
          .eq('plan_type', planData.metadata.plan_type)
          .maybeSingle() || { data: null }

        if (existing) {
          console.log(`⏭️  Plano ${planData.metadata.plan_type} já existe, pulando...`)
          createdPlans.push(existing)
          continue
        }

        const plan = await criarPlano(planData)
        
        // Salvar no Supabase
        if (supabaseAdmin) {
          const { error: insertError } = await supabaseAdmin
            .from('pagarme_plans')
            .insert({
              pagarme_plan_id: plan.id,
              name: plan.name,
              description: plan.description,
              interval: plan.interval,
              interval_count: plan.interval_count,
              amount: plan.items[0].pricing_scheme.price / 100,
              plan_type: plan.metadata?.plan_type || 'monthly',
              created_at: new Date().toISOString()
            })

          if (insertError) {
            console.error(`❌ Erro ao salvar plano ${planData.name} no Supabase:`, insertError)
            errors.push({ plan: planData.name, error: insertError.message })
          } else {
            createdPlans.push(plan)
            console.log(`✅ Plano criado: ${plan.name} (ID: ${plan.id})`)
          }
        }
      } catch (error: any) {
        console.error(`❌ Erro ao criar plano ${planData.name}:`, error.message)
        errors.push({ plan: planData.name, error: error.message })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `${createdPlans.length} planos criados com sucesso`,
      plans: createdPlans,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Erro ao inicializar planos:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erro ao processar planos' 
      },
      { status: 500 }
    )
  }
}

