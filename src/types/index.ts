// Re-exportar tipos do Supabase
export type { 
  User, 
  Procedure, 
  Payment, 
  Report, 
  UserSettings,
  UserInsert,
  ProcedureInsert,
  PaymentInsert,
  ReportInsert,
  UserSettingsInsert,
  UserUpdate,
  ProcedureUpdate,
  PaymentUpdate,
  ReportUpdate,
  UserSettingsUpdate
} from '../lib/supabase';

// Tipos específicos para o frontend
export interface DashboardStats {
  totalProcedures: number;
  totalRevenue: number;
  pendingPayments: number;
  paidProcedures: number;
  monthlyRevenue: number;
  averageProcedureValue: number;
  proceduresThisMonth: number;
  revenueGrowth: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  procedures: number;
}

export interface ProcedureType {
  id: string;
  name: string;
  averageValue: number;
  description: string;
}

// Tipos para formulários
export interface ProcedureFormData {
  procedure_name: string;
  procedure_type: string;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: 'M' | 'F' | 'Other';
  procedure_date: string;
  procedure_time?: string;
  duration_minutes?: number;
  anesthesiologist_name?: string;
  surgeon_name?: string;
  hospital_clinic?: string;
  room_number?: string;
  procedure_value: number;
  payment_status?: 'pending' | 'paid' | 'cancelled' | 'refunded';
  payment_date?: string;
  payment_method?: string;
  notes?: string;
}

export interface PaymentFormData {
  amount: number;
  payment_type: 'procedure' | 'subscription' | 'refund';
  payment_method: 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash';
  payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_date?: string;
  due_date?: string;
  description?: string;
  procedure_id?: string;
}

export interface UserFormData {
  name: string;
  email: string;
  specialty?: string;
  crm?: string;
  phone?: string;
  avatar_url?: string;
}

// Tipos para filtros
export interface ProcedureFilters {
  startDate?: string;
  endDate?: string;
  procedureType?: string;
  paymentStatus?: string;
  hospital?: string;
  search?: string;
}

export interface PaymentFilters {
  startDate?: string;
  endDate?: string;
  paymentType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  search?: string;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  reportType?: string;
}

// Tipos para estatísticas
export interface ProcedureStats {
  total: number;
  totalValue: number;
  paidValue: number;
  pendingValue: number;
  averageValue: number;
  thisMonth: number;
  thisMonthValue: number;
}

export interface PaymentStats {
  total: number;
  totalAmount: number;
  completedAmount: number;
  pendingAmount: number;
  failedAmount: number;
  thisMonth: number;
  thisMonthAmount: number;
}

// Tipos para gráficos
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

// Tipos para notificações
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// Tipos para configurações
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'pt-BR' | 'en-US';
  currency: 'BRL' | 'USD';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

// Tipos para paginação
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tipos para API responses
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}