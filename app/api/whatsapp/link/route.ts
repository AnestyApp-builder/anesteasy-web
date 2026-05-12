import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST: Gera um código de vinculação para o usuário autenticado
 */
export async function POST(req: NextRequest) {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Validar usuário via Supabase
    const { createClient: createBrowserClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Verificar se já existe uma conta vinculada
    const { data: existing } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('id, phone_number, verified')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.verified) {
      return NextResponse.json({
        error: 'Você já possui um WhatsApp vinculado. Desvincule primeiro.',
        linked: true,
        phone_number: existing.phone_number
      }, { status: 409 });
    }

    // Se já existe mas não verificado, atualizar código
    if (existing) {
      await supabaseAdmin
        .from('whatsapp_accounts')
        .update({
          verification_code: code,
          verification_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Criar entrada pendente (sem phone_number ainda)
      await supabaseAdmin
        .from('whatsapp_accounts')
        .insert({
          user_id: user.id,
          phone_number: 'pending',
          verification_code: code,
          verification_expires_at: expiresAt.toISOString(),
          verified: false
        });
    }

    // Buscar nome do médico para personalização
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      code,
      expires_in_minutes: 10,
      bot_number: process.env.WHATSAPP_BOT_DISPLAY_NUMBER || '+1 (555) 637-8470',
      instructions: `Envie o código ${code} para o número do bot no WhatsApp.`,
      doctor_name: userData?.name || 'Doutor(a)'
    });

  } catch (error: any) {
    console.error('Error generating WA link code:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar código' }, { status: 500 });
  }
}

/**
 * GET: Verifica o status da vinculação do usuário autenticado
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { createClient: createBrowserClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({
      linked: account.verified,
      phone_number: account.verified ? account.phone_number : null,
      pending_verification: !account.verified && account.verification_code != null,
      created_at: account.created_at
    });

  } catch (error: any) {
    console.error('Error checking WA link:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * DELETE: Desvincula o WhatsApp do usuário
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { createClient: createBrowserClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('whatsapp_accounts')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'WhatsApp desvinculado com sucesso.' });

  } catch (error: any) {
    console.error('Error unlinking WA:', error);
    return NextResponse.json({ error: 'Erro ao desvincular' }, { status: 500 });
  }
}
