export type FinancialStatus = 'pending' | 'sent' | 'paid';

export interface FinancialSummary {
  totalProduced: number;
  totalReceived: number;
  totalPending: number;
  totalLate: number;
  procedureCount: number;
  averageReceiptDays: number;
}

export type NotificationType = 
  | 'pending_send' 
  | 'near_payment' 
  | 'late_payment' 
  | 'weekly_summary' 
  | 'monthly_summary' 
  | 'inconsistency'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  procedure_id?: string;
}
