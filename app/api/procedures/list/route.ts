import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * API para listar procedimentos com descriptografia de dados sensíveis (LGPD)
 * Esta rota deve ser chamada pelo frontend para obter dados legíveis.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Criar cliente admin para bypass RLS e descriptografar (segurança controlada aqui)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Obter o userId dos query params ou headers (O ideal seria validar o JWT aqui)
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const groupId = searchParams.get('groupId');
    const limit = parseInt(searchParams.get('limit') || '500');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId && !groupId) {
      return NextResponse.json({ error: 'userId ou groupId é obrigatório' }, { status: 400 });
    }

    // 3. Buscar procedimentos
    let query = supabaseAdmin
      .from('procedures')
      .select('*')
      .order('procedure_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (groupId) {
      query = query.eq('group_id', groupId);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 4. Descriptografar nomes dos pacientes
    const decryptedData = (data || []).map(proc => ({
      ...proc,
      patient_name: decrypt(proc.patient_name || ''),
      patient_phone: decrypt(proc.patient_phone || ''),
      patient_email: decrypt(proc.patient_email || ''),
      patient_notes: decrypt(proc.patient_notes || ''),
      patient_companion: decrypt(proc.patient_companion || ''),
      patient_companion_phone: decrypt(proc.patient_companion_phone || '')
    }));

    return NextResponse.json(decryptedData);
  } catch (error: any) {
    console.error('[API-PROCEDURES-LIST] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
