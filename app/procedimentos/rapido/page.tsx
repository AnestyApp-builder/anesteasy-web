'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Save, 
  ArrowLeft, 
  User,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
  Users,
  Search,
  Eye,
  Check,
  Activity,
  Clock,
  Building,
  CreditCard,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Stethoscope
} from 'lucide-react'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { procedureService } from '@/lib/procedures'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import UploadFicha from '@/components/UploadFicha'
import { parseFicha } from '@/utils/parseFicha'
import { ConvenioCombobox } from '@/components/ui/ConvenioCombobox'
import { normalizarConvenio } from '@/lib/convenios'

interface FormData {
  // Identificação Básica (Original Quick Reg)
  nomePaciente: string
  dataProcedimento: string
  tipoProcedimento: string
  tecnicaAnestesica: string
  codigoTSSU: string
  valor: string
  statusPagamento: string
  dataPagamento: string
  show_to_secretary: boolean

  // Paridade com Cadastro Detalhado / Modal
  dataNascimento: string
  patientGender: 'M' | 'F' | 'Other' | ''
  convenio: string
  carteirinha: string
  horario: string
  duracaoMinutos: string
  hospital: string
  anesthesiologist_name: string
  nomeCirurgiao: string
  nomeEquipe: string
  especialidadeCirurgiao: string
  grupoAnestesico: string
  
  // Clínico
  sangramento: 'Sim' | 'Não' | ''
  nauseaVomito: 'Sim' | 'Não' | ''
  dor: 'Sim' | 'Não' | ''
  observacoesProcedimento: string
  
  // Obstétrico
  acompanhamentoAntes: 'Sim' | 'Não' | ''
  tipoParto: 'Instrumentalizado' | 'Vaginal' | 'Cesariana' | ''
  tipoCesariana: 'Nova Ráqui' | 'Geral' | 'Complementação pelo Cateter' | 'Raquianestesia' | ''
  indicacaoCesariana: 'Sim' | 'Não' | ''
  descricaoIndicacaoCesariana: string
  retencaoPlacenta: 'Sim' | 'Não' | ''
  laceracaoPresente: 'Sim' | 'Não' | ''
  grauLaceracao: '1' | '2' | '3' | '4' | ''
  hemorragiaPuerperal: 'Sim' | 'Não' | ''
  transfusaoRealizada: 'Sim' | 'Não' | ''
  
  // Financeiro Extra
  formaPagamento: string
  numero_parcelas: string
  observacoes: string
  
  // Feedback
  enviarRelatorioCirurgiao: 'Sim' | 'Não' | ''
  emailCirurgiao: string
  telefoneCirurgiao: string
}

const TIPOS_ANESTESIA = [
  { codigo: '30701010', nome: 'Anestesia geral' },
  { codigo: '30701028', nome: 'Anestesia regional (raquianestesia)' },
  { codigo: '30701029', nome: 'Raquianestesia' },
  { codigo: '30701036', nome: 'Anestesia regional (peridural)' },
  { codigo: '30701044', nome: 'Anestesia regional (bloqueio de plexo braquial)' },
  { codigo: '30701052', nome: 'Anestesia regional (bloqueio do neuroeixo)' },
  { codigo: '30701060', nome: 'Anestesia local' },
  { codigo: '30701079', nome: 'Sedação consciente' },
  { codigo: '30701087', nome: 'Anestesia combinada (geral + regional)' },
  { codigo: '30701095', nome: 'Duplo bloqueio (raqui + peridural)' },
  { codigo: '30701109', nome: 'Bloqueio periférico' },
  { codigo: '30701117', nome: 'Analgesia de parto' },
  { codigo: '30701125', nome: 'Analgesia pós-operatória' },
  { codigo: '30701133', nome: 'Bloqueio simpático' },
  { codigo: '30701141', nome: 'Bloqueio de nervos cranianos' },
  { codigo: '30701150', nome: 'Anestesia tópica' },
  { codigo: '30701168', nome: 'Acompanhamento anestésico' },
  { codigo: '30701176', nome: 'Monitorização anestésica' },
  { codigo: '30701184', nome: 'Anestesia para procedimento ambulatorial' },
  { codigo: '30701192', nome: 'Anestesia para emergência' },
  { codigo: '30701206', nome: 'Raquianestesia contínua' }
]

const TIPOS_PROCEDIMENTO = [
  'Cesariana',
  'Parto Normal',
  'Cirurgia Geral',
  'Cirurgia Ortopédica',
  'Cirurgia Plástica',
  'Cirurgia Vascular',
  'Cirurgia Neurológica',
  'Cirurgia Cardíaca',
  'Cirurgia Digestiva',
  'Outro'
]

const STATUS_PAGAMENTO = [
  'Pendente',
  'Pago',
  'Aguardando',
  'Cancelado'
]

export default function CadastroRapido() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const router = useRouter()
  const dateInputRef = React.useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<FormData>({
    nomePaciente: '',
    dataProcedimento: '',
    tipoProcedimento: '',
    tecnicaAnestesica: '',
    codigoTSSU: '',
    valor: '',
    statusPagamento: 'Pendente',
    dataPagamento: '',
    show_to_secretary: true,
    dataNascimento: '',
    patientGender: '',
    convenio: '',
    carteirinha: '',
    horario: '',
    duracaoMinutos: '',
    hospital: '',
    anesthesiologist_name: '',
    nomeCirurgiao: '',
    nomeEquipe: '',
    especialidadeCirurgiao: '',
    grupoAnestesico: '',
    sangramento: '',
    nauseaVomito: '',
    dor: '',
    observacoesProcedimento: '',
    acompanhamentoAntes: '',
    tipoParto: '',
    tipoCesariana: '',
    indicacaoCesariana: '',
    descricaoIndicacaoCesariana: '',
    retencaoPlacenta: '',
    laceracaoPresente: '',
    grauLaceracao: '',
    hemorragiaPuerperal: '',
    transfusaoRealizada: '',
    formaPagamento: 'Aguardando',
    numero_parcelas: '1',
    observacoes: '',
    enviarRelatorioCirurgiao: '',
    emailCirurgiao: '',
    telefoneCirurgiao: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    paciente: false,
    equipe: false,
    clinico: false,
    obstetrico: false,
    financeiro: false
  })

  const [buscaAnestesia, setBuscaAnestesia] = useState('')
  const [anestesiasFiltradas, setAnestesiasFiltradas] = useState(TIPOS_ANESTESIA)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  // Sincronizar nome do anestesista quando o usuário carregar
  useEffect(() => {
    if (user?.name && !formData.anesthesiologist_name) {
      updateFormData('anesthesiologist_name', user.name)
    }
  }, [user])

  const convertDateToISO = (data: string): string => {
    if (!data || !data.trim()) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.trim())) return data.trim()
    const parts = data.trim().split(/[\/\-]/)
    if (parts.length === 3) {
      const [dia, mes, ano] = parts
      const anoCompleto = ano.length === 2 ? `20${ano}` : ano
      const date = new Date(`${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`)
      if (!isNaN(date.getTime())) return `${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
    }
    const date = new Date(data)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return ''
  }

  const matchTipoProcedimento = (texto: string): string => {
    if (!texto) return ''
    const textoLower = texto.toLowerCase()
    const mapeamento: Record<string, string> = {
      'cesariana': 'Cesariana', 'cesárea': 'Cesariana', 'cesarea': 'Cesariana',
      'parto normal': 'Parto Normal', 'parto vaginal': 'Parto Normal',
      'cirurgia geral': 'Cirurgia Geral', 'ortopedia': 'Cirurgia Ortopédica',
      'plástica': 'Cirurgia Plástica', 'vascular': 'Cirurgia Vascular'
    }
    for (const [key, value] of Object.entries(mapeamento)) {
      if (textoLower.includes(key)) return value
    }
    return ''
  }

  const matchTecnicaAnestesica = (texto: string): string => {
    if (!texto) return ''
    const textoLower = texto.toLowerCase()
    for (const anestesia of TIPOS_ANESTESIA) {
      if (textoLower.includes(anestesia.nome.toLowerCase())) return anestesia.nome
    }
    return ''
  }

  const handleOCRExtract = async (rawText: string, confidence?: number, parsedData?: any) => {
    try {
      // Se já temos dados parseados pela IA Vision, usar eles diretamente
      if (parsedData) {
        console.log('✅ [AI Vision] Dados recebidos:', parsedData)
        
        const updates: Partial<FormData> = {}
        
        if (parsedData.nome) updates.nomePaciente = parsedData.nome
        if (parsedData.dataProcedimento) {
          const isoDate = convertDateToISO(parsedData.dataProcedimento)
          if (isoDate) updates.dataProcedimento = isoDate
        }
        if (parsedData.tipoProcedimento) {
          const match = matchTipoProcedimento(parsedData.tipoProcedimento)
          if (match) updates.tipoProcedimento = match
        }
        if (parsedData.tecnica) {
          const match = matchTecnicaAnestesica(parsedData.tecnica)
          if (match) {
            updates.tecnicaAnestesica = match
            const item = TIPOS_ANESTESIA.find(a => a.nome === match)
            if (item) updates.codigoTSSU = item.codigo
          }
        }
        
        // Novos campos da paridade
        if (parsedData.nascimento) {
          const isoBirth = convertDateToISO(parsedData.nascimento)
          if (isoBirth) updates.dataNascimento = isoBirth
        }
        if (parsedData.sexo) updates.patientGender = parsedData.sexo as any
        if (parsedData.convenio) updates.convenio = normalizarConvenio(parsedData.convenio)
        if (parsedData.carteirinha) updates.carteirinha = parsedData.carteirinha
        if (parsedData.hospital) updates.hospital = parsedData.hospital
        if (parsedData.nomeCirurgiao) updates.nomeCirurgiao = parsedData.nomeCirurgiao
        if (parsedData.horario) updates.horario = parsedData.horario

        setFormData(prev => ({ ...prev, ...updates }))
        addToast({ 
          title: 'IA Vision Processada!', 
          description: `Extraídos ${Object.keys(updates).length} campos com alta precisão.`, 
          variant: 'success' 
        })
        return
      }

      // Fallback para o parse tradicional (Regex) se não houver parsedData
      const parsed = parseFicha(rawText)
      const updates: Partial<FormData> = {}
      
      if (parsed.nome) updates.nomePaciente = parsed.nome
      if (parsed.dataProcedimento) {
        const isoDate = convertDateToISO(parsed.dataProcedimento)
        if (isoDate) updates.dataProcedimento = isoDate
      }
      if (parsed.procedimento) {
        const match = matchTipoProcedimento(parsed.procedimento)
        if (match) updates.tipoProcedimento = match
      }
      if (parsed.tecnica) {
        const match = matchTecnicaAnestesica(parsed.tecnica)
        if (match) {
          updates.tecnicaAnestesica = match
          const item = TIPOS_ANESTESIA.find(a => a.nome === match)
          if (item) updates.codigoTSSU = item.codigo
        }
      }

      setFormData(prev => ({ ...prev, ...updates }))
      addToast({ title: 'Dados extraídos!', description: 'Campos preenchidos via OCR.', variant: 'success' })
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    const camposObrigatorios: { campo: keyof FormData; label: string }[] = [
      { campo: 'nomePaciente', label: 'Nome do Paciente' },
      { campo: 'dataProcedimento', label: 'Data do Procedimento' },
      { campo: 'tipoProcedimento', label: 'Tipo do Procedimento' },
      { campo: 'tecnicaAnestesica', label: 'Técnica Anestésica' },
    ]

    const faltando = camposObrigatorios
      .filter(({ campo }) => !formData[campo]?.toString().trim())
      .map(({ label }) => label)

    if (faltando.length > 0) {
      setMissingFields(faltando)
      return
    }

    setLoading(true)

    try {
      const valorNumerico = parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0
      
      const payload = {
        user_id: user.id,
        patient_name: formData.nomePaciente,
        procedure_date: formData.dataProcedimento,
        procedure_name: formData.tipoProcedimento,
        procedure_type: formData.tipoProcedimento,
        tecnica_anestesica: formData.tecnicaAnestesica,
        codigo_tssu: formData.codigoTSSU,
        procedure_value: valorNumerico,
        payment_status: (formData.statusPagamento === 'Pago' ? 'paid' : formData.statusPagamento === 'Cancelado' ? 'cancelled' : 'pending') as any,
        payment_date: formData.dataPagamento || null,
        show_to_secretary: formData.show_to_secretary,
        
        // Paridade Total
        data_nascimento: formData.dataNascimento || null,
        patient_gender: formData.patientGender || null,
        convenio: formData.convenio || null,
        carteirinha: formData.carteirinha || null,
        horario: formData.horario || null,
        procedure_time: formData.horario || null,
        duracao_minutos: parseInt(formData.duracaoMinutos) || null,
        hospital_clinic: formData.hospital || null,
        anesthesiologist_name: formData.anesthesiologist_name || null,
        nome_cirurgiao: formData.nomeCirurgiao || null,
        surgeon_name: formData.nomeCirurgiao || null,
        nome_equipe: formData.nomeEquipe || null,
        especialidade_cirurgiao: formData.especialidadeCirurgiao || null,
        grupo_anestesico: formData.grupoAnestesico || 'Nenhum',
        
        sangramento: formData.sangramento || null,
        nausea_vomito: formData.nauseaVomito || null,
        dor: formData.dor || null,
        observacoes_procedimento: formData.observacoesProcedimento || null,
        
        acompanhamento_antes: formData.acompanhamentoAntes || null,
        tipo_parto: formData.tipoParto || null,
        tipo_cesariana: formData.tipoCesariana || null,
        indicacao_cesariana: formData.indicacaoCesariana || null,
        descricao_indicacao_cesariana: formData.descricaoIndicacaoCesariana || null,
        retencao_placenta: formData.retencaoPlacenta || null,
        laceracao_presente: formData.laceracaoPresente || null,
        grau_laceracao: formData.grauLaceracao || null,
        hemorragia_puerperal: formData.hemorragiaPuerperal || null,
        transfusao_realizada: formData.transfusaoRealizada || null,
        
        forma_pagamento: formData.formaPagamento || 'Aguardando',
        payment_method: formData.formaPagamento || 'Aguardando',
        numero_parcelas: parseInt(formData.numero_parcelas) || 1,
        observacoes_financeiras: formData.observacoes || null,
        
        feedback_solicitado: formData.enviarRelatorioCirurgiao === 'Sim',
        email_cirurgiao: formData.emailCirurgiao || null,
        telefone_cirurgiao: formData.telefoneCirurgiao || null
      }

      const result = await procedureService.createProcedure(payload as any)
      if (result) {
        addToast({ title: 'Sucesso!', description: 'Procedimento cadastrado.', variant: 'success' })
        router.push('/procedimentos')
      } else {
        const errMsg = 'Não foi possível salvar o procedimento. Verifique sua conexão e tente novamente.'
        setError(errMsg)
        addToast({ title: 'Erro ao salvar', description: errMsg, variant: 'error', duration: 7000 })
      }
    } catch (err: any) {
      setError(err.message)
      addToast({ title: 'Erro ao salvar', description: err.message || 'Ocorreu um erro inesperado.', variant: 'error', duration: 7000 })
    } finally {
      setLoading(false)
    }
  }

  const filtrarAnestesias = (termo: string) => {
    setBuscaAnestesia(termo)
    if (!termo) {
      setAnestesiasFiltradas(TIPOS_ANESTESIA)
    } else {
      setAnestesiasFiltradas(TIPOS_ANESTESIA.filter(a => a.nome.toLowerCase().includes(termo.toLowerCase()) || a.codigo.includes(termo)))
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-teal-600" />
              Cadastro Rápido
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Preencha os dados essenciais ou expanda para detalhes completos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção Principal: Obrigatórios */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-2 bg-teal-500 w-full" />
              <CardHeader className="bg-teal-50/50">
                <CardTitle className="text-xl font-bold text-teal-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  Dados Essenciais
                </CardTitle>
              </CardHeader>
              <div className="p-6 space-y-6">
                <UploadFicha onExtract={handleOCRExtract} onError={setError} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="w-4 h-4" /> Nome do Paciente *
                    </label>
                    <Input 
                      value={formData.nomePaciente} 
                      onChange={e => updateFormData('nomePaciente', e.target.value)} 
                      placeholder="Nome completo" 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Data do Procedimento *
                    </label>
                    <Input 
                      type="date" 
                      value={formData.dataProcedimento} 
                      onChange={e => updateFormData('dataProcedimento', e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" /> Tipo de Procedimento *
                    </label>
                    <select
                      value={formData.tipoProcedimento}
                      onChange={e => updateFormData('tipoProcedimento', e.target.value)}
                      className="w-full h-12 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 bg-white shadow-sm transition-all text-base"
                      required
                    >
                      <option value="">Selecione...</option>
                      {TIPOS_PROCEDIMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2 relative">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Técnica Anestésica *
                    </label>
                    <Input 
                      value={buscaAnestesia || formData.tecnicaAnestesica}
                      onChange={e => filtrarAnestesias(e.target.value)}
                      placeholder="Busque ou digite..."
                      onBlur={() => {
                        setTimeout(() => setBuscaAnestesia(''), 200);
                      }}
                      required
                    />
                    {buscaAnestesia && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {anestesiasFiltradas.map(a => (
                          <div 
                            key={a.codigo} 
                            className="p-3 hover:bg-teal-50 cursor-pointer text-sm border-b last:border-0"
                            onMouseDown={() => {
                              updateFormData('tecnicaAnestesica', a.nome)
                              updateFormData('codigoTSSU', a.codigo)
                              setBuscaAnestesia('')
                            }}
                          >
                            <div className="font-medium">{a.nome}</div>
                            <div className="text-xs text-gray-500">TSSU: {a.codigo}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>


              </div>
            </Card>

            {/* Seções Expansíveis (Paridade) */}
            <div className="space-y-4">
              {/* Paciente Detalhado */}
              <CollapsibleSection 
                title="Mais Dados do Paciente" 
                icon={<Users className="w-5 h-5" />} 
                expanded={expandedSections.paciente} 
                onToggle={() => toggleSection('paciente')}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nascimento</label>
                    <Input type="date" value={formData.dataNascimento} onChange={e => updateFormData('dataNascimento', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Sexo</label>
                    <select className="w-full h-10 px-3 rounded-md border border-gray-200" value={formData.patientGender} onChange={e => updateFormData('patientGender', e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Other">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <ConvenioCombobox
                      label="Convênio"
                      value={formData.convenio}
                      onChange={(v) => updateFormData('convenio', v)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Carteirinha</label>
                    <Input value={formData.carteirinha} onChange={e => updateFormData('carteirinha', e.target.value)} placeholder="Nº do cartão" />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Equipe Detalhada */}
              <CollapsibleSection 
                title="Equipe e Localização" 
                icon={<Building className="w-5 h-5" />} 
                expanded={expandedSections.equipe} 
                onToggle={() => toggleSection('equipe')}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Hospital/Clínica</label>
                    <Input value={formData.hospital} onChange={e => updateFormData('hospital', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Cirurgião</label>
                    <Input value={formData.nomeCirurgiao} onChange={e => updateFormData('nomeCirurgiao', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Especialidade</label>
                    <Input value={formData.especialidadeCirurgiao} onChange={e => updateFormData('especialidadeCirurgiao', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Horário</label>
                    <Input type="time" value={formData.horario} onChange={e => updateFormData('horario', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Duração (min)</label>
                    <Input type="number" value={formData.duracaoMinutos} onChange={e => updateFormData('duracaoMinutos', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nome da Equipe</label>
                    <Input value={formData.nomeEquipe} onChange={e => updateFormData('nomeEquipe', e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Email Cirurgião</label>
                    <Input type="email" value={formData.emailCirurgiao} onChange={e => updateFormData('emailCirurgiao', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Telefone Cirurgião</label>
                    <Input value={formData.telefoneCirurgiao} onChange={e => updateFormData('telefoneCirurgiao', e.target.value)} />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Clínico */}
              <CollapsibleSection 
                title="Dados Clínicos" 
                icon={<Activity className="w-5 h-5" />} 
                expanded={expandedSections.clinico} 
                onToggle={() => toggleSection('clinico')}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SelectField label="Sangramento" value={formData.sangramento} onChange={v => updateFormData('sangramento', v)} />
                  <SelectField label="Náuseas/Vômitos" value={formData.nauseaVomito} onChange={v => updateFormData('nauseaVomito', v)} />
                  <SelectField label="Dor" value={formData.dor} onChange={v => updateFormData('dor', v)} />
                  <div className="col-span-full space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Observações</label>
                    <textarea 
                      className="w-full p-3 border rounded-md min-h-[80px]" 
                      value={formData.observacoesProcedimento} 
                      onChange={e => updateFormData('observacoesProcedimento', e.target.value)}
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Obstétrico */}
              <CollapsibleSection 
                title="Dados Obstétricos" 
                icon={<FileText className="w-5 h-5" />} 
                expanded={expandedSections.obstetrico} 
                onToggle={() => toggleSection('obstetrico')}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label="Acomp. Antes" value={formData.acompanhamentoAntes} onChange={v => updateFormData('acompanhamentoAntes', v)} />
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Parto</label>
                    <select className="w-full h-10 px-3 border rounded-md" value={formData.tipoParto} onChange={e => updateFormData('tipoParto', e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="Instrumentalizado">Instrumentalizado</option>
                      <option value="Vaginal">Vaginal</option>
                      <option value="Cesariana">Cesariana</option>
                    </select>
                  </div>
                  <SelectField label="Indicação Cesária" value={formData.indicacaoCesariana} onChange={v => updateFormData('indicacaoCesariana', v)} />
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Descrição Indicação</label>
                    <Input value={formData.descricaoIndicacaoCesariana} onChange={e => updateFormData('descricaoIndicacaoCesariana', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Cesariana</label>
                    <select className="w-full h-10 px-3 border rounded-md" value={formData.tipoCesariana} onChange={e => updateFormData('tipoCesariana', e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="Nova Ráqui">Nova Ráqui</option>
                      <option value="Raquianestesia">Raquianestesia</option>
                      <option value="Geral">Geral</option>
                      <option value="Complementação pelo Cateter">Complementação pelo Cateter</option>
                    </select>
                  </div>
                  <SelectField label="Retenção Placenta" value={formData.retencaoPlacenta} onChange={v => updateFormData('retencaoPlacenta', v)} />
                  <SelectField label="Laceração Presente" value={formData.laceracaoPresente} onChange={v => updateFormData('laceracaoPresente', v)} />
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Grau Laceração</label>
                    <select className="w-full h-10 px-3 border rounded-md" value={formData.grauLaceracao} onChange={e => updateFormData('grauLaceracao', e.target.value)}>
                      <option value="">...</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                  <SelectField label="Hemorragia" value={formData.hemorragiaPuerperal} onChange={v => updateFormData('hemorragiaPuerperal', v)} />
                  <SelectField label="Transfusão" value={formData.transfusaoRealizada} onChange={v => updateFormData('transfusaoRealizada', v)} />
                </div>
              </CollapsibleSection>

              {/* Financeiro Completo */}
              <CollapsibleSection 
                title="Financeiro e Pagamento" 
                icon={<DollarSign className="w-5 h-5" />} 
                expanded={expandedSections.financeiro} 
                onToggle={() => toggleSection('financeiro')}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Valor R$</label>
                    <Input value={formData.valor} onChange={e => updateFormData('valor', e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                    <select className="w-full h-10 px-3 border rounded-md" value={formData.statusPagamento} onChange={e => updateFormData('statusPagamento', e.target.value)}>
                      {STATUS_PAGAMENTO.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Forma de Pagamento</label>
                    <Input value={formData.formaPagamento} onChange={e => updateFormData('formaPagamento', e.target.value)} placeholder="Ex: Cartão, Pix..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Parcelas</label>
                    <Input type="number" value={formData.numero_parcelas} onChange={e => updateFormData('numero_parcelas', e.target.value)} />
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            {/* Footer Fixo (Mobile friendly) */}
            <div className="sticky bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg p-4 sm:p-6 border-t border-gray-100 flex gap-4 z-40 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()} 
                className="flex-1 h-12 sm:h-14 rounded-2xl font-bold border-2"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-[2] h-12 sm:h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl shadow-xl shadow-teal-100 flex items-center justify-center gap-2 transition-all active:scale-95 font-bold text-lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Layout>

      {/* Modal flutuante: campos obrigatórios não preenchidos */}
      {missingFields.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setMissingFields([])}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full border border-red-100 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">Campos obrigatórios</h3>
                <p className="text-gray-500 text-sm mt-0.5">Preencha os campos abaixo para continuar:</p>
              </div>
            </div>

            <ul className="space-y-2 mb-5">
              {missingFields.map(campo => (
                <li key={campo} className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {campo}
                </li>
              ))}
            </ul>

            <button
              onClick={() => setMissingFields([])}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}

// Componentes Auxiliares
function CollapsibleSection({ title, icon, children, expanded, onToggle }: { title: string, icon: React.ReactNode, children: React.ReactNode, expanded: boolean, onToggle: () => void }) {
  return (
    <Card className="border-0 shadow-sm transition-all duration-300">
      <button 
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 font-semibold text-gray-700">
          <div className="text-teal-600">{icon}</div>
          {title}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {expanded && <div className="p-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">{children}</div>}
    </Card>
  )
}

function SelectField({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
      <select 
        className="w-full h-10 px-3 border rounded-md" 
        value={value} 
        onChange={e => onChange(e.target.value)}
      >
        <option value="">...</option>
        <option value="Sim">Sim</option>
        <option value="Não">Não</option>
      </select>
    </div>
  )
}
