import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { financialService } from '@/lib/financial/service';
import { notificationService } from '@/lib/notifications/notification-service';

export async function GET(request: Request) {
  // Verificar se a requisição tem o header de autorização do Cron (ex: Vercel ou Supabase)
  // No mundo real, você usaria uma variável de ambiente: 
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

  try {
    // 1. Buscar todos os usuários ativos (que tiveram procedimentos nas últimas semanas)
    // Para simplificar, vamos buscar todos os usuários que têm assinatura ativa
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('subscription_status', 'active');

    if (usersError) throw usersError;

    const results = [];

    for (const user of users) {
      // 2. Calcular resumo semanal
      const summary = await financialService.getFinancialSummary(user.id, 'weekly');

      // Só notificar se houver movimentação
      if (summary.procedureCount > 0 || summary.totalPending > 0) {
        const message = `
💰 Produzido: R$ ${summary.totalProduced.toFixed(2)}
💵 Recebido: R$ ${summary.totalReceived.toFixed(2)}
⚠️ Pendente: R$ ${summary.totalPending.toFixed(2)}
        `.trim();

        await notificationService.createNotification({
          user_id: user.id,
          type: 'weekly_summary',
          title: 'Resumo Financeiro da Semana',
          message: message
        });

        results.push({ user_id: user.id, status: 'notified' });
      }
    }

    return NextResponse.json({ success: true, processed: results.length });
  } catch (error: any) {
    console.error('Weekly Summary Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
