import { z } from 'zod'

export const procedureSchema = z.object({
  // Campos obrigatórios com validação mínima
  procedure_name: z.string().min(1, 'O nome do procedimento é obrigatório'),
  procedure_value: z.number().nonnegative('O valor não pode ser negativo').optional().default(0),
  procedure_date: z.string().min(1, 'A data é obrigatória'),
  procedure_type: z.string().min(1, 'O tipo de procedimento é obrigatório'),
  
  // Paciente
  patient_name: z.string().min(1, 'O nome do paciente é obrigatório'),
  patient_age: z.number().int().min(0).max(150).optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  patient_gender: z.enum(['M', 'F', 'Other', '']).optional().nullable().default(''),
  convenio: z.string().optional().nullable().default('Particular'),
  carteirinha: z.string().optional().nullable(),

  // Equipe e Hospital
  anesthesiologist_name: z.string().optional().nullable(),
  nome_cirurgiao: z.string().optional().nullable(),
  surgeon_name: z.string().optional().nullable(),
  especialidade_cirurgiao: z.string().optional().nullable(),
  nome_equipe: z.string().optional().nullable(),
  hospital_clinic: z.string().optional().nullable().default('Não informado'),

  // Horários e Duração
  horario: z.string().optional().nullable(),
  procedure_time: z.string().optional().nullable(),
  duracao_minutos: z.number().int().nonnegative().optional().nullable(),
  duration_minutes: z.number().int().nonnegative().optional().nullable(),

  // IDs e Observações
  patient_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  observacoes_procedimento: z.string().optional().nullable(),
  observacoes_financeiras: z.string().optional().nullable(),
  
  // Contato e Feedback
  email_cirurgiao: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  telefone_cirurgiao: z.string().optional().nullable(),
  feedback_solicitado: z.boolean().optional().default(false),
  
  // Financeiro
  payment_status: z.enum(['pending', 'paid', 'cancelled', 'sent']).optional().default('pending'),
  payment_date: z.string().optional().nullable(),
  numero_parcelas: z.number().int().min(1).optional().nullable().default(1),
  forma_pagamento: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  user_id: z.string().uuid('ID de usuário inválido').optional(),

  // Campos de anestesia
  tecnica_anestesica: z.string().optional().nullable(),
  codigo_tssu: z.string().optional().nullable(),
  grupo_anestesico: z.string().optional().nullable(),

  // Clínicos
  sangramento: z.string().optional().nullable(),
  nausea_vomito: z.string().optional().nullable(),
  dor: z.string().optional().nullable(),

  // Obstétrico (opcionais)
  tipo_parto: z.enum(['Instrumentalizado', 'Vaginal', 'Cesariana']).optional().nullable(),
  tipo_cesariana: z.string().optional().nullable(),
  indicacao_cesariana: z.enum(['Sim', 'Não']).optional().nullable(),
  descricao_indicacao_cesariana: z.string().optional().nullable(),
  acompanhamento_antes: z.string().optional().nullable(),
  retencao_placenta: z.string().optional().nullable(),
  laceracao_presente: z.string().optional().nullable(),
  grau_laceracao: z.string().optional().nullable(),
  hemorragia_puerperal: z.string().optional().nullable(),
  transfusao_realizada: z.string().optional().nullable(),

  // Visibilidade
  show_to_secretary: z.boolean().optional().default(true),
})

// Tipo derivado do Schema (mantém o TS em sincronia com a validação)
export type ProcedureSchemaInput = z.infer<typeof procedureSchema>
