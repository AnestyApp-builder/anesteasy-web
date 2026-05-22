import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    
    // Na prática, em uma versão final, aqui usaríamos um token no formato:
    // ?token=xxxxxx para autenticar a requisição pública.
    // Por hora, apenas retornamos os dados abertamente se o grupo existir,
    // já que é um endpoint read-only exportável via link de compartilhamento.
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    // Validar se o grupo existe e está ativo (token opcional para futuro)
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', groupId)
      .eq('is_active', true)
      .single()

    if (groupError || !group) {
      return new NextResponse('Grupo não encontrado ou inativo', { status: 404 })
    }

    // Buscar procedimentos
    const { data: procedures, error: procError } = await supabase
      .from('procedures')
      .select('id, procedure_date, horario, procedure_name, patient_name, hospital_clinic, anesthesiologist_name, procedure_value')
      .eq('group_id', groupId)
      .order('procedure_date', { ascending: false })

    if (procError) {
      return new NextResponse('Erro ao buscar procedimentos', { status: 500 })
    }

    // Criar CSV
    // Cabeçalho
    const headers = ['Data', 'Horário', 'Procedimento', 'Paciente', 'Hospital/Clínica', 'Anestesista', 'Valor']
    
    const rows = (procedures || []).map(p => {
      // Formatar data
      let dataFormatada = p.procedure_date || ''
      if (dataFormatada.includes('-')) {
        const [ano, mes, dia] = dataFormatada.split('T')[0].split('-')
        dataFormatada = `${dia}/${mes}/${ano}`
      }

      // Remover aspas e quebras de linha para evitar quebrar o CSV
      const cleanString = (str: any) => {
        if (!str) return ''
        return `"${String(str).replace(/"/g, '""').replace(/\n/g, ' ')}"`
      }

      return [
        cleanString(dataFormatada),
        cleanString(p.horario),
        cleanString(p.procedure_name),
        cleanString(p.patient_name),
        cleanString(p.hospital_clinic),
        cleanString(p.anesthesiologist_name),
        p.procedure_value || 0
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')

    // Retornar como texto/csv para o IMPORTDATA do Sheets
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="agenda_grupo_${group.name.replace(/ /g, '_')}.csv"`,
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Erro na exportação CSV:', error)
    return new NextResponse('Erro interno do servidor', { status: 500 })
  }
}
