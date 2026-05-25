import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { encrypt } from '@/lib/security'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const cookieStore = await cookies()
    const secretaryId = cookieStore.get('secretary_session_id')?.value

    const body = await req.json()
    const { procedureIds, groupId, updates } = body

    if (!procedureIds || !Array.isArray(procedureIds) || procedureIds.length === 0 || !groupId || !updates) {
      return NextResponse.json({ error: 'procedureIds, groupId e updates são obrigatórios' }, { status: 400 })
    }

    let authorized = false

    // 1. Validar por sessão de secretária
    if (secretaryId) {
      const { data: secretary, error: secError } = await supabaseAdmin
        .from('secretarias')
        .select('id, status, group_id')
        .eq('id', secretaryId)
        .eq('type', 'grupo')
        .single()

      if (!secError && secretary && secretary.status === 'ativo' && secretary.group_id === groupId) {
        // Verificar se tem permissão de procedures ou patients
        const { data: perm, error: permError } = await supabaseAdmin
          .from('group_secretary_permissions')
          .select('id')
          .eq('secretary_id', secretaryId)
          .in('module', ['procedures', 'patients'])
          .maybeSingle()

        if (!permError && perm) {
          authorized = true
        }
      }
    } else {
      // 2. Validar por sessão de anestesista
      const supabaseUser = await createClient()
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

      if (!authError && user) {
        // Verificar se o usuário é membro do grupo
        const { data: member, error: memberError } = await supabaseAdmin
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!memberError && member) {
          authorized = true
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Não autorizado para editar cadastros neste grupo' }, { status: 403 })
    }

    // 3. Preparar atualizações, limpar campos vazios e criptografar
    const dbUpdates = { ...updates } as Record<string, any>
    for (const key of Object.keys(dbUpdates)) {
      if (dbUpdates[key] === '') {
        dbUpdates[key] = null
      }
    }

    // Criptografar campos do paciente se presentes (LGPD)
    const sensitiveFields = ['patient_name', 'patient_phone', 'patient_email', 'patient_notes', 'patient_companion', 'patient_companion_phone']
    for (const field of sensitiveFields) {
      if (dbUpdates[field] !== undefined) {
        if (dbUpdates[field]) {
          dbUpdates[field] = encrypt(dbUpdates[field])
        } else {
          dbUpdates[field] = null
        }
      }
    }

    dbUpdates.updated_at = new Date().toISOString()

    // 4. Executar atualização em massa
    const { data, error: updateError } = await supabaseAdmin
      .from('procedures')
      .update(dbUpdates)
      .in('id', procedureIds)
      .eq('group_id', groupId)
      .select()

    if (updateError) throw updateError

    return NextResponse.json({ success: true, count: data?.length || 0 })
  } catch (error: any) {
    console.error('[API-PROCEDURES-UPDATE-BULK] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
