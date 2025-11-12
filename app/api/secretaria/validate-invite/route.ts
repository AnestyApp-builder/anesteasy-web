import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token é obrigatório' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }

    // Buscar convite
    const { data: invite, error: inviteError } = await supabase
      .from('secretaria_invites')
      .select('id, email, expires_at, used_at, anestesista_id')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { success: false, error: 'Convite inválido ou não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já foi usado
    if (invite.used_at) {
      return NextResponse.json(
        { success: false, error: 'Este convite já foi utilizado' },
        { status: 400 }
      )
    }

    // Verificar se expirou
    const expiresAt = new Date(invite.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este convite expirou' },
        { status: 400 }
      )
    }

    // Verificar se email já está cadastrado como secretária
    const { data: existingSecretaria } = await supabase
      .from('secretarias')
      .select('id, email')
      .eq('email', invite.email)
      .maybeSingle()

    if (existingSecretaria) {
      return NextResponse.json(
        { success: false, error: 'Este email já está cadastrado como secretária' },
        { status: 400 }
      )
    }

    // Buscar dados do anestesista que enviou o convite
    const { data: anestesista } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', invite.anestesista_id)
      .single()

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        expiresAt: invite.expires_at,
        anestesista: anestesista ? {
          name: anestesista.name,
          email: anestesista.email
        } : null
      }
    })

  } catch (error) {
    console.error('Erro ao validar convite:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao validar convite' },
      { status: 500 }
    )
  }
}

