import { supabase } from '../supabase';
import { NotificationType, AppNotification } from '../financial/types';
import { financialService } from '../financial/service';

export const notificationService = {
  /**
   * Cria uma notificação no sistema
   */
  async createNotification(data: {
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    procedure_id?: string;
  }) {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        procedure_id: data.procedure_id,
        is_read: false
      });

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }
    return true;
  },

  /**
   * Gera notificações inteligentes baseadas nas regras financeiras
   */
  async generateIntelligentNotifications(userId: string) {
    // 1. Procedimentos não enviados há > 7 dias
    const pendingProcedures = await financialService.getPendingProcedures(userId);
    if (pendingProcedures.length > 0) {
      await this.upsertFinancialNotification(userId, 'pending_send', 
        'Procedimentos Pendentes de Envio', 
        `Você possui ${pendingProcedures.length} procedimentos aguardando envio para cobrança há mais de uma semana.`
      );
    }

    // 2. Pagamentos em atraso
    const latePayments = await financialService.getLatePayments(userId);
    if (latePayments.length > 0) {
      const totalLate = latePayments.reduce((acc, p) => acc + (p.procedure_value || 0), 0);
      await this.upsertFinancialNotification(userId, 'late_payment', 
        'Atraso no Recebimento', 
        `Existem ${latePayments.length} procedimentos com pagamento atrasado, totalizando R$ ${totalLate.toFixed(2)}.`
      );
    }

    // 3. Próximos do vencimento
    const nearPayments = await financialService.getNearPayments(userId);
    if (nearPayments.length > 0) {
      await this.upsertFinancialNotification(userId, 'near_payment', 
        'Recebimentos Próximos', 
        `${nearPayments.length} procedimentos devem ser pagos nos próximos 5 dias.`
      );
    }
  },

  /**
   * Helper para evitar notificações duplicadas (atualiza se já existe uma não lida do mesmo tipo)
   */
  async upsertFinancialNotification(userId: string, type: NotificationType, title: string, message: string) {
    // Verificar se já existe qualquer notificação deste tipo nas últimas 24h (lida ou não)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: existing } = await supabase
      .from('notifications')
      .select('id, is_read')
      .eq('user_id', userId)
      .eq('type', type)
      .gt('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      // Já existe uma notificação recente deste tipo
      if (existing[0].is_read) {
        // Usuário já leu → não incomodar até amanhã
        return;
      }
      // Ainda não lida → atualizar a mensagem com os dados mais recentes
      await supabase
        .from('notifications')
        .update({ message, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id);
    } else {
      // Não existe notificação recente → criar nova
      await this.createNotification({ user_id: userId, type, title, message });
    }
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    return !error;
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    return error ? 0 : count;
  }
};
