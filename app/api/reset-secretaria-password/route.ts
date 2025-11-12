import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Esta rota requer service role key para atualizar senha de usuários
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
}

// Criar cliente com permissões de service role (bypass RLS)
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
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }

    const { secretariaId, newPassword } = await request.json()

    if (!secretariaId || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'secretariaId e newPassword são obrigatórios' },
        { status: 400 }
      )
    }

    // Atualizar senha usando Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      secretariaId,
      {
        password: newPassword,
        user_metadata: {
          mustChangePassword: true // Marcar que precisa trocar senha
        }
      }
    )

    if (error) {
      console.error('Erro ao atualizar senha da secretaria:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Senha atualizada com sucesso'
    })
  } catch (error) {
    console.error('Erro interno ao resetar senha:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao resetar senha' },
      { status: 500 }
    )
  }
}

