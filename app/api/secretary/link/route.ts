import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateToken, hashToken } from '@/lib/secretary-auth'

/**
 * POST /api/secretary/link
 * Gera ou regenera um link de acesso para secretária
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Verificar se o usuário está autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { permissions } = await request.json().catch(() => ({}))

    // Revogar links anteriores
    await supabase
      .from('shared_links')
      .update({ revoked: true })
      .eq('user_id', user.id)
      .eq('revoked', false)

    // Gerar novo token
    const token = generateToken()
    const tokenHash = hashToken(token)
    
    // Definir expiração (ex: 90 dias por padrão para secretária)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    // Salvar no banco
    const { error: insertError } = await supabase
      .from('shared_links')
      .insert({
        user_id: user.id,
        token: token,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        permissions: permissions || { can_update_status: true, view_values: true },
        revoked: false
      })

    if (insertError) {
      console.error('Erro ao salvar link:', insertError)
      return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
    }

    // Retornar a URL completa
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
    const fullUrl = `${origin}/secretaria/${token}`

    return NextResponse.json({ 
      url: fullUrl,
      token: token,
      expires_at: expiresAt.toISOString()
    })

  } catch (error) {
    console.error('Erro interno no servidor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * GET /api/secretary/link
 * Retorna o link atual se existir e não estiver revogado
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('shared_links')
    .select('id, token, expires_at, permissions, created_at')
    .eq('user_id', user.id)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ activeLink: false })
  }

  return NextResponse.json({ 
    activeLink: true,
    id: data.id,
    token: data.token,
    expires_at: data.expires_at,
    permissions: data.permissions,
    created_at: data.created_at
  })
}
