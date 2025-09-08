import { supabase } from '../lib/supabase';
import { createAuditToken } from '../utils/security';

export interface AuditLog {
  id?: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  success: boolean;
  error_message?: string;
}

export interface AuditFilters {
  startDate?: string;
  endDate?: string;
  action?: string;
  resourceType?: string;
  success?: boolean;
}

class AuditService {
  private auditToken: string | null = null;

  /**
   * Inicializa o token de auditoria para a sessão
   */
  initializeAudit(userId: string, operation: string): void {
    this.auditToken = createAuditToken(userId, operation);
  }

  /**
   * Registra uma ação de auditoria
   */
  async logAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any,
    success: boolean = true,
    errorMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const auditLog: Omit<AuditLog, 'id'> = {
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: details ? JSON.stringify(details) : null,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        success,
        error_message: errorMessage
      };

      // Em produção, salvar em uma tabela de auditoria
      // Por enquanto, apenas log no console
      console.log('Audit Log:', {
        token: this.auditToken,
        ...auditLog
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar auditoria:', error);
      return { success: false, error: 'Erro ao registrar auditoria' };
    }
  }

  /**
   * Registra tentativa de acesso negado
   */
  async logAccessDenied(
    userId: string,
    resourceType: string,
    resourceId?: string,
    reason?: string
  ): Promise<void> {
    await this.logAction(
      userId,
      'ACCESS_DENIED',
      resourceType,
      resourceId,
      { reason },
      false,
      reason
    );
  }

  /**
   * Registra operação de criação
   */
  async logCreate(
    userId: string,
    resourceType: string,
    resourceId: string,
    details?: any
  ): Promise<void> {
    await this.logAction(
      userId,
      'CREATE',
      resourceType,
      resourceId,
      details,
      true
    );
  }

  /**
   * Registra operação de leitura
   */
  async logRead(
    userId: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    await this.logAction(
      userId,
      'READ',
      resourceType,
      resourceId,
      details,
      true
    );
  }

  /**
   * Registra operação de atualização
   */
  async logUpdate(
    userId: string,
    resourceType: string,
    resourceId: string,
    details?: any
  ): Promise<void> {
    await this.logAction(
      userId,
      'UPDATE',
      resourceType,
      resourceId,
      details,
      true
    );
  }

  /**
   * Registra operação de exclusão
   */
  async logDelete(
    userId: string,
    resourceType: string,
    resourceId: string,
    details?: any
  ): Promise<void> {
    await this.logAction(
      userId,
      'DELETE',
      resourceType,
      resourceId,
      details,
      true
    );
  }

  /**
   * Registra erro de operação
   */
  async logError(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    error: any = null
  ): Promise<void> {
    await this.logAction(
      userId,
      action,
      resourceType,
      resourceId,
      { error: error?.message || 'Erro desconhecido' },
      false,
      error?.message || 'Erro desconhecido'
    );
  }

  /**
   * Registra login do usuário
   */
  async logLogin(userId: string, success: boolean, errorMessage?: string): Promise<void> {
    await this.logAction(
      userId,
      'LOGIN',
      'USER',
      userId,
      { success },
      success,
      errorMessage
    );
  }

  /**
   * Registra logout do usuário
   */
  async logLogout(userId: string): Promise<void> {
    await this.logAction(
      userId,
      'LOGOUT',
      'USER',
      userId,
      {},
      true
    );
  }

  /**
   * Registra tentativa de acesso a dados de outro usuário
   */
  async logDataBreachAttempt(
    userId: string,
    targetUserId: string,
    resourceType: string,
    resourceId?: string
  ): Promise<void> {
    await this.logAction(
      userId,
      'DATA_BREACH_ATTEMPT',
      resourceType,
      resourceId,
      { 
        target_user_id: targetUserId,
        severity: 'HIGH',
        description: 'Tentativa de acesso a dados de outro usuário'
      },
      false,
      'Tentativa de acesso a dados de outro usuário'
    );
  }

  /**
   * Registra alteração de configurações de segurança
   */
  async logSecurityChange(
    userId: string,
    changeType: string,
    details?: any
  ): Promise<void> {
    await this.logAction(
      userId,
      'SECURITY_CHANGE',
      'USER_SETTINGS',
      userId,
      { change_type: changeType, ...details },
      true
    );
  }

  /**
   * Obtém o IP do cliente (simulado)
   */
  private async getClientIP(): Promise<string> {
    try {
      // Em produção, usar um serviço real de IP
      return '127.0.0.1';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Busca logs de auditoria (apenas para administradores)
   */
  async getAuditLogs(
    filters?: AuditFilters,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ data: AuditLog[]; error: string | null; count?: number }> {
    try {
      // Em produção, implementar busca real na tabela de auditoria
      // Por enquanto, retornar array vazio
      return { data: [], error: null, count: 0 };
    } catch (error) {
      return { data: [], error: 'Erro ao buscar logs de auditoria', count: 0 };
    }
  }

  /**
   * Gera relatório de auditoria
   */
  async generateAuditReport(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: any; error: string | null }> {
    try {
      // Em produção, gerar relatório real
      const report = {
        user_id: userId,
        period: { start_date: startDate, end_date: endDate },
        total_actions: 0,
        successful_actions: 0,
        failed_actions: 0,
        access_denied: 0,
        data_breach_attempts: 0,
        actions_by_type: {},
        generated_at: new Date().toISOString()
      };

      return { data: report, error: null };
    } catch (error) {
      return { data: null, error: 'Erro ao gerar relatório de auditoria' };
    }
  }
}

export const auditService = new AuditService();
