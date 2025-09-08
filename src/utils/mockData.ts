import { Procedure, DashboardStats, MonthlyRevenue, ProcedureType } from '../types';

export const mockProcedures: Procedure[] = [
  {
    id: '1',
    name: 'Anestesia Geral - Cirurgia Cardíaca',
    description: 'Anestesia geral para cirurgia de revascularização miocárdica',
    value: 2500.00,
    date: new Date('2024-01-15'),
    patientName: 'Maria Silva Santos',
    patientAge: 65,
    patientGender: 'F',
    status: 'paid',
    paymentDate: new Date('2024-01-20'),
    notes: 'Paciente com hipertensão controlada',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    name: 'Anestesia Regional - Ortopedia',
    description: 'Bloqueio do plexo braquial para cirurgia de ombro',
    value: 1200.00,
    date: new Date('2024-01-18'),
    patientName: 'João Pedro Oliveira',
    patientAge: 45,
    patientGender: 'M',
    status: 'pending',
    notes: 'Paciente diabético tipo 2',
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: '3',
    name: 'Sedação Consciente - Endoscopia',
    description: 'Sedação para colonoscopia diagnóstica',
    value: 800.00,
    date: new Date('2024-01-20'),
    patientName: 'Ana Costa Lima',
    patientAge: 52,
    patientGender: 'F',
    status: 'paid',
    paymentDate: new Date('2024-01-22'),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-22')
  },
  {
    id: '4',
    name: 'Anestesia Geral - Neurocirurgia',
    description: 'Anestesia geral para craniotomia',
    value: 3200.00,
    date: new Date('2024-01-22'),
    patientName: 'Carlos Eduardo Mendes',
    patientAge: 38,
    patientGender: 'M',
    status: 'pending',
    notes: 'Paciente com epilepsia',
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22')
  },
  {
    id: '5',
    name: 'Anestesia Local - Dermatologia',
    description: 'Anestesia local para remoção de lesão',
    value: 300.00,
    date: new Date('2024-01-25'),
    patientName: 'Fernanda Rodrigues',
    patientAge: 29,
    patientGender: 'F',
    status: 'paid',
    paymentDate: new Date('2024-01-25'),
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25')
  }
];

export const mockDashboardStats: DashboardStats = {
  totalProcedures: 156,
  totalRevenue: 245800.00,
  pendingPayments: 15600.00,
  paidProcedures: 142,
  monthlyRevenue: 18750.00,
  averageProcedureValue: 1575.64,
  proceduresThisMonth: 12,
  revenueGrowth: 15.2
};

export const mockMonthlyRevenue: MonthlyRevenue[] = [
  { month: 'Jul', revenue: 18500, procedures: 11 },
  { month: 'Ago', revenue: 22100, procedures: 14 },
  { month: 'Set', revenue: 19800, procedures: 12 },
  { month: 'Out', revenue: 25600, procedures: 16 },
  { month: 'Nov', revenue: 23400, procedures: 15 },
  { month: 'Dez', revenue: 28900, procedures: 18 },
  { month: 'Jan', revenue: 18750, procedures: 12 }
];

export const mockProcedureTypes: ProcedureType[] = [
  {
    id: '1',
    name: 'Anestesia Geral',
    averageValue: 2200.00,
    description: 'Anestesia geral para cirurgias complexas'
  },
  {
    id: '2',
    name: 'Anestesia Regional',
    averageValue: 1200.00,
    description: 'Bloqueios regionais e periféricos'
  },
  {
    id: '3',
    name: 'Sedação Consciente',
    averageValue: 800.00,
    description: 'Sedação para procedimentos diagnósticos'
  },
  {
    id: '4',
    name: 'Anestesia Local',
    averageValue: 300.00,
    description: 'Anestesia local para procedimentos menores'
  },
  {
    id: '5',
    name: 'Anestesia Obstétrica',
    averageValue: 1500.00,
    description: 'Anestesia para partos e cesarianas'
  }
];
