import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validateSecretaryToken, checkRateLimit } from '@/lib/secretary-auth'

/**
 * GET /api/secretary/procedures?token=XYZ
 * Lista procedimentos associados ao médico do token
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'

  // Proteção contra brute force
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente mais tarde.' }, { status: 429 })
  }

  // Validar token
  const access = await validateSecretaryToken(token || '', ip)
  if (!access) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 403 })
  }

  const supabase = createAdminClient()

  try {
    // Filtros padrão para performance e utilidade (não pagos + últimos 60 dias)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const { data, error } = await supabase
      .from('procedures')
      .select(`
        id, 
        patient_name, 
        procedure_name, 
        procedure_value, 
        procedure_date, 
        payment_status, 
        payment_date, 
        updated_at, 
        updated_by,
        procedure_attachments (
          id,
          file_name,
          file_url,
          file_type
        )
      `)
      .eq('user_id', access.userId)
      .eq('show_to_secretary', true)
      .or(`payment_status.neq.paid,procedure_date.gte.${sixtyDaysAgo.toISOString().split('T')[0]}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar procedimentos:', error)
      return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 })
    }

    // Buscar o nome do médico para o contexto da UI
    const { data: doctor } = await supabase
      .from('users')
      .select('name')
      .eq('id', access.userId)
      .single()

    return NextResponse.json({
      procedures: data,
      doctorName: doctor?.name || 'Médico',
      permissions: access.permissions
    })

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/secretary/procedures
 * Atualiza o status de pagamento de um procedimento
 */
export async function PATCH(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
  const { token, procedureId, status, paymentDate, notes, value } = await request.json()

  // Validar token
  const access = await validateSecretaryToken(token || '', ip)
  if (!access || !access.permissions.can_update_status) {
    return NextResponse.json({ error: 'Acesso negado ou permissão insuficiente' }, { status: 403 })
  }

  const supabase = createAdminClient()

  // Validação explícita de campos e valores permitidos
  const allowedStatuses = ['pending', 'paid', 'cancelled', 'sent']
  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  try {
    // Verificar se o procedimento pertence ao médico do token
    const { data: proc, error: fetchError } = await supabase
      .from('procedures')
      .select('user_id')
      .eq('id', procedureId)
      .single()

    if (fetchError || proc.user_id !== access.userId) {
      return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
    }

    // Preparar atualização (apenas campos permitidos)
    const updates: any = {
      updated_at: new Date().toISOString(),
      updated_by: 'secretary'
    }
    
    if (status) {
      updates.payment_status = status
      if (status === 'sent') updates.sent_at = new Date().toISOString()
      if (status === 'paid') updates.paid_at = new Date().toISOString()
    }
    if (paymentDate) updates.payment_date = paymentDate
    if (notes) updates.notes = notes
    if (value !== undefined) updates.procedure_value = value

    const { error: updateError } = await supabase
      .from('procedures')
      .update(updates)
      .eq('id', procedureId)

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar procedimento' }, { status: 500 })
    }

    // Criar notificação para o médico
    if (status) {
      const { data: procedure } = await supabase
        .from('procedures')
        .select('patient_name')
        .eq('id', procedureId)
        .single()

      const statusLabels: Record<string, string> = {
        'sent': 'Enviado',
        'paid': 'Pago',
        'cancelled': 'Cancelado',
        'pending': 'Pendente'
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: access.userId,
          title: `Status Atualizado: ${statusLabels[status] || status}`,
          message: `O procedimento de ${procedure?.patient_name || 'paciente'} foi marcado como ${statusLabels[status] || status} pela secretária.`,
          type: status === 'paid' ? 'success' : (status === 'sent' ? 'info' : 'warning'),
          is_read: false
        })
    }
    
    // Notificação para alteração de valor
    if (value !== undefined) {
      const { data: procedure } = await supabase
        .from('procedures')
        .select('patient_name')
        .eq('id', procedureId)
        .single()

      await supabase
        .from('notifications')
        .insert({
          user_id: access.userId,
          title: `Valor Atualizado pela Secretária`,
          message: `O valor do procedimento de ${procedure?.patient_name || 'paciente'} foi ajustado para ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} pela secretária.`,
          type: 'info',
          is_read: false
        })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
