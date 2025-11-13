import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const pagarmeApiKey = process.env.PAGARME_API_KEY || ''

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
    const { card_number, card_holder_name, card_expiration_date, card_cvv } = await request.json()

    if (!card_number || !card_holder_name || !card_expiration_date || !card_cvv) {
      return NextResponse.json(
        { error: 'Dados do cartão incompletos' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }

    if (!pagarmeApiKey) {
      return NextResponse.json(
        { error: 'Configuração da Pagar.me não encontrada' },
        { status: 500 }
      )
    }

    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // A Pagar.me permite tokenização com chave secreta também
    // Vamos usar a chave secreta que já temos configurada
    if (!pagarmeApiKey) {
      console.error('❌ PAGARME_API_KEY não configurada')
      return NextResponse.json(
        { error: 'Chave da Pagar.me não configurada' },
        { status: 500 }
      )
    }

    console.log('🔑 Usando chave secreta para tokenização:', pagarmeApiKey.substring(0, 10) + '...')

    // Preparar Basic Auth com chave secreta
    const basicAuth = Buffer.from(`${pagarmeApiKey}:`).toString('base64')

    // A Pagar.me pode não ter endpoint REST para tokenização
    // Vamos criar o order diretamente sem tokenização prévia
    // O token será gerado durante a criação do order usando card_payment_payload
    // Mas primeiro, vamos tentar criar um card_hash usando a biblioteca deles via API
    
    // Estrutura alternativa: criar order com dados do cartão diretamente
    // Mas isso não é seguro. Vamos retornar erro informando que precisa usar SDK no frontend
    console.log('⚠️ Tokenização via API REST não suportada pela Pagar.me')
    console.log('📝 A Pagar.me requer tokenização no frontend usando biblioteca JavaScript')
    
    return NextResponse.json(
      { 
        error: 'Tokenização deve ser feita no frontend. Use o SDK da Pagar.me ou envie dados do cartão diretamente para criar order.',
        requires_frontend_tokenization: true
      },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Erro ao tokenizar cartão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar tokenização' },
      { status: 500 }
    )
  }
}

