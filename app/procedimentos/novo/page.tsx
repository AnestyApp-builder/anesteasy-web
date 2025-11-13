'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Save, 
  ArrowLeft, 
  User, 
  Calendar,
  DollarSign,
  FileText,
  Clock,
  AlertCircle,
  Upload,
  X,
  CheckCircle,
  Building,
  CreditCard,
  Stethoscope,
  UserCheck,
  FileImage,
  Search,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { procedureService } from '@/lib/procedures'
import { feedbackService } from '@/lib/feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useSecretaria } from '@/contexts/SecretariaContext'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface FormData {
  // 1. Identificação do Procedimento
  nomePaciente: string
  dataNascimento: string
  convenio: string
  carteirinha: string
  tipoProcedimento: string
  tecnicaAnestesica: string
  codigoTSSU: string
  especialidadeCirurgiao: string
  nomeCirurgiao: string
  nomeEquipe: string
  hospital: string
  patientGender: 'M' | 'F' | 'Other' | ''
  horario: string
  duracaoMinutos: string
  
  // 2. Dados do Procedimento
  // Campos para procedimentos não-obstétricos
  sangramento: 'Sim' | 'Não' | ''
  nauseaVomito: 'Sim' | 'Não' | ''
  dor: 'Sim' | 'Não' | ''
  observacoesProcedimento: string
  
  // Campos para relatório do cirurgião
  enviarRelatorioCirurgiao: 'Sim' | 'Não' | ''
  emailCirurgiao: string
  telefoneCirurgiao: string

  // Campos para procedimentos obstétricos
  acompanhamentoAntes: 'Sim' | 'Não' | ''
  tipoParto: 'Instrumentalizado' | 'Vaginal' | 'Cesariana' | ''
  tipoCesariana: 'Nova Ráqui' | 'Geral' | 'Complementação pelo Cateter' | ''
  indicacaoCesariana: 'Sim' | 'Não' | ''
  descricaoIndicacaoCesariana: string
  retencaoPlacenta: 'Sim' | 'Não' | ''
  laceracaoPresente: 'Sim' | 'Não' | ''
  grauLaceracao: '1' | '2' | '3' | '4' | ''
  hemorragiaPuerperal: 'Sim' | 'Não' | ''
  transfusaoRealizada: 'Sim' | 'Não' | ''
  
  // 3. Dados Administrativos
  valor: string
  formaPagamento: string
  numero_parcelas: string
  parcelas_recebidas: string
  parcelas: Array<{
    numero: number
    valor: number
    recebida: boolean
    data_recebimento: string
  }>
  statusPagamento: string
  secretariaId: string
  dataPagamento: string
  observacoes: string
  
  // 4. Upload de Fichas
  fichas: File[]
  
  // 5. OCR
}


const FORMAS_PAGAMENTO_PENDENTE = [
  'Aguardando',
  'Parcelado'
]

const FORMAS_PAGAMENTO_PAGO = [
  'À vista',
  'Parcelado'
]

const STATUS_PAGAMENTO = [
  'Pendente',
  'Pago',
  'Aguardando'
]

// Mapeamento dos valores em português para os valores do banco de dados
const STATUS_PAGAMENTO_MAP: Record<string, string> = {
  'Pendente': 'pending',
  'Pago': 'paid',
  'Aguardando': 'cancelled'
}

const ESPECIALIDADES = [
  'Cirurgia Geral',
  'Ortopedia',
  'Cardiologia',
  'Neurologia',
  'Ginecologia',
  'Urologia',
  'Oftalmologia',
  'Otorrinolaringologia',
  'Plástica',
  'Vascular',
  'Outro'
]

// Lista de tipos de anestesia com códigos TSSU
const TIPOS_ANESTESIA = [
  { codigo: '30701010', nome: 'Anestesia geral' },
  { codigo: '30701028', nome: 'Anestesia regional (raquianestesia)' },
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

function NovoProcedimentoContent() {
  const { user } = useAuth()
  const { secretaria, linkSecretaria } = useSecretaria()
  const [formData, setFormData] = useState<FormData>({
    nomePaciente: '',
    dataNascimento: '',
    convenio: '',
    carteirinha: '',
    tipoProcedimento: '',
    tecnicaAnestesica: '',
    codigoTSSU: '',
    especialidadeCirurgiao: '',
    nomeCirurgiao: '',
    nomeEquipe: '',
    hospital: '',
    patientGender: '',
    horario: '',
    duracaoMinutos: '',
    // Campos para procedimentos não-obstétricos
    sangramento: '',
    nauseaVomito: '',
    dor: '',
    observacoesProcedimento: '',
    // Campos para relatório do cirurgião
    enviarRelatorioCirurgiao: '',
    emailCirurgiao: '',
    telefoneCirurgiao: '',
    // Campos para procedimentos obstétricos
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
    valor: '',
    formaPagamento: 'Aguardando',
    numero_parcelas: '',
    parcelas_recebidas: '0',
    parcelas: [],
    statusPagamento: 'Pendente',
    secretariaId: '',
    dataPagamento: '',
    observacoes: '',
    fichas: [],
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info' | null>(null)
  const [currentSection, setCurrentSection] = useState(0) // Começar com OCR (seção 0)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successData, setSuccessData] = useState<{
    paciente: string
    procedimento: string
    valor: string
    parcelas: string
    feedbackUrl?: string
    emailCirurgiao?: string
    telefoneCirurgiao?: string
  } | null>(null)
  const [anestesiasFiltradas, setAnestesiasFiltradas] = useState(TIPOS_ANESTESIA)
  const [buscaAnestesia, setBuscaAnestesia] = useState('')
  const [showSecretariaModal, setShowSecretariaModal] = useState(false)
  const [secretariasVinculadas, setSecretariasVinculadas] = useState<Array<{ id: string; nome: string; email: string }>>([])

  // Função para carregar secretárias vinculadas
  const loadSecretarias = React.useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('anestesista_secretaria')
        .select(`
          secretarias (
            id,
            nome,
            email
          )
        `)
        .eq('anestesista_id', user.id)

      if (error) {
        console.error('Erro ao carregar secretárias:', error)
        return
      }

      const secretarias = (data || [])
        .map(item => item.secretarias)
        .filter(Boolean) as Array<{ id: string; nome: string; email: string }>
      
      setSecretariasVinculadas(secretarias)

      // Se houver apenas uma secretária vinculada, selecionar automaticamente
      if (secretarias.length === 1 && !formData.secretariaId) {
        setFormData(prev => ({
          ...prev,
          secretariaId: secretarias[0].id
        }))
      }
    } catch (error) {
      console.error('Erro ao carregar secretárias:', error)
    }
  }, [user?.id, formData.secretariaId])

  // Buscar todas as secretárias vinculadas ao anestesista
  useEffect(() => {
    loadSecretarias()
  }, [loadSecretarias])

  // Definir secretaria automaticamente se houver uma vinculada (compatibilidade com código antigo)
  useEffect(() => {
    if (secretaria && !formData.secretariaId) {
      setFormData(prev => ({
        ...prev,
        secretariaId: secretaria.id
      }))
    }
  }, [secretaria])

  // Função otimizada para atualizar formData
  const updateFormData = React.useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }
      
      // Gerar parcelas automaticamente quando número de parcelas ou valor mudar
      if (field === 'numero_parcelas' || field === 'valor') {
        const numParcelas = field === 'numero_parcelas' ? parseInt(value) || 0 : parseInt(prev.numero_parcelas) || 0
        const valorTotal = field === 'valor' ? parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : parseFloat(prev.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0
        
        if (numParcelas > 0 && valorTotal > 0) {
          const valorParcela = valorTotal / numParcelas
          newData.parcelas = Array.from({ length: numParcelas }, (_, index) => ({
            numero: index + 1,
            valor: valorParcela,
            recebida: false,
            data_recebimento: ''
          }))
        } else {
          newData.parcelas = []
        }
      }
      
      return newData
    })
  }, [])

  // Função para atualizar parcelas individuais
  const updateParcela = (index: number, field: 'recebida' | 'data_recebimento', value: any) => {
    setFormData(prev => ({
      ...prev,
      parcelas: prev.parcelas.map((parcela, i) => 
        i === index ? { ...parcela, [field]: value } : parcela
      )
    }))
  }

  // Funções auxiliares para feedback
  const showFeedback = (type: 'error' | 'success' | 'info', message: string) => {
    setFeedbackType(type)
    if (type === 'error') {
      setError(message)
      setSuccess('')
    } else if (type === 'success') {
      setSuccess(message)
      setError('')
    }
  }

  const clearFeedback = () => {
    setError('')
    setSuccess('')
    setFeedbackType(null)
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    setSuccessData(null)
    router.push('/procedimentos')
  }

  // Função para filtrar anestesias baseado na busca
  const filtrarAnestesias = (termo: string) => {
    setBuscaAnestesia(termo)
    
    // Atualizar formData em tempo real para permitir texto livre
    // Isso permite que o usuário digite uma técnica que não está na lista
    if (termo !== '') {
      updateFormData('tecnicaAnestesica', termo)
    }
    
    if (!termo) {
      setAnestesiasFiltradas(TIPOS_ANESTESIA)
    } else {
      const filtradas = TIPOS_ANESTESIA.filter(anestesia =>
        anestesia.nome.toLowerCase().includes(termo.toLowerCase()) ||
        anestesia.codigo.includes(termo)
      )
      setAnestesiasFiltradas(filtradas)
    }
  }

  // Função para selecionar uma anestesia
  const selecionarAnestesia = (anestesia: { codigo: string; nome: string }) => {
    updateFormData('tecnicaAnestesica', anestesia.nome)
    updateFormData('codigoTSSU', anestesia.codigo)
    setBuscaAnestesia('')
    setAnestesiasFiltradas(TIPOS_ANESTESIA)
  }
  
  // Função para quando o campo perde o foco - validar se o texto digitado corresponde a uma anestesia
  const handleAnestesiaBlur = () => {
    const termo = buscaAnestesia || formData.tecnicaAnestesica
    if (termo) {
      // Tentar encontrar correspondência exata (case-insensitive)
      const correspondenciaExata = TIPOS_ANESTESIA.find(anestesia =>
        anestesia.nome.toLowerCase() === termo.toLowerCase()
      )
      
      if (correspondenciaExata) {
        // Se encontrou correspondência exata, usar ela (com código TSSU)
        updateFormData('tecnicaAnestesica', correspondenciaExata.nome)
        updateFormData('codigoTSSU', correspondenciaExata.codigo)
      } else {
        // Se não encontrou, manter o texto digitado (permite texto livre)
        updateFormData('tecnicaAnestesica', termo)
        // Não limpar código TSSU se já houver um definido
      }
    }
    setBuscaAnestesia('')
    setAnestesiasFiltradas(TIPOS_ANESTESIA)
  }


  // Função para formatar valor monetário para exibição
  const formatValueForDisplay = (value: string) => {
    if (!value) return ''
    const numericValue = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'))
    if (isNaN(numericValue)) return value
    return formatCurrency(numericValue)
  }
  const [previewFiles, setPreviewFiles] = useState<string[]>([])
  const router = useRouter()



  // Validar data de nascimento
  const validateBirthDate = (date: string) => {
    const birthDate = new Date(date)
    const today = new Date()
    return birthDate <= today
  }

  // Verificar se é procedimento obstétrico
  const isObstetricProcedure = (procedimento: string) => {
    const obstetricTerms = ['parto', 'cesariana', 'cesaria', 'cesárea', 'cesarea']
    return obstetricTerms.some(term => 
      procedimento.toLowerCase().includes(term.toLowerCase())
    )
  }

  // Verificar se é parto normal/parto/parto natural
  const isPartoNormal = (procedimento: string) => {
    const partoNormalTerms = ['parto normal', 'parto natural', 'parto']
    const lowerProcedimento = procedimento.toLowerCase()
    // Se contém cesariana, não é parto normal
    if (lowerProcedimento.includes('cesariana') || lowerProcedimento.includes('cesária') || 
        lowerProcedimento.includes('cesaria') || lowerProcedimento.includes('cesárea')) {
      return false
    }
    return partoNormalTerms.some(term => lowerProcedimento.includes(term.toLowerCase()))
  }

  // Verificar se é cesariana direta
  const isCesarianaDireta = (procedimento: string) => {
    const cesarianaTerms = ['cesariana', 'cesária', 'cesaria', 'cesárea', 'cesarea']
    const lowerProcedimento = procedimento.toLowerCase()
    return cesarianaTerms.some(term => lowerProcedimento.includes(term.toLowerCase()))
  }


  // Calcular idade
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return ''
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age.toString()
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'image/jpeg' || 
      file.type === 'image/png'
    )
    
    if (formData.fichas.length + validFiles.length > 10) {
      showFeedback('error', '⚠️ Limite de arquivos excedido: Máximo de 10 arquivos permitidos.')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      fichas: [...prev.fichas, ...validFiles]
    }))
    
    // Criar previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewFiles(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  // Remove file
  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fichas: prev.fichas.filter((_, i) => i !== index)
    }))
    setPreviewFiles(prev => prev.filter((_, i) => i !== index))
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()
    
    console.log('🚀 Iniciando salvamento do procedimento...')
    console.log('📋 Dados do usuário:', { userId: user?.id, userName: user?.name })
    
    if (!user?.id) {
      console.error('❌ Erro: Usuário não está logado')
      showFeedback('error', '❌ Erro de autenticação: Usuário não está logado. Faça login novamente.')
      return
    }

    // Só salvar o procedimento se estivermos na etapa final (Upload)
    console.log('📍 Seção atual:', currentSection)
    if (currentSection !== 3) {
      console.warn('⚠️ Tentativa de salvar fora da seção final')
      showFeedback('error', '⚠️ Complete todas as etapas antes de finalizar.')
      return
    }

    // Validações básicas com mensagens específicas
    const camposObrigatorios = {
      'Nome do Paciente': formData.nomePaciente,
      'Data de Nascimento': formData.dataNascimento,
      'Tipo do Procedimento': formData.tipoProcedimento,
      'Técnica Anestésica': formData.tecnicaAnestesica
    }

    const camposFaltando = Object.entries(camposObrigatorios)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    if (camposFaltando.length > 0) {
      showFeedback('error', `⚠️ Campos obrigatórios não preenchidos: ${camposFaltando.join(', ')}`)
      return
    }

    if (!validateBirthDate(formData.dataNascimento)) {
      showFeedback('error', '⚠️ Data de nascimento inválida: A data não pode ser futura.')
      return
    }

    // Validar campos específicos do tipo de procedimento
    if (isObstetricProcedure(formData.tipoProcedimento)) {
      // Validação para parto normal
      if (isPartoNormal(formData.tipoProcedimento)) {
        const camposObstetricia = {
          'Tipo de Parto': formData.tipoParto
        }

        const camposObstetriciaPendentes = Object.entries(camposObstetricia)
          .filter(([_, value]) => !value)
          .map(([key]) => key)

        if (camposObstetriciaPendentes.length > 0) {
          showFeedback('error', `⚠️ Campos obrigatórios para procedimento obstétrico não preenchidos: ${camposObstetriciaPendentes.join(', ')}`)
          return
        }

        // Validações específicas para cesariana quando selecionada em parto normal
        if (formData.tipoParto === 'Cesariana') {
          if (!formData.tipoCesariana) {
            showFeedback('error', '⚠️ Para cesariana, é necessário informar o tipo de anestesia (Nova Ráqui, Geral ou Complementação pelo Cateter)')
            return
          }
          if (!formData.indicacaoCesariana) {
            showFeedback('error', '⚠️ Para cesariana, é necessário informar se há indicação')
            return
          }
          if (formData.indicacaoCesariana === 'Sim' && !formData.descricaoIndicacaoCesariana) {
            showFeedback('error', '⚠️ É necessário descrever a indicação da cesariana')
            return
          }
        }
      }

      // Validação para cesariana direta
      if (isCesarianaDireta(formData.tipoProcedimento)) {
        if (!formData.tipoCesariana) {
          showFeedback('error', '⚠️ Para cesariana, é necessário informar o tipo de anestesia (Geral ou Complementação pelo Cateter)')
          return
        }
        if (!formData.indicacaoCesariana) {
          showFeedback('error', '⚠️ Para cesariana, é necessário informar se há indicação')
          return
        }
        if (formData.indicacaoCesariana === 'Sim' && !formData.descricaoIndicacaoCesariana) {
          showFeedback('error', '⚠️ É necessário descrever a indicação da cesariana')
          return
        }
      }
    }

    // Validar campos financeiros
    if (formData.statusPagamento === 'Pago') {
      if (!formData.dataPagamento) {
        showFeedback('error', '⚠️ Para status "Pago", é necessário informar a data do pagamento')
      return
    }
      if (!formData.valor || parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.')) <= 0) {
        showFeedback('error', '⚠️ Para status "Pago", é necessário informar um valor válido')
      return
    }
    }

    // Validar campos de feedback
    if (formData.enviarRelatorioCirurgiao === 'Sim') {
      if (!formData.emailCirurgiao) {
        showFeedback('error', '⚠️ Para enviar relatório ao cirurgião, é necessário informar o email')
      return
    }
      if (!formData.telefoneCirurgiao) {
        showFeedback('error', '⚠️ Para enviar relatório ao cirurgião, é necessário informar o telefone')
      return
    }
      if (!formData.emailCirurgiao.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
        showFeedback('error', '⚠️ Email do cirurgião inválido')
      return
    }
    }


    setLoading(true)
    showFeedback('info', '⏳ Salvando procedimento...')
    
    console.log('📝 Preparando dados do procedimento...')
    console.log('📊 FormData:', {
      nomePaciente: formData.nomePaciente,
      tipoProcedimento: formData.tipoProcedimento,
      valor: formData.valor,
      statusPagamento: formData.statusPagamento,
      numeroArquivos: formData.fichas?.length || 0
    })
    
    try {
      const procedureData = {
        // Campos obrigatórios
        procedure_name: formData.tipoProcedimento,
        procedure_value: parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        procedure_date: new Date().toISOString().split('T')[0],
        procedure_type: formData.tipoProcedimento,
        
        // Campos do paciente
        patient_name: formData.nomePaciente,
        patient_age: parseInt(calculateAge(formData.dataNascimento)),
        data_nascimento: formData.dataNascimento,
        convenio: formData.convenio,
        carteirinha: formData.carteirinha,
        patient_gender: formData.patientGender,
        
        // Campos da equipe
        anesthesiologist_name: user.name,
        nome_cirurgiao: formData.nomeCirurgiao,
        especialidade_cirurgiao: formData.especialidadeCirurgiao,
        nome_equipe: formData.nomeEquipe,
        hospital_clinic: formData.hospital,
        
        // Campos de horário e duração
        horario: formData.horario || undefined,
        // Converter horas para minutos (multiplicar por 60)
        duracao_minutos: formData.duracaoMinutos ? Math.round(parseFloat(formData.duracaoMinutos) * 60) : undefined,
        
        // Campos de anestesia
        tecnica_anestesica: formData.tecnicaAnestesica,
        codigo_tssu: formData.codigoTSSU,
        
        // Campos do procedimento (não-obstétrico)
        sangramento: formData.sangramento || undefined,
        nausea_vomito: formData.nauseaVomito || undefined,
        dor: formData.dor || undefined,
        observacoes_procedimento: formData.observacoesProcedimento,

        // Campos do procedimento (obstétrico)
        acompanhamento_antes: formData.acompanhamentoAntes || undefined,
        tipo_parto: formData.tipoParto || undefined,
        tipo_cesariana: formData.tipoCesariana || undefined,
        indicacao_cesariana: formData.indicacaoCesariana || undefined,
        descricao_indicacao_cesariana: formData.descricaoIndicacaoCesariana || undefined,
        retencao_placenta: formData.retencaoPlacenta || undefined,
        laceracao_presente: formData.laceracaoPresente || undefined,
        grau_laceracao: formData.grauLaceracao || undefined,
        hemorragia_puerperal: formData.hemorragiaPuerperal || undefined,
        transfusao_realizada: formData.transfusaoRealizada || undefined,
        
        // Campos financeiros
        payment_status: (STATUS_PAGAMENTO_MAP[formData.statusPagamento] || 'pending') as 'pending' | 'paid' | 'cancelled',
        payment_date: formData.statusPagamento === 'Pago' && formData.dataPagamento ? formData.dataPagamento : undefined,
        forma_pagamento: formData.formaPagamento,
        numero_parcelas: formData.numero_parcelas ? parseInt(formData.numero_parcelas) : undefined,
        parcelas_recebidas: formData.parcelas ? formData.parcelas.filter(p => p.recebida).length : 0,
        observacoes_financeiras: formData.observacoes,
        secretaria_id: formData.secretariaId && formData.secretariaId.trim() !== '' ? formData.secretariaId : null,
        user_id: user.id,

        // Campos de feedback
        feedback_solicitado: formData.enviarRelatorioCirurgiao === 'Sim',
        email_cirurgiao: formData.enviarRelatorioCirurgiao === 'Sim' ? formData.emailCirurgiao : undefined,
        telefone_cirurgiao: formData.enviarRelatorioCirurgiao === 'Sim' ? formData.telefoneCirurgiao : undefined
      }

      console.log('💾 Chamando procedureService.createProcedure...')
      console.log('📦 Dados enviados:', procedureData)
      
      const result = await procedureService.createProcedure(procedureData)
      
      console.log('✅ Resultado do createProcedure:', result)
      
      if (!result) {
        console.error('❌ Erro: procedureService.createProcedure retornou null ou undefined')
        showFeedback('error', '❌ Falha ao salvar: Não foi possível criar o procedimento. Verifique sua conexão e tente novamente.')
        setLoading(false)
        return
      }
      
      console.log('✅ Procedimento criado com sucesso! ID:', result.id)
      
      // Se foi solicitado envio de relatório para o cirurgião, criar link de feedback
      let feedbackUrl = ''
      if (formData.enviarRelatorioCirurgiao === 'Sim' && formData.emailCirurgiao) {
        try {
          const feedbackLink = await feedbackService.createFeedbackLinkOnly({
            procedureId: result.id,
            emailCirurgiao: formData.emailCirurgiao,
            telefoneCirurgiao: formData.telefoneCirurgiao
          })
          if (feedbackLink) {
            feedbackUrl = feedbackLink
          } else {
            console.error('Erro ao criar link de feedback')
          }
        } catch (feedbackError) {
          console.error('Erro ao criar link de feedback:', feedbackError)
          // Não bloquear o salvamento do procedimento se o link de feedback falhar
        }
      }
        // Salvar parcelas individuais se existirem
        if (formData.parcelas && formData.parcelas.length > 0) {
          
          const parcelasData = formData.parcelas.map(parcela => ({
            procedure_id: result.id,
            numero_parcela: parcela.numero,
            valor_parcela: parcela.valor,
            recebida: parcela.recebida,
            data_recebimento: parcela.data_recebimento || null
          }))
          
          
          // Salvar parcelas no banco de dados
          const parcelasResult = await procedureService.createParcelas(parcelasData)
          
        } else {
          
        }

      // Salvar anexos se existirem
      console.log('📎 Verificando anexos...', { totalArquivos: formData.fichas?.length || 0 })
      if (formData.fichas && formData.fichas.length > 0) {
        console.log('📤 Iniciando upload de', formData.fichas.length, 'arquivo(s)...')
        
        // Para cada arquivo, fazer upload para o Supabase Storage
        for (const file of formData.fichas) {
          console.log('📄 Processando arquivo:', file.name, 'Tamanho:', file.size, 'bytes')
          try {
            // Gerar nome único para o arquivo
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${user.id}/${result.id}/${fileName}`
            
            // Importar função utilitária para tipo MIME
            const { getCorrectMimeType, createFileWithCorrectMimeType } = await import('@/lib/mime-utils')
            
            // Obter tipo MIME correto
            const correctMimeType = getCorrectMimeType(file.name)
            
            // Validar que o arquivo original não está vazio
            if (file.size === 0) {
              console.error(`❌ Erro: Arquivo ${file.name} está vazio`)
              showFeedback('error', `Erro: O arquivo ${file.name} está vazio e não pode ser enviado`)
              continue
            }
            
            // CRÍTICO: Converter o arquivo para ArrayBuffer para evitar corrupção
            // O Supabase Storage precisa receber apenas o conteúdo binário puro,
            // não o File object que pode incluir headers multipart/form-data
            console.log(`📤 Convertendo arquivo para ArrayBuffer antes do upload:`, {
              nome: file.name,
              tamanho: file.size,
              tipoOriginal: file.type,
              tipoMIMECorreto: correctMimeType,
              caminho: filePath
            })
            
            // Converter o arquivo para ArrayBuffer para preservar o conteúdo binário puro
            const arrayBuffer = await file.arrayBuffer()
            
            // Validar que o ArrayBuffer não está vazio
            if (arrayBuffer.byteLength === 0) {
              console.error(`❌ Erro: ArrayBuffer do arquivo ${file.name} está vazio`)
              showFeedback('error', `Erro: O arquivo ${file.name} está vazio após conversão`)
              continue
            }
            
            // Validar que o tamanho foi preservado
            if (arrayBuffer.byteLength !== file.size) {
              console.error(`❌ Erro: Tamanho do ArrayBuffer (${arrayBuffer.byteLength}) não corresponde ao tamanho do arquivo (${file.size})`)
              showFeedback('error', `Erro: O arquivo ${file.name} foi corrompido durante a conversão`)
              continue
            }
            
            console.log(`✅ ArrayBuffer criado com sucesso: ${arrayBuffer.byteLength} bytes`)
            
            // Fazer upload do ArrayBuffer diretamente para o Supabase Storage
            // Isso garante que apenas o conteúdo binário puro seja enviado, sem headers multipart
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('procedure-attachments')
              .upload(filePath, arrayBuffer, {
                contentType: correctMimeType,
                upsert: false // Não sobrescrever arquivos existentes
              })
            
            if (uploadError) {
              console.error(`Erro ao fazer upload do arquivo ${file.name}:`, uploadError)
              
              // Verificar se o erro é relacionado a autenticação
              if (uploadError.message?.includes('Refresh Token') || 
                  uploadError.message?.includes('refresh_token') ||
                  uploadError.message?.includes('Invalid Refresh Token') ||
                  uploadError.message?.includes('401') ||
                  uploadError.message?.includes('Unauthorized')) {
                showFeedback('error', 'Sessão expirada. Por favor, faça login novamente.')
                // Redirecionar para login após 2 segundos
                setTimeout(() => {
                  window.location.href = '/login?error=session_expired'
                }, 2000)
                return // Sair do loop de uploads
              }
              
              showFeedback('error', `Erro ao fazer upload do arquivo ${file.name}: ${uploadError.message}`)
              continue
            }
            
            // Obter URL pública do arquivo
            const { data: urlData } = supabase.storage
              .from('procedure-attachments')
              .getPublicUrl(filePath)
            
            // Criar registro no banco de dados
            const attachmentData = {
              procedure_id: result.id,
              file_name: file.name,
              file_size: file.size,
              file_type: correctMimeType, // Usar o tipo MIME correto
              file_url: urlData.publicUrl
            }
            
            console.log('💾 Criando registro do anexo no banco de dados...')
            const attachmentResult = await procedureService.createAttachment(attachmentData)
            console.log('✅ Anexo registrado:', attachmentResult ? 'Sucesso' : 'Falhou')
            
          } catch (error) {
            console.error(`❌ Erro ao processar anexo ${file.name}:`, error)
            // Continuar com os outros arquivos mesmo se um falhar
          }
        }
      }
      
      console.log('🎉 Preparando modal de sucesso...')
      // Preparar dados para o modal de sucesso
      setSuccessData({
        paciente: formData.nomePaciente,
        procedimento: formData.tipoProcedimento,
        valor: formData.valor,
        parcelas: formData.parcelas && formData.parcelas.length > 0 ? `${formData.parcelas.filter(p => p.recebida).length}/${formData.parcelas.length} recebidas` : 'Não parcelado',
        feedbackUrl: feedbackUrl || undefined,
        emailCirurgiao: formData.emailCirurgiao || undefined,
        telefoneCirurgiao: formData.telefoneCirurgiao || undefined
      })
      
      // Mostrar modal de sucesso
      console.log('✅ Procedimento salvo com sucesso! Mostrando modal...')
      setShowSuccessModal(true)
    } catch (error: any) {
      console.error('❌ ERRO AO SALVAR PROCEDIMENTO:', error)
      console.error('📋 Detalhes do erro:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        error: error
      })
      
      // Mensagens de erro mais específicas baseadas no tipo de erro
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          showFeedback('error', '🌐 Erro de conexão: Verifique sua internet e tente novamente.')
        } else if (error.message.includes('auth') || error.message.includes('permission')) {
          showFeedback('error', '🔐 Erro de permissão: Sua sessão expirou. Faça login novamente.')
        } else {
          showFeedback('error', '❌ Erro inesperado: Tente novamente ou entre em contato com o suporte.')
        }
      } else {
        showFeedback('error', '❌ Erro inesperado: Tente novamente ou entre em contato com o suporte.')
      }
    } finally {
      setLoading(false)
    }
  }

  const sections = [
    { id: 0, title: 'Identificação do Procedimento', icon: User },
    { id: 1, title: 'Dados do Procedimento', icon: Stethoscope },
    { id: 2, title: 'Dados Administrativos', icon: DollarSign },
    { id: 3, title: 'Upload de Fichas (Opcional)', icon: Upload }
  ]

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8 px-4 md:px-0">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-3">
              <Link href="/procedimentos">
                <Button variant="ghost" size="sm" className="text-sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              Novo Procedimento Anestésico
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Cadastre um novo procedimento com todas as informações
            </p>
          </div>
        </div>

        {/* Progress Steps - Mobile Optimized */}
        <div className="mb-6">
          {/* Mobile: Horizontal scrollable steps */}
          <div className="block md:hidden">
            <div className="flex space-x-3 overflow-x-auto pb-2 px-4">
              {sections.map((section, index) => {
                const Icon = section.icon
                const isActive = currentSection === section.id
                const isCompleted = currentSection > section.id
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(section.id)}
                    className={`flex-shrink-0 flex flex-col items-center p-3 rounded-lg min-w-[80px] transition-all duration-200 ${
                      isActive 
                        ? 'bg-teal-500 text-white' 
                        : isCompleted
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-1">
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className="text-xs text-center leading-tight">
                      {section.title.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Desktop: Original horizontal layout */}
          <div className="hidden md:flex items-center justify-center space-x-4">
            {sections.map((section, index) => {
              const Icon = section.icon
              const isActive = currentSection === section.id
              const isCompleted = currentSection > section.id
              
              return (
                <div key={section.id} className="flex items-center">
                  <button
                    onClick={() => setCurrentSection(section.id)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                      isActive 
                        ? 'bg-teal-500 border-teal-500 text-white' 
                        : isCompleted
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400 hover:border-teal-300'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </button>
                  {index < sections.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      currentSection > section.id ? 'bg-teal-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form */}
        <form>
          {feedbackType && (
            <div className={`flex items-start space-x-3 p-4 rounded-lg mb-6 ${
              feedbackType === 'error' ? 'bg-red-50 border border-red-200' :
              feedbackType === 'success' ? 'bg-green-50 border border-green-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              {feedbackType === 'error' && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
              {feedbackType === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />}
              {feedbackType === 'info' && <div className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0 animate-spin">⏳</div>}
              
              <div className={`text-sm whitespace-pre-line ${
                feedbackType === 'error' ? 'text-red-600' :
                feedbackType === 'success' ? 'text-green-600' :
                'text-blue-600'
              }`}>
                {feedbackType === 'error' ? error : feedbackType === 'success' ? success : '⏳ Salvando procedimento...'}
              </div>
            </div>
          )}

          {/* Section 0: Identificação do Procedimento */}
          {currentSection === 0 && (
        <Card>
          <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Identificação do Procedimento
                </CardTitle>
          </CardHeader>
              <div className="p-6 space-y-6">
            {/* Dados da Paciente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nome da Paciente *"
                placeholder="Nome completo da paciente"
                icon={<User className="w-5 h-5" />}
                    value={formData.nomePaciente}
                    onChange={(e) => updateFormData('nomePaciente', e.target.value)}
                required
              />
              <Input
                    label="Data de Nascimento *"
                    type="date"
                    icon={<Calendar className="w-5 h-5" />}
                    value={formData.dataNascimento}
                    onChange={(e) => updateFormData('dataNascimento', e.target.value)}
                required
              />
              <Input
                    label="Idade"
                    type="text"
                    icon={<User className="w-5 h-5" />}
                    value={formData.dataNascimento ? `${calculateAge(formData.dataNascimento)} anos` : ''}
                    disabled
                    placeholder="Calculada automaticamente"
              />
              <Input
                    label="Convênio / Particular"
                    placeholder="Ex: Unimed, Particular"
                    icon={<CreditCard className="w-5 h-5" />}
                    value={formData.convenio}
                    onChange={(e) => updateFormData('convenio', e.target.value)}
              />
              <Input
                    label="Carterinha/Prontuário"
                    placeholder="Número da carteirinha ou prontuário"
                    icon={<CreditCard className="w-5 h-5" />}
                    value={formData.carteirinha}
                    onChange={(e) => updateFormData('carteirinha', e.target.value)}
              />
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sexo do Paciente
                </label>
                <select
                  value={formData.patientGender}
                  onChange={(e) => updateFormData('patientGender', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                >
                  <option value="">Selecione...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Other">Outro</option>
                </select>
              </div>
            </div>


            {/* Procedimento e Equipe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Tipo do Procedimento *"
                placeholder="Descreva o tipo de procedimento"
                    icon={<FileText className="w-5 h-5" />}
                    value={formData.tipoProcedimento}
                    onChange={(e) => updateFormData('tipoProcedimento', e.target.value)}
                    required
                  />

              {/* Campo de Técnica Anestésica com busca */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Técnica Anestésica *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Digite para buscar anestesia ou digite livremente..."
                    value={buscaAnestesia !== '' ? buscaAnestesia : formData.tecnicaAnestesica}
                    onChange={(e) => filtrarAnestesias(e.target.value)}
                    onFocus={() => setBuscaAnestesia(formData.tecnicaAnestesica || '')}
                    onBlur={handleAnestesiaBlur}
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                {/* Dropdown de anestesias filtradas */}
                {buscaAnestesia !== '' && anestesiasFiltradas.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {anestesiasFiltradas.map((anestesia) => (
                      <button
                        key={anestesia.codigo}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-teal-50 focus:bg-teal-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                        onClick={() => selecionarAnestesia(anestesia)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-gray-900 font-medium">{anestesia.nome}</span>
                          <span className="text-sm text-teal-600 font-mono">{anestesia.codigo}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Mostrar código TSSU selecionado */}
                {formData.codigoTSSU && (
                  <div className="mt-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-md">
                    <span className="text-sm text-teal-700">
                      <strong>Código TSSU:</strong> {formData.codigoTSSU}
                    </span>
                  </div>
                )}
              </div>

              <Input
                label="Nome da Equipe"
                placeholder="Nome da equipe médica"
                icon={<Users className="w-5 h-5" />}
                value={formData.nomeEquipe}
                onChange={(e) => updateFormData('nomeEquipe', e.target.value)}
              />
                  <Input
                    label="Nome do Cirurgião"
                    placeholder="Nome do cirurgião responsável"
                    icon={<UserCheck className="w-5 h-5" />}
                    value={formData.nomeCirurgiao}
                    onChange={(e) => updateFormData('nomeCirurgiao', e.target.value)}
                  />
                  <Input
                    label="Hospital / Clínica"
                    placeholder="Nome do hospital ou clínica"
                    icon={<Building className="w-5 h-5" />}
                    value={formData.hospital}
                    onChange={(e) => updateFormData('hospital', e.target.value)}
                  />
            </div>

            {/* Horário e Duração */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Horário"
                placeholder="Ex: 14:30"
                type="time"
                icon={<Clock className="w-5 h-5" />}
                value={formData.horario}
                onChange={(e) => updateFormData('horario', e.target.value)}
              />
              <Input
                label="Duração (horas)"
                placeholder="Ex: 2 ou 2.5"
                type="number"
                icon={<Clock className="w-5 h-5" />}
                value={formData.duracaoMinutos}
                onChange={(e) => updateFormData('duracaoMinutos', e.target.value)}
                min="0"
                step="0.5"
              />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                rows={4}
                placeholder="Intercorrências iniciais, comorbidades da paciente, observações importantes..."
                value={formData.observacoes}
                onChange={(e) => updateFormData('observacoes', e.target.value)}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Section 1: Dados do Procedimento */}
          {currentSection === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Stethoscope className="w-5 h-5 mr-2" />
                  Dados do Procedimento
                </CardTitle>
              </CardHeader>
              <div className="p-6 space-y-6">
                {/* Campos para procedimentos não-obstétricos */}
                {!isObstetricProcedure(formData.tipoProcedimento) && (
                  <div className="space-y-6">
                    {/* Sangramento */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Sangramento?
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value="Sim"
                            checked={formData.sangramento === 'Sim'}
                            onChange={(e) => updateFormData('sangramento', e.target.value)}
                            className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Sim</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value="Não"
                            checked={formData.sangramento === 'Não'}
                            onChange={(e) => updateFormData('sangramento', e.target.value)}
                            className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Não</span>
                        </label>
                      </div>
            </div>

                    {/* Náuseas e Vômitos */}
                    <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                        Náuseas e Vômitos?
                  </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                        <input
                            type="radio"
                            value="Sim"
                            checked={formData.nauseaVomito === 'Sim'}
                            onChange={(e) => updateFormData('nauseaVomito', e.target.value)}
                            className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Sim</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value="Não"
                            checked={formData.nauseaVomito === 'Não'}
                            onChange={(e) => updateFormData('nauseaVomito', e.target.value)}
                            className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Não</span>
                        </label>
                      </div>
                    </div>

                    {/* Dor */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Dor?
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value="Sim"
                            checked={formData.dor === 'Sim'}
                            onChange={(e) => updateFormData('dor', e.target.value)}
                            className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Sim</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value="Não"
                            checked={formData.dor === 'Não'}
                            onChange={(e) => updateFormData('dor', e.target.value)}
                            className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Não</span>
                        </label>
                                    </div>
                                    </div>

                    {/* Observações */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações
                      </label>
                      <textarea
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        rows={4}
                        placeholder="Observações adicionais sobre o procedimento..."
                        value={formData.observacoesProcedimento}
                        onChange={(e) => updateFormData('observacoesProcedimento', e.target.value)}
                      />
                                  </div>

                    {/* Relatório para Cirurgião */}
                    <div className="space-y-4 border-t pt-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Enviar relatório para Cirurgião?
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Sim"
                              checked={formData.enviarRelatorioCirurgiao === 'Sim'}
                              onChange={(e) => updateFormData('enviarRelatorioCirurgiao', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Sim</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Não"
                              checked={formData.enviarRelatorioCirurgiao === 'Não'}
                              onChange={(e) => updateFormData('enviarRelatorioCirurgiao', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Não</span>
                          </label>
                                  </div>
                                </div>

                      {/* Campos de contato condicionais */}
                      {formData.enviarRelatorioCirurgiao === 'Sim' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Email do Cirurgião
                            </label>
                            <input
                              type="email"
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="email@exemplo.com"
                              value={formData.emailCirurgiao}
                              onChange={(e) => updateFormData('emailCirurgiao', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Telefone do Cirurgião
                            </label>
                            <input
                              type="tel"
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="(11) 99999-9999"
                              value={formData.telefoneCirurgiao}
                              onChange={(e) => updateFormData('telefoneCirurgiao', e.target.value)}
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            Após salvar o procedimento, você receberá um link para enviar ao cirurgião
                          </p>
                      </div>
                    )}
                  </div>
                  </div>
                )}

                {/* Campos Específicos para Procedimentos Obstétricos */}
                {isObstetricProcedure(formData.tipoProcedimento) && (
                  <>
                    <div className="mt-8 space-y-6 border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900">
                        Dados Específicos do Procedimento Obstétrico
                      </h3>
                      <div className="space-y-6">
                      {/* Acompanhamento antes */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Acompanhamento antes?
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Sim"
                              checked={formData.acompanhamentoAntes === 'Sim'}
                              onChange={(e) => updateFormData('acompanhamentoAntes', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Sim</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Não"
                              checked={formData.acompanhamentoAntes === 'Não'}
                              onChange={(e) => updateFormData('acompanhamentoAntes', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Não</span>
                          </label>
                              </div>
                              </div>

                      {/* Retenção de Placenta */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Retenção de Placenta?
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Sim"
                              checked={formData.retencaoPlacenta === 'Sim'}
                              onChange={(e) => updateFormData('retencaoPlacenta', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Sim</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Não"
                              checked={formData.retencaoPlacenta === 'Não'}
                              onChange={(e) => updateFormData('retencaoPlacenta', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Não</span>
                          </label>
                            </div>
                          </div>

                      {/* Laceração */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Laceração?
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Sim"
                              checked={formData.laceracaoPresente === 'Sim'}
                              onChange={(e) => updateFormData('laceracaoPresente', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Sim</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Não"
                              checked={formData.laceracaoPresente === 'Não'}
                              onChange={(e) => updateFormData('laceracaoPresente', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Não</span>
                          </label>
                        </div>
                        </div>

                      {/* Grau de Laceração (condicional) */}
                      {formData.laceracaoPresente === 'Sim' && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Grau da Laceração
                          </label>
                          <div className="flex items-center space-x-6">
                            {['1', '2', '3', '4'].map((grau) => (
                              <label key={grau} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value={grau}
                                  checked={formData.grauLaceracao === grau}
                                  onChange={(e) => updateFormData('grauLaceracao', e.target.value)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">Grau {grau}</span>
                              </label>
                            ))}
                      </div>
                    </div>
                  )}

                      {/* Hemorragia Puerperal */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                          Hemorragia Puerperal?
                      </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Sim"
                              checked={formData.hemorragiaPuerperal === 'Sim'}
                              onChange={(e) => updateFormData('hemorragiaPuerperal', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Sim</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Não"
                              checked={formData.hemorragiaPuerperal === 'Não'}
                              onChange={(e) => updateFormData('hemorragiaPuerperal', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Não</span>
                          </label>
                        </div>
                        </div>

                      {/* Transfusão (condicional) */}
                      {formData.hemorragiaPuerperal === 'Sim' && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Transfusão Realizada?
                          </label>
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                value="Sim"
                                checked={formData.transfusaoRealizada === 'Sim'}
                                onChange={(e) => updateFormData('transfusaoRealizada', e.target.value)}
                                className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                              />
                              <span className="text-sm text-gray-700">Sim</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                value="Não"
                                checked={formData.transfusaoRealizada === 'Não'}
                                onChange={(e) => updateFormData('transfusaoRealizada', e.target.value)}
                                className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                              />
                              <span className="text-sm text-gray-700">Não</span>
                            </label>
                  </div>
                    </div>
                  )}

                  {/* Relatório para Cirurgião */}
                  <div className="mt-8 space-y-6 border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Relatório para Cirurgião
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Enviar relatório para Cirurgião?
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Sim"
                              checked={formData.enviarRelatorioCirurgiao === 'Sim'}
                              onChange={(e) => updateFormData('enviarRelatorioCirurgiao', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Sim</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Não"
                              checked={formData.enviarRelatorioCirurgiao === 'Não'}
                              onChange={(e) => updateFormData('enviarRelatorioCirurgiao', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Não</span>
                          </label>
                        </div>
                      </div>

                      {/* Campos de contato condicionais */}
                      {formData.enviarRelatorioCirurgiao === 'Sim' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Email do Cirurgião
                            </label>
                            <input
                              type="email"
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="email@exemplo.com"
                              value={formData.emailCirurgiao}
                              onChange={(e) => updateFormData('emailCirurgiao', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Telefone do Cirurgião
                            </label>
                            <input
                              type="tel"
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="(11) 99999-9999"
                              value={formData.telefoneCirurgiao}
                              onChange={(e) => updateFormData('telefoneCirurgiao', e.target.value)}
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            Após salvar o procedimento, você receberá um link para enviar ao cirurgião
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Campos específicos baseados no tipo de procedimento */}
                  {isPartoNormal(formData.tipoProcedimento) && (
                    <>
                      {/* Tipo de Parto - apenas para parto normal */}
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Parto instrumentalizado, vaginal ou cesariana?
                        </label>
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Instrumentalizado"
                              checked={formData.tipoParto === 'Instrumentalizado'}
                              onChange={(e) => updateFormData('tipoParto', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Instrumentalizado</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Vaginal"
                              checked={formData.tipoParto === 'Vaginal'}
                              onChange={(e) => updateFormData('tipoParto', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Vaginal</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Cesariana"
                              checked={formData.tipoParto === 'Cesariana'}
                              onChange={(e) => updateFormData('tipoParto', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Cesariana</span>
                          </label>
                        </div>
                      </div>

                      {/* Campo condicional para Cesariana quando selecionada em parto normal */}
                      {formData.tipoParto === 'Cesariana' && (
                        <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Tipo de Anestesia
                            </label>
                            <div className="flex items-center space-x-6">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="Nova Ráqui"
                                  checked={formData.tipoCesariana === 'Nova Ráqui'}
                                  onChange={(e) => updateFormData('tipoCesariana', e.target.value)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">Nova Ráqui</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="Geral"
                                  checked={formData.tipoCesariana === 'Geral'}
                                  onChange={(e) => updateFormData('tipoCesariana', e.target.value)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">Geral</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="Complementação pelo Cateter"
                                  checked={formData.tipoCesariana === 'Complementação pelo Cateter'}
                                  onChange={(e) => updateFormData('tipoCesariana', e.target.value)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">Complementação pelo Cateter</span>
                              </label>
                            </div>
                          </div>

                          {/* Indicação de Cesariana */}
                          <div className="space-y-2 mt-4">
                            <label className="block text-sm font-medium text-gray-700">
                              Indicação de Cesariana?
                            </label>
                            <div className="flex items-center space-x-4">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="Sim"
                                  checked={formData.indicacaoCesariana === 'Sim'}
                                  onChange={(e) => updateFormData('indicacaoCesariana', e.target.value)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">Sim</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="Não"
                                  checked={formData.indicacaoCesariana === 'Não'}
                                  onChange={(e) => updateFormData('indicacaoCesariana', e.target.value)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">Não</span>
                              </label>
                            </div>
                          </div>

                          {/* Campo de texto para descrição da indicação */}
                          {formData.indicacaoCesariana === 'Sim' && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descreva a Indicação
                              </label>
                              <textarea
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                rows={3}
                                placeholder="Descreva a indicação da cesariana..."
                                value={formData.descricaoIndicacaoCesariana}
                                onChange={(e) => updateFormData('descricaoIndicacaoCesariana', e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Campos específicos para cesariana direta */}
                  {isCesarianaDireta(formData.tipoProcedimento) && (
                    <div className="space-y-4">
                      {/* Tipo de Anestesia - apenas para cesariana direta */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Tipo de Anestesia
                        </label>
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Geral"
                              checked={formData.tipoCesariana === 'Geral'}
                              onChange={(e) => updateFormData('tipoCesariana', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Geral</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Complementação pelo Cateter"
                              checked={formData.tipoCesariana === 'Complementação pelo Cateter'}
                              onChange={(e) => updateFormData('tipoCesariana', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Complementação pelo Cateter</span>
                          </label>
                        </div>
                      </div>

                      {/* Indicação de Cesariana */}
                      <div className="space-y-2 mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Indicação de Cesariana?
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Sim"
                              checked={formData.indicacaoCesariana === 'Sim'}
                              onChange={(e) => updateFormData('indicacaoCesariana', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Sim</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              value="Não"
                              checked={formData.indicacaoCesariana === 'Não'}
                              onChange={(e) => updateFormData('indicacaoCesariana', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Não</span>
                          </label>
                        </div>
                      </div>

                      {/* Campo de texto para descrição da indicação */}
                      {formData.indicacaoCesariana === 'Sim' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descreva a Indicação
                          </label>
                          <textarea
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            rows={3}
                            placeholder="Descreva a indicação da cesariana..."
                            value={formData.descricaoIndicacaoCesariana}
                            onChange={(e) => updateFormData('descricaoIndicacaoCesariana', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Section 2: Dados Administrativos */}
          {currentSection === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Dados Administrativos
                </CardTitle>
              </CardHeader>
              <div className="p-6 space-y-6">
                {/* Secretaria Responsável - Primeiro item */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adicionar Secretária *
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    value={formData.secretariaId}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        // Abrir modal de cadastro de secretária
                        setShowSecretariaModal(true)
                      } else {
                        updateFormData('secretariaId', e.target.value)
                      }
                    }}
                  >
                    <option value="">Nenhum</option>
                    {secretariasVinculadas.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.nome} ({sec.email})
                      </option>
                    ))}
                    <option value="new">+ Vincular Nova Secretária</option>
                  </select>
                  {formData.secretariaId && formData.secretariaId !== 'new' && (
                    <p className="text-sm text-gray-600 mt-1">
                      {(() => {
                        const selected = secretariasVinculadas.find(s => s.id === formData.secretariaId)
                        return selected 
                          ? `Secretária vinculada: ${selected.nome} (${selected.email})`
                          : 'Secretária selecionada'
                      })()}
                    </p>
                  )}
                </div>

                {/* Status do Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status do Pagamento
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    value={formData.statusPagamento}
                    onChange={(e) => updateFormData('statusPagamento', e.target.value)}
                  >
                    {STATUS_PAGAMENTO.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                {/* Campos condicionais baseados no status */}
                {formData.statusPagamento === 'Pendente' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Valor do Procedimento Anestésico"
                        placeholder="0,00"
                        icon={<span className="text-gray-500 font-medium">R$</span>}
                        value={formData.valor}
                        onChange={(e) => updateFormData('valor', e.target.value)}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Forma de Pagamento
                        </label>
                        <select
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          value={formData.formaPagamento}
                          onChange={(e) => updateFormData('formaPagamento', e.target.value)}
                        >
                          <option value="">Selecione a forma de pagamento</option>
                          {FORMAS_PAGAMENTO_PENDENTE.map(forma => (
                            <option key={forma} value={forma}>{forma}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Campo condicional para número de parcelas */}
                    {formData.formaPagamento === 'Parcelado' && (
                      <div className="space-y-4">
                        <div className="max-w-xs">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total de Parcelas
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="24"
                            placeholder="Ex: 3"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            value={formData.numero_parcelas}
                            onChange={(e) => updateFormData('numero_parcelas', e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Informe em quantas vezes será dividido o pagamento
                          </p>
                        </div>
                        
                        {/* Parcelas individuais */}
                        {formData.parcelas.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-700">Controle de Parcelas</h4>
                            {formData.parcelas.map((parcela, index) => (
                              <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    Parcela {parcela.numero}
                                  </span>
                                  <span className="text-sm font-bold text-teal-600">
                                    R$ {parcela.valor.toFixed(2).replace('.', ',')}
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  <label className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={parcela.recebida}
                                      onChange={(e) => updateParcela(index, 'recebida', e.target.checked)}
                                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                    />
                                    <span className="text-sm text-gray-600">Recebida</span>
                                  </label>
                                  
                                  {parcela.recebida && (
                                    <div className="ml-6">
                                      <label className="block text-xs text-gray-500 mb-1">
                                        Data de recebimento
                                      </label>
                                      <input
                                        type="date"
                                        value={parcela.data_recebimento}
                                        onChange={(e) => updateParcela(index, 'data_recebimento', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {formData.statusPagamento === 'Pago' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Valor do Procedimento Anestésico"
                        placeholder="0,00"
                        icon={<span className="text-gray-500 font-medium">R$</span>}
                        value={formData.valor}
                        onChange={(e) => updateFormData('valor', e.target.value)}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data do Pagamento
                        </label>
                        <input
                          type="date"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          value={formData.dataPagamento}
                          onChange={(e) => updateFormData('dataPagamento', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Forma de Pagamento
                        </label>
                        <select
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          value={formData.formaPagamento}
                          onChange={(e) => updateFormData('formaPagamento', e.target.value)}
                        >
                          <option value="">Selecione a forma de pagamento</option>
                          {FORMAS_PAGAMENTO_PAGO.map(forma => (
                            <option key={forma} value={forma}>{forma}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Campos condicionais para parcelas */}
                      {formData.formaPagamento === 'Parcelado' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Total de Parcelas
                            </label>
                            <input
                              type="number"
                              min="2"
                              max="24"
                              placeholder="Ex: 3"
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              value={formData.numero_parcelas}
                              onChange={(e) => updateFormData('numero_parcelas', e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Informe em quantas vezes foi dividido o pagamento
                            </p>
                          </div>
                          
                          {/* Parcelas individuais */}
                          {formData.parcelas.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-gray-700">Controle de Parcelas</h4>
                              {formData.parcelas.map((parcela, index) => (
                                <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      Parcela {parcela.numero}
                                    </span>
                                    <span className="text-sm font-bold text-teal-600">
                                      R$ {parcela.valor.toFixed(2).replace('.', ',')}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={parcela.recebida}
                                        onChange={(e) => updateParcela(index, 'recebida', e.target.checked)}
                                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                      />
                                      <span className="text-sm text-gray-600">Recebida</span>
                                    </label>
                                    
                                    {parcela.recebida && (
                                      <div className="ml-6">
                                        <label className="block text-xs text-gray-500 mb-1">
                                          Data de recebimento
                                        </label>
                                        <input
                                          type="date"
                                          value={parcela.data_recebimento}
                                          onChange={(e) => updateParcela(index, 'data_recebimento', e.target.value)}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formData.statusPagamento === 'Aguardando' && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">
                      Quando o valor for definido, você poderá atualizar o status do pagamento.
                    </p>
                  </div>
                )}

                {/* Campo Secretaria */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações Financeiras
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 bg-white"
                rows={4}
                    placeholder="Observações sobre pagamento, convênio, etc..."
                    value={formData.observacoes}
                    onChange={(e) => updateFormData('observacoes', e.target.value)}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Section 3: Upload de Fichas */}
          {currentSection === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload de Ficha Anestésica (Opcional)
                </CardTitle>
              </CardHeader>
              <div className="p-6 space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload de Fichas Anestésicas (Opcional)
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Faça upload de até 10 arquivos (PDF, JPG, PNG) - Campo opcional
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar Arquivos
                  </label>
                </div>

                {formData.fichas.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      Arquivos Selecionados ({formData.fichas.length}/10)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {formData.fichas.map((file, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <FileImage className="w-5 h-5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                          {previewFiles[index] && file.type.startsWith('image/') && (
                            <div className="mt-2">
                              <img
                                src={previewFiles[index]}
                                alt="Preview"
                                className="w-full h-20 object-cover rounded"
              />
            </div>
                          )}
                          {previewFiles[index] && file.type === 'application/pdf' && (
                            <div className="mt-2 flex items-center justify-center h-20 bg-gray-100 rounded">
                              <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
                      ))}
                  </div>
                        </div>
                      )}
                            </div>
                          </Card>
          )}


          {/* Navigation - Mobile Optimized */}
          <div className="mt-8">
            {/* Mobile: Stacked buttons */}
            <div className="block md:hidden space-y-3">
              {currentSection < 3 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentSection(Math.min(3, currentSection + 1))}
                  className="w-full py-4 text-lg font-medium"
                >
                  Próximo
                  <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-4 text-lg font-medium bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {loading ? 'Salvando...' : 'Finalizar e Salvar'}
                </Button>
              )}
              
              {currentSection > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                  className="w-full py-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
              )}
            </div>
            
            {/* Desktop: Side by side buttons */}
            <div className="hidden md:flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              {currentSection < 3 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentSection(Math.min(3, currentSection + 1))}
                >
                  Próximo
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Salvando...' : 'Finalizar e Salvar'}
                </Button>
              )}
            </div>
            </div>
          </form>
      </div>

      {/* Modal de Sucesso */}
      {showSuccessModal && successData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header do Modal */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  ✅ Procedimento Criado com Sucesso!
                </h3>
                <p className="text-gray-600">
                  Seu procedimento foi salvo e está disponível na lista.
                </p>
              </div>

              {/* Detalhes do Procedimento */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Detalhes do Procedimento</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Paciente:</span>
                    <p className="text-gray-900 font-medium">{successData.paciente}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Procedimento:</span>
                    <p className="text-gray-900 font-medium">{successData.procedimento}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Data:</span>
                    <p className="text-gray-900 font-medium">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Valor:</span>
                    <p className="text-gray-900 font-medium">R$ {successData.valor}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-sm font-medium text-gray-500">Parcelas:</span>
                    <p className="text-gray-900 font-medium">{successData.parcelas}</p>
                  </div>
                </div>
              </div>

              {/* Seção do Link de Feedback */}
              {successData.feedbackUrl && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-teal-900 mb-4">🔗 Link para o Cirurgião</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-teal-700 mb-2">
                        Link do Formulário:
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={successData.feedbackUrl}
                          readOnly
                          className="flex-1 px-3 py-2 border border-teal-300 rounded-md bg-white text-sm font-mono"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(successData.feedbackUrl!)
                            showFeedback('success', 'Link copiado para a área de transferência!')
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2"
                        >
                          Copiar
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-teal-700">Email:</span>
                        <p className="text-teal-900 font-medium">{successData.emailCirurgiao}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-teal-700">Telefone:</span>
                        <p className="text-teal-900 font-medium">{successData.telefoneCirurgiao}</p>
                      </div>
                    </div>
                    <div className="bg-teal-100 border border-teal-300 rounded-md p-3">
                      <p className="text-sm text-teal-800">
                        <strong>📋 Instruções:</strong> Copie o link acima e envie para o cirurgião via WhatsApp, email ou SMS. 
                        O cirurgião poderá acessar o formulário de feedback através deste link.
                      </p>
                      <p className="text-sm text-teal-700 mt-2">
                        <strong>⏰ Validade:</strong> Este link expira em 48 horas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão de Fechar */}
              <div className="flex justify-center">
                <Button
                  onClick={handleSuccessModalClose}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-lg"
                >
                  Ir para Lista de Procedimentos
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Secretária */}
      {showSecretariaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-teal-200 bg-teal-50">
              <h3 className="text-lg font-semibold text-teal-800">Vincular Nova Secretária</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowSecretariaModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Secretária *
                </label>
                <input
                  type="text"
                  id="secretariaNome"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Nome completo da secretária"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="secretariaEmail"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="secretariaTelefone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-teal-200">
              <Button 
                variant="outline"
                onClick={() => setShowSecretariaModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={async () => {
                  const nome = (document.getElementById('secretariaNome') as HTMLInputElement)?.value
                  const email = (document.getElementById('secretariaEmail') as HTMLInputElement)?.value
                  const telefone = (document.getElementById('secretariaTelefone') as HTMLInputElement)?.value
                  
                  if (!nome || !email) {
                    alert('Nome e email são obrigatórios')
                    return
                  }
                  
                  const result = await linkSecretaria(email, nome, telefone)
                  if (result.success) {
                    // Recarregar lista de secretárias vinculadas
                    await loadSecretarias()
                    setShowSecretariaModal(false)
                    // Se for nova secretaria, informar sobre senha temporária
                    if (result.isNew) {
                      alert('Secretaria vinculada com sucesso! Uma senha temporária foi gerada. Verifique o console (F12) para ver a senha temporária.')
                    }
                  } else {
                    alert('Erro ao vincular secretária. Verifique se o email está correto e tente novamente.')
                  }
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Vincular Secretária
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default function NovoProcedimento() {
  return (
    <ProtectedRoute>
      <NovoProcedimentoContent />
    </ProtectedRoute>
  )
}
