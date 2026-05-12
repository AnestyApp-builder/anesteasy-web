import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * API para obter um único procedimento com descriptografia (LGPD)
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('procedures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // Descriptografar
    const decryptedData = {
      ...data,
      patient_name: decrypt(data.patient_name || ''),
    };

    return NextResponse.json(decryptedData);
  } catch (error: any) {
    console.error('[API-PROCEDURE-GET] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
