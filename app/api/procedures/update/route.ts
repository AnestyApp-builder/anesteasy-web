import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * API para atualizar um procedimento com criptografia (LGPD)
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ error: 'id e updates são obrigatórios' }, { status: 400 });
    }

    // Criptografar campos sensíveis se estiverem presentes nos updates
    const encryptedUpdates = { ...updates };
    if (updates.patient_name) {
      encryptedUpdates.patient_name = encrypt(updates.patient_name);
    }

    const { data, error } = await supabaseAdmin
      .from('procedures')
      .update({ ...encryptedUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API-PROCEDURE-UPDATE] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
