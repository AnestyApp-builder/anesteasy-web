'use client'

import { X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/badge'

interface VoiceExtractionDisplayProps {
  transcription?: string
  extractedFields?: Record<string, any>
  onClose?: () => void
}

export function VoiceExtractionDisplay({ 
  transcription, 
  extractedFields, 
  onClose 
}: VoiceExtractionDisplayProps) {
  if (!transcription && !extractedFields) {
    return null
  }

  const fieldLabels: Record<string, string> = {
    procedure_name: 'Nome do Procedimento',
    procedure_type: 'Tipo de Procedimento',
    patient_name: 'Nome do Paciente',
    patient_age: 'Idade do Paciente',
    patient_gender: 'Gênero',
    data_nascimento: 'Data de Nascimento',
    procedure_date: 'Data do Procedimento',
    convenio: 'Convênio',
    carteirinha: 'Carteirinha',
    hospital_clinic: 'Hospital/Clínica',
    nome_cirurgiao: 'Cirurgião',
    especialidade_cirurgiao: 'Especialidade',
    anesthesiologist_name: 'Anestesiologista',
    nome_equipe: 'Equipe',
    horario: 'Horário',
    duracao_minutos: 'Duração (minutos)',
    tecnica_anestesica: 'Técnica Anestésica',
    codigo_tssu: 'Código TSSU',
    grupo_anestesico: 'Grupo Anestésico',
    procedure_value: 'Valor',
    forma_pagamento: 'Forma de Pagamento',
    payment_status: 'Status do Pagamento',
    payment_date: 'Data do Pagamento',
    numero_parcelas: 'Número de Parcelas',
    observacoes_financeiras: 'Observações Financeiras',
    sangramento: 'Sangramento',
    nausea_vomito: 'Náusea/Vômito',
    dor: 'Dor',
    observacoes_procedimento: 'Observações do Procedimento',
    acompanhamento_antes: 'Acompanhamento Antes',
    tipo_parto: 'Tipo de Parto',
    tipo_cesariana: 'Tipo de Cesariana',
    indicacao_cesariana: 'Indicação de Cesariana',
    descricao_indicacao_cesariana: 'Descrição da Indicação',
    retencao_placenta: 'Retenção de Placenta',
    laceracao_presente: 'Laceração Presente',
    grau_laceracao: 'Grau da Laceração',
    hemorragia_puerperal: 'Hemorragia Puerperal',
    transfusao_realizada: 'Transfusão Realizada',
    email_cirurgiao: 'Email do Cirurgião',
    telefone_cirurgiao: 'Telefone do Cirurgião',
  }

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '-'
    }

    // Formatação especial para alguns campos
    if (key === 'procedure_value' && typeof value === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    }

    if (key === 'procedure_date' || key === 'data_nascimento' || key === 'payment_date') {
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(value)
        return date.toLocaleDateString('pt-BR')
      }
    }

    if (key === 'payment_status') {
      const statusMap: Record<string, string> = {
        'pending': 'Pendente',
        'paid': 'Pago',
        'cancelled': 'Cancelado'
      }
      return statusMap[value] || value
    }

    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não'
    }

    return String(value)
  }

  const extractedCount = extractedFields ? Object.keys(extractedFields).filter(
    key => extractedFields[key] !== null && 
           extractedFields[key] !== undefined && 
           extractedFields[key] !== ''
  ).length : 0

  return (
    <Card className="mb-6 border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Dados Extraídos do Comando de Voz</CardTitle>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            {extractedCount} campo{extractedCount !== 1 ? 's' : ''} preenchido{extractedCount !== 1 ? 's' : ''}
          </Badge>
          {transcription && (
            <Badge variant="outline" className="bg-green-100 text-green-700">
              Transcrição OK
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transcrição */}
        {transcription && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-gray-500" />
              <h4 className="font-semibold text-sm text-gray-700">Transcrição:</h4>
            </div>
            <p className="text-sm text-gray-600 italic leading-relaxed">
              "{transcription}"
            </p>
          </div>
        )}

        {/* Campos Extraídos */}
        {extractedFields && extractedCount > 0 && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Campos Preenchidos:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(extractedFields)
                .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                .map(([key, value]) => (
                  <div 
                    key={key} 
                    className="flex flex-col gap-1 p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {fieldLabels[key] || key}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatValue(key, value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {(!extractedFields || extractedCount === 0) && (
          <div className="text-center py-4 text-gray-500 text-sm">
            Nenhum campo foi extraído ainda. Faça uma gravação para preencher os dados.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

