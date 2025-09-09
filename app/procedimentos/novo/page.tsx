'use client'

import { useState, useEffect, useRef } from 'react'
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
  Camera,
  Eye,
  X,
  CheckCircle,
  Building,
  CreditCard,
  Stethoscope,
  UserCheck,
  MapPin,
  FileImage
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
import Tesseract from 'tesseract.js'

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
  statusPagamento: string
  observacoes: string
  
  // 4. Upload de Fichas
  fichas: File[]
  
  // 5. OCR
  etiquetaOCR: string
}

const TIPOS_ANESTESIA = [
  'Anestesia Geral',
  'Anestesia Regional',
  'Anestesia Local',
  'Sedação',
  'Bloqueio Periférico',
  'Raquianestesia',
  'Peridural'
]

const FORMAS_PAGAMENTO = [
  'Convênio',
  'Particular',
  'Hospital',
  'Outro'
]

const STATUS_PAGAMENTO = [
  'Pendente',
  'Pago',
  'Faturado',
  'Recebido'
]

// Mapeamento dos valores em português para os valores do banco de dados
const STATUS_PAGAMENTO_MAP: Record<string, string> = {
  'Pendente': 'pending',
  'Pago': 'paid',
  'Faturado': 'paid', // Faturado é considerado como pago
  'Recebido': 'paid'  // Recebido é considerado como pago
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
    formaPagamento: '',
    statusPagamento: 'Pendente',
    observacoes: '',
    fichas: [],
    etiquetaOCR: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info' | null>(null)
  const [currentSection, setCurrentSection] = useState(0) // Começar com OCR (seção 0)

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
  const [previewFiles, setPreviewFiles] = useState<string[]>([])
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrText, setOcrText] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const router = useRouter()

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

  // OCR Simulation (placeholder)
  const handleOCR = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      showFeedback('error', '⚠️ Tipo de arquivo inválido: Selecione apenas arquivos de imagem (JPG, PNG, etc.)')
      return
    }

    // Verificar tamanho do arquivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      showFeedback('error', '⚠️ Arquivo muito grande: Tamanho máximo permitido é 10MB')
      return
    }

    // Criar preview da imagem
    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setOcrLoading(true)
    setOcrProgress(0)
    clearFeedback()

    try {
      const { data: { text } } = await Tesseract.recognize(
        file,
        'por', // Português
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100))
            }
          }
        }
      )

      setOcrText(text)
      
      // Extrair dados do texto usando regex
      const extractedData = extractDataFromText(text)
      
      setFormData(prev => ({
        ...prev,
        ...extractedData
      }))
      
      showFeedback('success', '✅ Dados extraídos da etiqueta com sucesso! Revise e edite se necessário.')
    } catch (error) {
      console.error('Erro no OCR:', error)
      showFeedback('error', '❌ Erro ao processar a imagem. Tente novamente com uma imagem mais clara.')
    } finally {
      setOcrLoading(false)
      setOcrProgress(0)
    }
  }

  const extractDataFromText = (text: string) => {
    const extracted: Partial<FormData> = {}
    
    // Log do texto bruto para debug
    console.log("OCR Bruto:", text)
    
    // Limpar e normalizar o texto
    const cleanText = text.replace(/\s+/g, ' ').trim()
    
    // Extrair dados com regex mais robustos e inteligentes
    const dados = {
      // Nome - procurar por padrões de nome (maiúsculas, palavras separadas)
      nome: text.match(/Nome\s*:?\s*([^\n\r]+)/i)?.[1]?.trim() || 
            text.match(/([A-Z][A-Z\s]+[A-Z])(?:\s|$)/)?.[1]?.trim() || 
            text.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1]?.trim() || "",
      
      // Data de nascimento - vários formatos
      nascimento: text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || 
                  text.match(/(\d{2}-\d{2}-\d{4})/)?.[1] || 
                  text.match(/(\d{2}\.\d{2}\.\d{4})/)?.[1] || "",
      
      // Convênio - procurar por padrões comuns
      convenio: text.match(/Conv[eê]nio\s*:?\s*([^\n\r]+)/i)?.[1]?.trim() || 
                text.match(/([A-Z][A-Z\s]+(?:SAUDE|PLANO|MEDICO|HOSPITAL))/i)?.[1]?.trim() || 
                text.match(/([A-Z][A-Z\s]+(?:FESP|UNIMED|BRADESCO|SULAMERICA))/i)?.[1]?.trim() || "",
      
      // Plano
      plano: text.match(/Plano\s*:?\s*([^\n\r]+)/i)?.[1]?.trim() || "",
      
      // Hospital/Clínica
      hospital: text.match(/Hospital\s*:?\s*([^\n\r]+)/i)?.[1]?.trim() || 
                text.match(/Cl[ií]nica\s*:?\s*([^\n\r]+)/i)?.[1]?.trim() || 
                text.match(/([A-Z][A-Z\s]+(?:HOSPITAL|CLINICA|CENTRO))/i)?.[1]?.trim() || "",
      
      // Procedimento
      procedimento: text.match(/Procedimento\s*:?\s*([^\n\r]+)/i)?.[1]?.trim() || 
                    text.match(/([A-Z][A-Z\s]+(?:CIRURGIA|PROCEDIMENTO))/i)?.[1]?.trim() || "",
      
      // Especialidade
      especialidade: text.match(/Especialidade\s*:?\s*([^\n\r]+)/i)?.[1]?.trim() || "",
      
      // Cirurgião
      cirurgiao: text.match(/Cirurgi[aã]o\s*:?\s*([^\n\r]+)/i)?.[1]?.trim() || 
                 text.match(/Dr\.?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/)?.[1]?.trim() || "",
      
      // Carteirinha
      carteirinha: text.match(/Carteirinha\s*:?\s*(\d+)/i)?.[1] || 
                   text.match(/(\d{6,})/)?.[1] || "",
      
      // Outros campos
      leito: text.match(/Leito\s*:?\s*(\d+)/i)?.[1] || "",
      atendimento: text.match(/Atend\.?\s*:?\s*(\d+)/i)?.[1] || "",
      prontuario: text.match(/Pront\.?\s*:?\s*(\d+)/i)?.[1] || "",
      situacao: text.match(/Situa[cç][aã]o\s*:?\s*([^\n\r]+)/i)?.[1]?.trim() || "",
      entrada: text.match(/(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/)?.[1] || "",
      codBarras: text.match(/\d{17,}/)?.[0] || ""
    }
    
    // Mapear para os campos do formulário
    if (dados.nome) extracted.nomePaciente = dados.nome
    if (dados.nascimento) extracted.dataNascimento = dados.nascimento
    if (dados.convenio) extracted.convenio = dados.convenio
    if (dados.plano && dados.convenio) {
      extracted.convenio = `${dados.convenio} - ${dados.plano}`
    } else if (dados.plano) {
      extracted.convenio = dados.plano
    }
    if (dados.carteirinha) extracted.carteirinha = dados.carteirinha
    if (dados.hospital) extracted.hospital = dados.hospital
    if (dados.procedimento) extracted.tipoProcedimento = dados.procedimento
    if (dados.especialidade) extracted.especialidadeCirurgiao = dados.especialidade
    if (dados.cirurgiao) extracted.nomeCirurgiao = dados.cirurgiao
    
    // Log dos dados extraídos para debug
    console.log("Dados extraídos:", dados)
    console.log("Mapeamento para formulário:", extracted)
    
    return extracted
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()
    
    if (!user?.id) {
      showFeedback('error', '❌ Erro de autenticação: Usuário não está logado. Faça login novamente.')
      return
    }

    // Validações básicas com mensagens específicas
    if (!formData.nomePaciente || !formData.dataNascimento || !formData.dataCirurgia || 
        !formData.horaInicio || !formData.horaTermino || !formData.tipoAnestesia.length) {
      showFeedback('error', '⚠️ Campos obrigatórios não preenchidos. Verifique se todos os campos marcados com * estão preenchidos.')
      return
    }

    if (!validateBirthDate(formData.dataNascimento)) {
      showFeedback('error', '⚠️ Data de nascimento inválida: A data não pode ser futura.')
      return
    }

    if (!validateEndTime(formData.horaInicio, formData.horaTermino)) {
      showFeedback('error', '⚠️ Horário inválido: A hora de término deve ser maior que a hora de início.')
      return
    }

    setLoading(true)
    showFeedback('info', '⏳ Salvando procedimento...')
    
    try {
      const procedureData = {
        procedure_name: formData.tipoProcedimento,
        procedure_type: formData.tipoAnestesia.join(', '),
        patient_name: formData.nomePaciente,
        patient_age: parseInt(calculateAge(formData.dataNascimento)),
        patient_gender: null, // Seria adicionado em uma versão futura
        procedure_date: formData.dataCirurgia,
        procedure_time: formData.horaInicio,
        duration_minutes: parseInt(formData.duracao) || 0,
        anesthesiologist_name: user.name,
        surgeon_name: formData.nomeCirurgiao,
        hospital_clinic: formData.hospital,
        room_number: null,
        procedure_value: parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        payment_status: STATUS_PAGAMENTO_MAP[formData.statusPagamento] || 'pending',
        payment_date: null,
        payment_method: formData.formaPagamento,
        notes: formData.observacoes
      }

      const result = await procedureService.createProcedure(procedureData)
      if (result) {
        showFeedback('success', `✅ Procedimento criado com sucesso! 
        
📋 Detalhes:
• Paciente: ${formData.nomePaciente}
• Procedimento: ${formData.tipoProcedimento}
• Data: ${formData.dataCirurgia}
• Valor: R$ ${formData.valor}

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
    { id: 0, title: 'OCR da Etiqueta Hospitalar', icon: Camera },
    { id: 1, title: 'Identificação do Procedimento', icon: User },
    { id: 2, title: 'Dados do Procedimento', icon: Stethoscope },
    { id: 3, title: 'Dados Administrativos', icon: DollarSign },
    { id: 4, title: 'Upload de Fichas', icon: Upload }
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
        <form onSubmit={handleSubmit}>
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

          {/* Section 1: Identificação do Procedimento */}
          {currentSection === 1 && (
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
                    onChange={(e) => setFormData({ ...formData, nomePaciente: e.target.value })}
                required
              />
              <Input
                    label="Data de Nascimento *"
                    type="date"
                    icon={<Calendar className="w-5 h-5" />}
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                    label="Convênio / Particular"
                    placeholder="Ex: Unimed, Particular"
                    icon={<CreditCard className="w-5 h-5" />}
                    value={formData.convenio}
                    onChange={(e) => setFormData({ ...formData, convenio: e.target.value })}
              />
              <Input
                    label="Nº da Carteirinha"
                    placeholder="Número da carteirinha do convênio"
                    value={formData.carteirinha}
                    onChange={(e) => setFormData({ ...formData, carteirinha: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                    label="Tipo de Procedimento Cirúrgico *"
                    placeholder="Ex: Cirurgia de Apendicite"
                    icon={<FileText className="w-5 h-5" />}
                    value={formData.tipoProcedimento}
                    onChange={(e) => setFormData({ ...formData, tipoProcedimento: e.target.value })}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Especialidade do Cirurgião
                    </label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      value={formData.especialidadeCirurgiao}
                      onChange={(e) => setFormData({ ...formData, especialidadeCirurgiao: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, nomeCirurgiao: e.target.value })}
                  />
                  <Input
                    label="Hospital / Clínica"
                    placeholder="Nome do hospital ou clínica"
                    icon={<Building className="w-5 h-5" />}
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Section 2: Dados do Procedimento */}
          {currentSection === 2 && (
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
                    onChange={(e) => setFormData({ ...formData, dataCirurgia: e.target.value })}
                    required
                  />
                  <Input
                    label="Hora de Início da Anestesia *"
                    type="time"
                    icon={<Clock className="w-5 h-5" />}
                    value={formData.horaInicio}
                    onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                required
              />
              <Input
                    label="Hora de Término da Anestesia *"
                type="time"
                icon={<Clock className="w-5 h-5" />}
                    value={formData.horaTermino}
                    onChange={(e) => setFormData({ ...formData, horaTermino: e.target.value })}
                required
              />
            </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Anestesia * (selecione uma ou mais)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {TIPOS_ANESTESIA.map(tipo => (
                      <label key={tipo} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.tipoAnestesia.includes(tipo)}
                          onChange={() => handleTipoAnestesia(tipo)}
                          className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{tipo}</span>
                      </label>
                    ))}
                  </div>
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

          {/* Section 3: Dados Administrativos */}
          {currentSection === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Dados Administrativos
                </CardTitle>
              </CardHeader>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Valor do Procedimento Anestésico"
                    placeholder="R$ 0,00"
                    icon={<DollarSign className="w-5 h-5" />}
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Forma de Pagamento
                    </label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      value={formData.formaPagamento}
                      onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value })}
                    >
                      <option value="">Selecione a forma de pagamento</option>
                      {FORMAS_PAGAMENTO.map(forma => (
                        <option key={forma} value={forma}>{forma}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status do Pagamento
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.statusPagamento}
                    onChange={(e) => setFormData({ ...formData, statusPagamento: e.target.value })}
                  >
                    {STATUS_PAGAMENTO.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
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
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Section 4: Upload de Fichas */}
          {currentSection === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload de Ficha Anestésica
                </CardTitle>
              </CardHeader>
              <div className="p-6 space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload de Fichas Anestésicas
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Faça upload de até 10 arquivos (PDF, JPG, PNG)
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

          {/* Section 0: OCR da Etiqueta */}
          {currentSection === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  OCR da Etiqueta Hospitalar
                </CardTitle>
              </CardHeader>
              <div className="p-6 space-y-6">
                {/* Header Section */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Reconhecimento Inteligente de Etiquetas
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    <strong>Comece aqui!</strong> Tire uma foto da etiqueta hospitalar para preenchimento automático de todos os campos do formulário.
                  </p>
                  
                  {/* Professional Alert */}
                  <Alert className="mb-6 max-w-2xl mx-auto">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Preenchimento Automático Inteligente</AlertTitle>
                    <AlertDescription>
                      Nome, data de nascimento, convênio, procedimento e hospital serão extraídos e preenchidos automaticamente usando tecnologia OCR avançada.
                    </AlertDescription>
                  </Alert>
                  
                  {/* Action Buttons Section */}
                  <div className="space-y-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {/* Professional Action Buttons */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                        {/* Capturar foto */}
                        <Button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.setAttribute('capture', 'environment')
                              fileInputRef.current.click()
                            }
                          }}
                          className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white py-6 px-8 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 border-0"
                          disabled={ocrLoading}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Camera className="w-7 h-7" />
                            <span className="text-base font-semibold">
                              Capturar Foto
                            </span>
                            <span className="text-xs opacity-90">
                              Use a câmera do dispositivo
                            </span>
                          </div>
                        </Button>
                        
                        {/* Upload de imagem */}
                        <Button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.removeAttribute('capture')
                              fileInputRef.current.click()
                            }
                          }}
                          className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white py-6 px-8 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 border-0"
                          disabled={ocrLoading}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Upload className="w-7 h-7" />
                            <span className="text-base font-semibold">
                              Upload Imagem
                            </span>
                            <span className="text-xs opacity-90">
                              Selecione do dispositivo
                            </span>
                          </div>
                        </Button>
                      </div>
                      
                      {/* Professional Progress Bar */}
                      {ocrLoading && (
                        <div className="w-full max-w-md space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">Processando imagem...</span>
                            <Badge variant="secondary" className="bg-teal-100 text-teal-800">
                              {ocrProgress}%
                            </Badge>
                          </div>
                          <Progress value={ocrProgress} className="h-3" />
                          <p className="text-xs text-gray-500 text-center">
                            Analisando texto da etiqueta hospitalar
                          </p>
                        </div>
                      )}
                      
                      {/* Professional Image Preview */}
                      {selectedImage && (
                        <div className="w-full max-w-md">
                          <Card className="overflow-hidden">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center">
                                  <FileImage className="w-4 h-4 mr-2" />
                                  Imagem Selecionada
                                </CardTitle>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedImage(null)
                                    setOcrText('')
                                    clearFeedback()
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = ''
                                    }
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <div className="px-6 pb-6">
                              <div className="relative">
                                <img 
                                  src={selectedImage} 
                                  alt="Preview da etiqueta" 
                                  className="w-full h-48 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-lg"></div>
                              </div>
                            </div>
                          </Card>
                        </div>
                      )}
                      
                      {/* Professional Extracted Data Preview */}
                      {ocrText && (
                        <div className="w-full max-w-2xl">
                          <Card>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center">
                                  <CheckCircle className="w-5 h-5 mr-2 text-teal-600" />
                                  Dados Extraídos com Sucesso
                                </CardTitle>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setOcrText('')}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <div className="px-6 pb-6">
                              {/* Professional Data Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {/* Nome do Paciente */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Nome do Paciente</label>
                                  <div className="flex items-center space-x-2">
                                    {formData.nomePaciente ? (
                                      <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {formData.nomePaciente}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Não extraído
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Data de Nascimento */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Data de Nascimento</label>
                                  <div className="flex items-center space-x-2">
                                    {formData.dataNascimento ? (
                                      <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {formData.dataNascimento}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Não extraído
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Convênio */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Convênio</label>
                                  <div className="flex items-center space-x-2">
                                    {formData.convenio ? (
                                      <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {formData.convenio}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Não extraído
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Procedimento */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Procedimento</label>
                                  <div className="flex items-center space-x-2">
                                    {formData.tipoProcedimento ? (
                                      <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {formData.tipoProcedimento}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Não extraído
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Hospital */}
                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-sm font-medium text-gray-700">Hospital</label>
                                  <div className="flex items-center space-x-2">
                                    {formData.hospital ? (
                                      <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {formData.hospital}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Não extraído
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Professional Raw Text Section */}
                              <details className="mt-4">
                                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Ver texto extraído completo
                                  </div>
                                  <span className="text-xs text-gray-500">▼</span>
                                </summary>
                                <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                  <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono leading-relaxed">
                                    {ocrText}
                                  </pre>
                                </div>
                              </details>
                              
                              {/* Professional Info Alert */}
                              <Alert className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Informação Importante</AlertTitle>
                                <AlertDescription>
                                  Este texto foi extraído automaticamente da imagem usando tecnologia OCR. 
                                  Os dados acima foram processados e podem ser editados nas próximas seções se necessário.
                                </AlertDescription>
                              </Alert>
                            </div>
                          </Card>
                        </div>
                      )}
                      
                      {/* Professional Format Info */}
                      <div className="text-center max-w-md mx-auto">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Formatos Suportados</AlertTitle>
                          <AlertDescription>
                            <div className="space-y-1">
                              <p>📱 <strong>Captura:</strong> Use a câmera do dispositivo</p>
                              <p>📁 <strong>Upload:</strong> JPG, PNG, GIF (máx. 10MB)</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Summary Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Resumo dos Dados Extraídos
                    </CardTitle>
                  </CardHeader>
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nome do Paciente</label>
                        <div className="flex items-center space-x-2">
                          {formData.nomePaciente ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {formData.nomePaciente}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Não extraído
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Data de Nascimento</label>
                        <div className="flex items-center space-x-2">
                          {formData.dataNascimento ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {formData.dataNascimento}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Não extraído
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Convênio</label>
                        <div className="flex items-center space-x-2">
                          {formData.convenio ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {formData.convenio}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Não extraído
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Procedimento</label>
                        <div className="flex items-center space-x-2">
                          {formData.tipoProcedimento ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {formData.tipoProcedimento}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Não extraído
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Hospital</label>
                        <div className="flex items-center space-x-2">
                          {formData.hospital ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {formData.hospital}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Não extraído
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {formData.nomePaciente && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Extração Concluída com Sucesso!</AlertTitle>
                        <AlertDescription className="text-green-700">
                          Os dados foram extraídos e preenchidos automaticamente. 
                          Continue para as próximas seções para completar o procedimento.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </Card>

              </div>
            </Card>
          )}

          {/* Navigation - Mobile Optimized */}
          <div className="mt-8">
            {/* Mobile: Stacked buttons */}
            <div className="block md:hidden space-y-3">
              {currentSection < 4 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentSection(Math.min(4, currentSection + 1))}
                  className="w-full py-4 text-lg font-medium"
                >
                  Próximo
                  <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
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

              {currentSection < 4 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentSection(Math.min(4, currentSection + 1))}
                >
                  Próximo
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
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