import { sendWhatsAppMessage } from '../providers/whatsapp/meta';
import { supabaseAdmin } from '../supabase-server';
import { logger } from '../logger';

/**
 * Serviço profissional de monitoramento para o Administrador
 */
export const adminNotifier = {
  /**
   * Envia um alerta detalhado de erro para o WhatsApp do Administrador
   */
  async notifyError(phoneNumber: string, error: Error | string, location: string) {
    try {
      const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
      if (!adminNumber) {
        logger.warn('ADMIN_WHATSAPP_NUMBER não configurado nas variáveis de ambiente.');
        return;
      }

      // 1. Tentar identificar o usuário pelo número de telefone
      let userName = 'Usuário não identificado';
      try {
        const { data: account } = await supabaseAdmin
          .from('whatsapp_accounts')
          .select('user_id')
          .eq('phone_number', phoneNumber)
          .maybeSingle();

        if (account?.user_id) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('name')
            .eq('id', account.user_id)
            .maybeSingle();
          
          if (user?.name) userName = user.name;
        }
      } catch (dbError) {
        logger.error('Erro ao buscar nome do usuário para notificação admin', dbError);
      }

      const errorMessage = typeof error === 'string' ? error : error.message;
      const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // 2. Construir mensagem profissional
      const alertMsg = `🚨 *ALERTA DE ERRO - ANESTEASY*

👤 *Usuário:* ${userName}
📱 *WhatsApp:* ${phoneNumber}
📍 *Local:* ${location}
❌ *Erro:* ${errorMessage}
🕒 *Data:* ${date}

---
_Ação sugerida: Verificar logs na Vercel._`;

      await sendWhatsAppMessage(adminNumber, alertMsg);
      logger.info(`Notificação de erro enviada para admin (${adminNumber})`);
    } catch (err) {
      logger.error('Falha crítica ao enviar notificação para admin', err);
    }
  },

  /**
   * Notifica o admin quando um novo usuário inicia o cadastro (email ainda não confirmado)
   */
  async notifyNewUserRegistered(user: { name: string; email: string; specialty: string; crm: string }) {
    try {
      const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
      if (!adminNumber) return;

      const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const msg = `🆕 *NOVO CADASTRO - ANESTEASY*

👤 *Nome:* ${user.name}
📧 *Email:* ${user.email}
🩺 *Especialidade:* ${user.specialty || 'Não informada'}
🪪 *CRM:* ${user.crm || 'Não informado'}
✉️ *Email confirmado:* ⏳ Pendente
🕒 *Data:* ${date}

---
_Aguardando confirmação do email pelo usuário._`;

      await sendWhatsAppMessage(adminNumber, msg);
      logger.info(`Notificação de novo cadastro (pendente) enviada: ${user.email}`);
    } catch (err) {
      logger.error('Erro ao notificar admin sobre novo cadastro', err);
    }
  },

  /**
   * Notifica o admin quando o usuário confirma o email e a conta é ativada
   */
  async notifyNewUserConfirmed(user: { name: string; email: string; specialty: string; crm: string }) {
    try {
      const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
      if (!adminNumber) return;

      const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const msg = `✅ *EMAIL CONFIRMADO - ANESTEASY*

👤 *Nome:* ${user.name}
📧 *Email:* ${user.email}
🩺 *Especialidade:* ${user.specialty || 'Não informada'}
🪪 *CRM:* ${user.crm || 'Não informado'}
✉️ *Email confirmado:* ✅ Sim
🕒 *Data:* ${date}

---
_Conta ativada com trial de 7 dias. Acesse o painel admin._`;

      await sendWhatsAppMessage(adminNumber, msg);
      logger.info(`Notificação de email confirmado enviada: ${user.email}`);
    } catch (err) {
      logger.error('Erro ao notificar admin sobre confirmação de email', err);
    }
  },

  /**
   * Envia uma sugestão/feedback para o WhatsApp do Administrador
   */
  async notifySuggestion(userName: string, email: string, suggestion: string) {
    try {
      const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
      if (!adminNumber) {
        logger.warn('ADMIN_WHATSAPP_NUMBER não configurado.');
        return;
      }

      const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const msg = `💡 *NOVA SUGESTÃO - ANESTEASY*

👤 *Médico:* ${userName}
📧 *Email:* ${email}
📝 *Sugestão:* ${suggestion}
🕒 *Data:* ${date}

---
_Obrigado por ouvir nossos usuários!_`;

      await sendWhatsAppMessage(adminNumber, msg);
      logger.info('Sugestão enviada para o admin com sucesso.');
    } catch (err) {
      logger.error('Erro ao enviar sugestão para admin', err);
    }
  }
};
