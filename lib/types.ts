export interface User {
  id: string
  email: string
  name: string
  specialty: string
  crm: string
  gender: string | null
  phone?: string | null
  cpf?: string | null
}

export interface ProcedureInsert {
  // Campos obrigatórios
  procedure_name: string
  procedure_value?: number
  procedure_date: string
  procedure_type: string
  
  // Campos do paciente
  patient_name: string
  patient_age?: number
  data_nascimento?: string | null
  patient_gender?: 'M' | 'F' | 'Other' | ''
  convenio?: string
  carteirinha?: string
  
  // Campos da equipe
  anesthesiologist_name?: string
  nome_cirurgiao?: string
  surgeon_name?: string
  especialidade_cirurgiao?: string
  nome_equipe?: string
  hospital_clinic?: string
  
  // Campos de horário e duração
  horario?: string
  procedure_time?: string
  duracao_minutos?: number
  duration_minutes?: number
  
  // Campos do procedimento (não-obstétrico)
  sangramento?: 'Sim' | 'Não'
  nausea_vomito?: 'Sim' | 'Não'
  dor?: 'Sim' | 'Não'
  observacoes_procedimento?: string
  
  // Campos do procedimento (obstétrico)
  acompanhamento_antes?: 'Sim' | 'Não'
  tipo_parto?: 'Instrumentalizado' | 'Vaginal' | 'Cesariana'
  tipo_cesariana?: 'Nova Ráqui' | 'Geral' | 'Complementação pelo Cateter' | 'Raquianestesia'
  indicacao_cesariana?: 'Sim' | 'Não'
  descricao_indicacao_cesariana?: string
  retencao_placenta?: 'Sim' | 'Não'
  laceracao_presente?: 'Sim' | 'Não'
  grau_laceracao?: '1' | '2' | '3' | '4'
  hemorragia_puerperal?: 'Sim' | 'Não'
  transfusao_realizada?: 'Sim' | 'Não'
  
  // Campos financeiros
  payment_status?: 'pending' | 'paid' | 'cancelled' | 'sent'
  payment_date?: string
  forma_pagamento?: string
  payment_method?: string
  numero_parcelas?: number
  parcelas_recebidas?: number
  observacoes_financeiras?: string
  user_id?: string

  // Campos de anestesia
  tecnica_anestesica?: string
  codigo_tssu?: string
  grupo_anestesico?: string

  // Campos de feedback
  feedback_solicitado?: boolean
  email_cirurgiao?: string
  telefone_cirurgiao?: string
  sent_at?: string
  paid_at?: string
  expected_payment_date?: string
  show_to_secretary?: boolean
}
