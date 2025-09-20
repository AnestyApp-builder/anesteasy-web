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
  MapPin,
  FileImage,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { procedureService } from '@/lib/procedures'
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
  especialidadeCirurgiao: string
  nomeCirurgiao: string
  hospital: string
  
  // 2. Dados do Procedimento
  dataCirurgia: string
  horaInicio: string
  horaTermino: string
  tipoAnestesia: string[]
  duracao: string
  
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

// Lista expandida de anestesias com códigos TSSU
const TIPOS_ANESTESIA_COMPLETOS = [
  // Anestesia Geral
  { nome: 'Anestesia Geral - Intubação Orotraqueal', codigo: '31001001', categoria: 'Anestesia Geral' },
  { nome: 'Anestesia Geral - Máscara Laríngea', codigo: '31001002', categoria: 'Anestesia Geral' },
  { nome: 'Anestesia Geral - Via Aérea Natural', codigo: '31001003', categoria: 'Anestesia Geral' },
  { nome: 'Anestesia Geral - TIVA (Total Intravenous Anesthesia)', codigo: '31001004', categoria: 'Anestesia Geral' },
  { nome: 'Anestesia Geral - Balanceada', codigo: '31001005', categoria: 'Anestesia Geral' },
  
  // Anestesia Regional
  { nome: 'Raquianestesia', codigo: '31002001', categoria: 'Anestesia Regional' },
  { nome: 'Peridural', codigo: '31002002', categoria: 'Anestesia Regional' },
  { nome: 'Raqui-Peridural Combinada', codigo: '31002003', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Plexo Braquial', codigo: '31002004', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Plexo Lombossacral', codigo: '31002005', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Femoral', codigo: '31002006', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Ciático', codigo: '31002007', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Isquiático', codigo: '31002008', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Tibial', codigo: '31002009', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Fibular', codigo: '31002010', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Mediano', codigo: '31002011', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Ulnar', codigo: '31002012', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Radial', codigo: '31002013', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio Intercostal', codigo: '31002014', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Occipital', codigo: '31002015', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Trigêmeo', codigo: '31002016', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Facial', codigo: '31002017', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Vago', codigo: '31002018', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Frênico', codigo: '31002019', categoria: 'Anestesia Regional' },
  { nome: 'Bloqueio do Nervo Pudendo', codigo: '31002020', categoria: 'Anestesia Regional' },
  
  // Anestesia Local
  { nome: 'Anestesia Local Infiltrativa', codigo: '31003001', categoria: 'Anestesia Local' },
  { nome: 'Anestesia Local por Bloqueio de Campo', codigo: '31003002', categoria: 'Anestesia Local' },
  { nome: 'Anestesia Local por Bloqueio de Nervo', codigo: '31003003', categoria: 'Anestesia Local' },
  { nome: 'Anestesia Local Tópica', codigo: '31003004', categoria: 'Anestesia Local' },
  { nome: 'Anestesia Local por Bloqueio de Plexo', codigo: '31003005', categoria: 'Anestesia Local' },
  
  // Sedação
  { nome: 'Sedação Consciente', codigo: '31004001', categoria: 'Sedação' },
  { nome: 'Sedação Profunda', codigo: '31004002', categoria: 'Sedação' },
  { nome: 'Sedação com Propofol', codigo: '31004003', categoria: 'Sedação' },
  { nome: 'Sedação com Midazolam', codigo: '31004004', categoria: 'Sedação' },
  { nome: 'Sedação com Dexmedetomidina', codigo: '31004005', categoria: 'Sedação' },
  { nome: 'Sedação com Ketamina', codigo: '31004006', categoria: 'Sedação' },
  { nome: 'Sedação com Óxido Nitroso', codigo: '31004007', categoria: 'Sedação' },
  
  // Analgesia de Parto
  { nome: 'Analgesia de Parto - Peridural', codigo: '31005001', categoria: 'Analgesia de Parto' },
  { nome: 'Analgesia de Parto - Raquianestesia', codigo: '31005002', categoria: 'Analgesia de Parto' },
  { nome: 'Analgesia de Parto - Raqui-Peridural', codigo: '31005003', categoria: 'Analgesia de Parto' },
  { nome: 'Analgesia de Parto - PCA (Patient Controlled Analgesia)', codigo: '31005004', categoria: 'Analgesia de Parto' },
  { nome: 'Analgesia de Parto - Remifentanil', codigo: '31005005', categoria: 'Analgesia de Parto' },
  { nome: 'Analgesia de Parto - Sufentanil', codigo: '31005006', categoria: 'Analgesia de Parto' },
  { nome: 'Analgesia de Parto - Fentanil', codigo: '31005007', categoria: 'Analgesia de Parto' },
  { nome: 'Analgesia de Parto - Bupivacaína', codigo: '31005008', categoria: 'Analgesia de Parto' },
  { nome: 'Analgesia de Parto - Ropivacaína', codigo: '31005009', categoria: 'Analgesia de Parto' },
  { nome: 'Analgesia de Parto - Levobupivacaína', codigo: '31005010', categoria: 'Analgesia de Parto' },
  
  // Bloqueios Periféricos Específicos
  { nome: 'Bloqueio do Nervo Supraescapular', codigo: '31006001', categoria: 'Bloqueios Periféricos' },
  { nome: 'Bloqueio do Nervo Axilar', codigo: '31006002', categoria: 'Bloqueios Periféricos' },
  { nome: 'Bloqueio do Nervo Musculocutâneo', codigo: '31006003', categoria: 'Bloqueios Periféricos' },
  { nome: 'Bloqueio do Nervo Mediano no Punho', codigo: '31006004', categoria: 'Bloqueios Periféricos' },
  { nome: 'Bloqueio do Nervo Ulnar no Punho', codigo: '31006005', categoria: 'Bloqueios Periféricos' },
  { nome: 'Bloqueio do Nervo Radial no Punho', codigo: '31006006', categoria: 'Bloqueios Periféricos' },
  { nome: 'Bloqueio do Nervo Digital', codigo: '31006007', categoria: 'Bloqueios Periféricos' },
  { nome: 'Bloqueio do Nervo Plantar', codigo: '31006008', categoria: 'Bloqueios Periféricos' },
  { nome: 'Bloqueio do Nervo Sural', codigo: '31006009', categoria: 'Bloqueios Periféricos' },
  { nome: 'Bloqueio do Nervo Safeno', codigo: '31006010', categoria: 'Bloqueios Periféricos' },
  
  // Anestesia para Procedimentos Específicos
  { nome: 'Anestesia para Endoscopia Digestiva', codigo: '31007001', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Colonoscopia', codigo: '31007002', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Broncoscopia', codigo: '31007003', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cateterismo Cardíaco', codigo: '31007004', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Angioplastia', codigo: '31007005', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia Robótica', codigo: '31007006', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia Laparoscópica', codigo: '31007007', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia Torácica', codigo: '31007008', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia Cardíaca', codigo: '31007009', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia Neurológica', codigo: '31007010', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia Pediátrica', codigo: '31007011', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia Obstétrica', codigo: '31007012', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia de Emergência', codigo: '31007013', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia Ambulatorial', codigo: '31007014', categoria: 'Procedimentos Específicos' },
  { nome: 'Anestesia para Cirurgia de Trauma', codigo: '31007015', categoria: 'Procedimentos Específicos' }
]

// Lista simplificada para compatibilidade
const TIPOS_ANESTESIA = [
  'Anestesia Geral',
  'Anestesia Regional',
  'Anestesia Local',
  'Sedação',
  'Bloqueio Periférico',
  'Raquianestesia',
  'Peridural'
]

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

export default function NovoProcedimento() {
  const { user } = useAuth()
  const { secretaria } = useSecretaria()
  const [formData, setFormData] = useState<FormData>({
    nomePaciente: '',
    dataNascimento: '',
    convenio: '',
    carteirinha: '',
    tipoProcedimento: '',
    especialidadeCirurgiao: '',
    nomeCirurgiao: '',
    hospital: '',
    dataCirurgia: '',
    horaInicio: '',
    horaTermino: '',
    tipoAnestesia: [],
    duracao: '',
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

  // Definir secretaria automaticamente se houver uma vinculada
  useEffect(() => {
    if (secretaria) {
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

  // Função para formatar valor monetário para exibição
  const formatValueForDisplay = (value: string) => {
    if (!value) return ''
    const numericValue = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'))
    if (isNaN(numericValue)) return value
    return formatCurrency(numericValue)
  }
  const [previewFiles, setPreviewFiles] = useState<string[]>([])
  const router = useRouter()

  // Estados para o campo de anestesia com busca
  const [anestesiaSelecionada, setAnestesiaSelecionada] = useState<{
    nome: string
    codigo: string
    categoria: string
  } | null>(null)
  const [buscaAnestesia, setBuscaAnestesia] = useState('')
  const [mostrarListaAnestesia, setMostrarListaAnestesia] = useState(false)
  const [anestesiasFiltradas, setAnestesiasFiltradas] = useState(TIPOS_ANESTESIA_COMPLETOS)

  // Calcular duração automaticamente
  useEffect(() => {
    if (formData.horaInicio && formData.horaTermino) {
      const inicio = new Date(`2000-01-01T${formData.horaInicio}`)
      const termino = new Date(`2000-01-01T${formData.horaTermino}`)
      
      if (termino > inicio) {
        const diff = termino.getTime() - inicio.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setFormData(prev => ({
          ...prev,
          duracao: `${hours}h ${minutes}min`
        }))
      }
    }
  }, [formData.horaInicio, formData.horaTermino])

  // Validar data de nascimento
  const validateBirthDate = (date: string) => {
    const birthDate = new Date(date)
    const today = new Date()
    return birthDate <= today
  }

  // Validar hora de término
  const validateEndTime = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return true
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    return end > start
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

  // Handle tipo anestesia
  const handleTipoAnestesia = (tipo: string) => {
    setFormData(prev => ({
      ...prev,
      tipoAnestesia: prev.tipoAnestesia.includes(tipo)
        ? prev.tipoAnestesia.filter(t => t !== tipo)
        : [...prev.tipoAnestesia, tipo]
    }))
  }

  // Filtrar anestesias por busca
  useEffect(() => {
    if (buscaAnestesia.trim() === '') {
      setAnestesiasFiltradas(TIPOS_ANESTESIA_COMPLETOS)
    } else {
      const filtradas = TIPOS_ANESTESIA_COMPLETOS.filter(anestesia =>
        anestesia.nome.toLowerCase().includes(buscaAnestesia.toLowerCase()) ||
        anestesia.codigo.includes(buscaAnestesia) ||
        anestesia.categoria.toLowerCase().includes(buscaAnestesia.toLowerCase())
      )
      setAnestesiasFiltradas(filtradas)
    }
  }, [buscaAnestesia])

  // Fechar lista quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.anestesia-dropdown')) {
        setMostrarListaAnestesia(false)
      }
    }

    if (mostrarListaAnestesia) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mostrarListaAnestesia])

  // Selecionar anestesia
  const selecionarAnestesia = (anestesia: { nome: string; codigo: string; categoria: string }) => {
    setAnestesiaSelecionada(anestesia)
    setBuscaAnestesia(anestesia.nome)
    setMostrarListaAnestesia(false)
    
    // Adicionar ao formData se não estiver já selecionada
    if (!formData.tipoAnestesia.includes(anestesia.nome)) {
      setFormData(prev => ({
        ...prev,
        tipoAnestesia: [...prev.tipoAnestesia, anestesia.nome]
      }))
    }
  }

  // Remover anestesia selecionada
  const removerAnestesia = () => {
    if (anestesiaSelecionada) {
      setFormData(prev => ({
        ...prev,
        tipoAnestesia: prev.tipoAnestesia.filter(t => t !== anestesiaSelecionada.nome)
      }))
    }
    setAnestesiaSelecionada(null)
    setBuscaAnestesia('')
    setMostrarListaAnestesia(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()
    
    if (!user?.id) {
      showFeedback('error', '❌ Erro de autenticação: Usuário não está logado. Faça login novamente.')
      return
    }

    // Só salvar o procedimento se estivermos na etapa final (Upload)
    if (currentSection !== 3) {
      showFeedback('error', '⚠️ Complete todas as etapas antes de finalizar.')
      return
    }

    // Validações básicas com mensagens específicas
    if (!formData.nomePaciente || !formData.dataNascimento || !formData.dataCirurgia || 
        !formData.horaInicio || !formData.tipoAnestesia.length) {
      showFeedback('error', '⚠️ Campos obrigatórios não preenchidos. Verifique se todos os campos marcados com * estão preenchidos.')
      return
    }


    if (!validateBirthDate(formData.dataNascimento)) {
      showFeedback('error', '⚠️ Data de nascimento inválida: A data não pode ser futura.')
      return
    }

    // Validar hora de término apenas se estiver preenchida
    if (formData.horaTermino && !validateEndTime(formData.horaInicio, formData.horaTermino)) {
      showFeedback('error', '⚠️ Horário inválido: A hora de término deve ser maior que a hora de início.')
      return
    }

    setLoading(true)
    showFeedback('info', '⏳ Salvando procedimento...')
    
    try {
      const procedureData = {
        // Campos obrigatórios
        procedure_name: formData.tipoProcedimento,
        procedure_type: formData.tipoAnestesia.join(', '),
        procedure_date: formData.dataCirurgia,
        procedure_value: parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        
        // Campos do paciente
        patient_name: formData.nomePaciente,
        patient_age: parseInt(calculateAge(formData.dataNascimento)),
        data_nascimento: formData.dataNascimento,
        convenio: formData.convenio,
        carteirinha: formData.carteirinha,
        
        // Campos do procedimento
        data_cirurgia: formData.dataCirurgia,
        hora_inicio: formData.horaInicio,
        hora_termino: formData.horaTermino,
        tipo_anestesia: formData.tipoAnestesia.join(', '),
        duracao_minutos: parseInt(formData.duracao) || 0,
        
        // Campos da equipe
        anesthesiologist_name: user.name,
        nome_cirurgiao: formData.nomeCirurgiao,
        especialidade_cirurgiao: formData.especialidadeCirurgiao,
        hospital_clinic: formData.hospital,
        
        // Campos financeiros
        payment_status: STATUS_PAGAMENTO_MAP[formData.statusPagamento] || 'pending',
        payment_date: formData.statusPagamento === 'Pago' && formData.dataPagamento ? formData.dataPagamento : null,
        forma_pagamento: formData.formaPagamento,
        numero_parcelas: formData.numero_parcelas ? parseInt(formData.numero_parcelas) : null,
        parcelas_recebidas: formData.parcelas ? formData.parcelas.filter(p => p.recebida).length : 0,
        observacoes_financeiras: formData.observacoes,
        secretaria_id: formData.secretariaId || null,
        user_id: user.id
      }

      console.log('Dados do procedimento para salvar:', procedureData)
      const result = await procedureService.createProcedure(procedureData)
      console.log('Resultado do salvamento:', result)
      if (result) {
        // Salvar parcelas individuais se existirem
        if (formData.parcelas && formData.parcelas.length > 0) {
          console.log('Salvando parcelas:', formData.parcelas)
          const parcelasData = formData.parcelas.map(parcela => ({
            procedure_id: result.id,
            numero_parcela: parcela.numero,
            valor_parcela: parcela.valor,
            recebida: parcela.recebida,
            data_recebimento: parcela.data_recebimento || null
          }))
          console.log('Dados das parcelas para salvar:', parcelasData)
          
          // Salvar parcelas no banco de dados
          const parcelasResult = await procedureService.createParcelas(parcelasData)
          console.log('Resultado do salvamento das parcelas:', parcelasResult)
        } else {
          console.log('Nenhuma parcela para salvar')
        }

        // Salvar anexos se existirem
        if (formData.fichas && formData.fichas.length > 0) {
          console.log('Salvando anexos:', formData.fichas)
          
          // Para cada arquivo, fazer upload para o Supabase Storage
          for (const file of formData.fichas) {
            try {
              // Gerar nome único para o arquivo
              const fileExt = file.name.split('.').pop()
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
              const filePath = `${user.id}/${result.id}/${fileName}`
              
              // Fazer upload do arquivo para o Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('procedure-attachments')
                .upload(filePath, file)
              
              if (uploadError) {
                console.error('Erro ao fazer upload do arquivo:', uploadError)
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
                file_type: file.type,
                file_url: urlData.publicUrl
              }
              
              const attachmentResult = await procedureService.createAttachment(attachmentData)
              console.log('Resultado do salvamento do anexo:', attachmentResult)
            } catch (error) {
              console.error('Erro ao processar anexo:', error)
            }
          }
        } else {
          console.log('Nenhum anexo para salvar')
        }
        
        showFeedback('success', `✅ Procedimento criado com sucesso! 
        
📋 Detalhes:
• Paciente: ${formData.nomePaciente}
• Procedimento: ${formData.tipoProcedimento}
• Data: ${formData.dataCirurgia}
• Valor: R$ ${formData.valor}
• Parcelas: ${formData.parcelas && formData.parcelas.length > 0 ? `${formData.parcelas.filter(p => p.recebida).length}/${formData.parcelas.length} recebidas` : 'Não parcelado'}

Redirecionando para a lista de procedimentos...`)
        
        setTimeout(() => {
          router.push('/procedimentos')
        }, 3000)
      } else {
        showFeedback('error', '❌ Falha ao salvar: Não foi possível criar o procedimento. Verifique sua conexão e tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao criar procedimento:', error)
      
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                    label="Nome do Paciente *"
                placeholder="Nome completo do paciente"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                    label="Convênio / Particular"
                    placeholder="Ex: Unimed, Particular"
                    icon={<CreditCard className="w-5 h-5" />}
                    value={formData.convenio}
                    onChange={(e) => updateFormData('convenio', e.target.value)}
              />
              <Input
                    label="Nº da Carteirinha"
                    placeholder="Número da carteirinha do convênio"
                    value={formData.carteirinha}
                    onChange={(e) => updateFormData('carteirinha', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                    label="Tipo de Procedimento Cirúrgico *"
                    placeholder="Ex: Cirurgia de Apendicite"
                    icon={<FileText className="w-5 h-5" />}
                    value={formData.tipoProcedimento}
                    onChange={(e) => updateFormData('tipoProcedimento', e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Especialidade do Cirurgião
                    </label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      value={formData.especialidadeCirurgiao}
                      onChange={(e) => updateFormData('especialidadeCirurgiao', e.target.value)}
                    >
                      <option value="">Selecione a especialidade</option>
                      {ESPECIALIDADES.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input
                    label="Data da Cirurgia *"
                type="date"
                icon={<Calendar className="w-5 h-5" />}
                    value={formData.dataCirurgia}
                    onChange={(e) => updateFormData('dataCirurgia', e.target.value)}
                    required
                  />
                  <Input
                    label="Hora de Início da Anestesia *"
                    type="time"
                    icon={<Clock className="w-5 h-5" />}
                    value={formData.horaInicio}
                    onChange={(e) => updateFormData('horaInicio', e.target.value)}
                required
              />
              <Input
                    label="Hora de Término da Anestesia"
                type="time"
                icon={<Clock className="w-5 h-5" />}
                    value={formData.horaTermino}
                    onChange={(e) => updateFormData('horaTermino', e.target.value)}
              />
            </div>

                {/* Campo de Anestesia com Busca e Código TSSU */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo de Anestesia Utilizada * (com código TSSU)
                  </label>
                  
                  {/* Campo de busca */}
                  <div className="relative anestesia-dropdown">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                        type="text"
                        placeholder="Buscar por nome, código TSSU ou categoria..."
                        value={buscaAnestesia}
                        onChange={(e) => {
                          setBuscaAnestesia(e.target.value)
                          setMostrarListaAnestesia(true)
                        }}
                        onFocus={() => setMostrarListaAnestesia(true)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      {anestesiaSelecionada && (
                        <button
                          type="button"
                          onClick={removerAnestesia}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Lista de anestesias filtradas */}
                    {mostrarListaAnestesia && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        {anestesiasFiltradas.length > 0 ? (
                          <div className="py-2">
                            {anestesiasFiltradas.map((anestesia, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => selecionarAnestesia(anestesia)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 text-sm">
                                      {anestesia.nome}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {anestesia.categoria}
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                      TSSU: {anestesia.codigo}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-sm">
                            Nenhuma anestesia encontrada para "{buscaAnestesia}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Anestesia selecionada */}
                  {anestesiaSelecionada && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-teal-600" />
                            <div>
                              <div className="font-medium text-teal-900">
                                {anestesiaSelecionada.nome}
                              </div>
                              <div className="text-sm text-teal-700">
                                {anestesiaSelecionada.categoria}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                            TSSU: {anestesiaSelecionada.codigo}
                          </span>
                          <button
                            type="button"
                            onClick={removerAnestesia}
                            className="text-teal-600 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de anestesias selecionadas (compatibilidade) */}
                  {formData.tipoAnestesia.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Anestesias Selecionadas:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {formData.tipoAnestesia.map((tipo, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                          >
                            {tipo}
                            <button
                              type="button"
                              onClick={() => handleTipoAnestesia(tipo)}
                              className="ml-2 text-blue-600 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                    ))}
                  </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duração Total (calculada automaticamente)
                  </label>
                  <div className="text-lg font-semibold text-gray-900">
                    {formData.duracao || 'Preencha as horas de início e término'}
                  </div>
                </div>
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
                {/* Status do Pagamento - Primeiro item */}
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
                    Secretaria Responsável
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    value={formData.secretariaId}
                    onChange={(e) => updateFormData('secretariaId', e.target.value)}
                  >
                    <option value="">Nenhuma secretaria</option>
                    {secretaria && (
                      <option value={secretaria.id}>{secretaria.nome}</option>
                    )}
                  </select>
                  {secretaria && (
                    <p className="text-sm text-gray-600 mt-1">
                      Secretaria vinculada: {secretaria.nome} ({secretaria.email})
                    </p>
                  )}
                </div>

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
                          {previewFiles[index] && (
                            <div className="mt-2">
                              <img
                                src={previewFiles[index]}
                                alt="Preview"
                                className="w-full h-20 object-cover rounded"
              />
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
    </Layout>
  )
}
