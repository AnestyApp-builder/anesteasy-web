'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Users,
  Info,
  Eye,
  Check
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
import { useToast } from '@/contexts/ToastContext'
import { getFullErrorMessage } from '@/lib/error-messages'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { uploadToSupabaseStorage, getPublicUrl } from '@/lib/supabase-upload'
import { getCorrectMimeType } from '@/lib/mime-utils'
import { compressImage } from '@/lib/image-compression'
import { parseFicha } from '@/utils/parseFicha'
import { validarArquivos, LIMITES_UPLOAD, formatarTamanhoArquivo } from '@/lib/validation-utils'
import { ConvenioCombobox } from '@/components/ui/ConvenioCombobox'
import { normalizarConvenio } from '@/lib/convenios'
import dynamic from 'next/dynamic'

// Lazy load componentes pesados - só carregam quando necessário
// Corrigir imports para evitar erro React #306
const UploadFicha = dynamic(() => import('@/components/UploadFicha'), { 
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-400">Carregando...</div>
})
const OCRResultDisplay = dynamic(() => import('@/components/OCRResultDisplay'), { 
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-400">Carregando...</div>
})
// VoiceRecorder e VoiceExtractionDisplay são named exports, não default

interface FormData {
  // 1. Identificação do Procedimento
  nomePaciente: string
  dataNascimento: string
  dataProcedimento: string
  convenio: string
  carteirinha: string
  tipoProcedimento: string
  tecnicaAnestesica: string
  codigoTSSU: string
  grupoAnestesico: string
  especialidadeCirurgiao: string
  nomeCirurgiao: string
  nomeEquipe: string
  hospital: string
  patientGender: 'M' | 'F' | 'Other' | ''
  horario: string
  duracaoHoras: string
  
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
  tipoCesariana: 'Nova Ráqui' | 'Geral' | 'Complementação pelo Cateter' | 'Raquianestesia' | ''
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
  dataPagamento: string
  observacoes: string
  
  // 4. Upload de Fichas
  fichas: File[]
  
  // 5. OCR
  show_to_secretary: boolean
  
  // 6. Grupo
  group_id: string
  anesthesiologist_user_id?: string
  billing_entity_type?: 'cnpj_anestesista' | 'cnpj_grupo' | ''
  anesthesiologist_role?: 'principal' | 'auxiliar' | ''
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

// Lista de tipos de procedimento disponíveis
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

// Lista de tipos de anestesia com códigos TSSU
const TIPOS_ANESTESIA = [
  { codigo: '30701010', nome: 'Anestesia geral' },
  { codigo: '30701028', nome: 'Anestesia regional (raquianestesia)' },
  { codigo: '30701029', nome: 'Raquianestesia' }, // Código único para evitar duplicação
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
  const { addToast } = useToast()
  const [formData, setFormData] = useState<FormData>({
    nomePaciente: '',
    dataNascimento: '',
    dataProcedimento: '',
    convenio: '',
    carteirinha: '',
    tipoProcedimento: '',
    tecnicaAnestesica: '',
    codigoTSSU: '',
    grupoAnestesico: '',
    especialidadeCirurgiao: '',
    nomeCirurgiao: '',
    nomeEquipe: '',
    hospital: '',
    patientGender: '',
    horario: '',
    duracaoHoras: '',
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
    dataPagamento: '',
    observacoes: '',
    fichas: [],
    show_to_secretary: true,
    group_id: '',
    anesthesiologist_user_id: '',
    billing_entity_type: '',
    anesthesiologist_role: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [info, setInfo] = useState('')
  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info' | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [ocrRawText, setOcrRawText] = useState<string>('')
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>(undefined)
  const [ocrCamposPreenchidos, setOcrCamposPreenchidos] = useState<string[]>([])
  const [ocrCamposFaltando, setOcrCamposFaltando] = useState<string[]>([])
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
  const [showOcrInfo, setShowOcrInfo] = useState(false)
  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false)

  const searchParams = useSearchParams()
  const urlGroupId = searchParams.get('groupId')

  useEffect(() => {
    if (user) {
      import('@/lib/groups').then(m => m.getUserGroups().then(setGroups))
      if (urlGroupId) {
        setFormData(prev => ({
          ...prev,
          group_id: urlGroupId
        }))
      }
    }
  }, [user, urlGroupId])

  useEffect(() => {
    if (formData.group_id) {
      setLoadingGroupMembers(true)
      import('@/lib/groups').then(m => {
        m.getGroupDetails(formData.group_id)
          .then(details => {
            const activeMembers = (details.group_members || [])
              .filter((mem: any) => mem.status === 'active' && mem.users)
              .map((mem: any) => ({
                id: mem.users.id,
                name: mem.users.name || 'Sem Nome',
                crm: mem.users.crm || ''
              }))
            
            setGroupMembers(activeMembers)
            
            // Define o anestesista executor padrão se não houver um selecionado
            setFormData(prev => {
              const currentInMembers = activeMembers.find((mem: any) => mem.id === prev.anesthesiologist_user_id)
              const defaultExecutor = currentInMembers 
                ? prev.anesthesiologist_user_id 
                : (activeMembers.find((mem: any) => mem.id === user?.id)?.id || (activeMembers[0]?.id || ''))
              
              return {
                ...prev,
                anesthesiologist_user_id: defaultExecutor,
                billing_entity_type: prev.billing_entity_type || 'cnpj_anestesista'
              }
            })
          })
          .catch(err => {
            console.error('Erro ao carregar membros do grupo:', err)
          })
          .finally(() => {
            setLoadingGroupMembers(false)
          })
      })
    } else {
      setGroupMembers([])
      setFormData(prev => ({
        ...prev,
        anesthesiologist_user_id: '',
        billing_entity_type: ''
      }))
    }
  }, [formData.group_id, user])




  // Prevenir scroll do body quando modais estão abertos (importante no mobile)
  useEffect(() => {
    if (showSuccessModal) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [showSuccessModal])

  // Fechar tooltip de OCR ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showOcrInfo && !target.closest('.ocr-info-container')) {
        setShowOcrInfo(false)
      }
    }
    if (showOcrInfo) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showOcrInfo])


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
      setInfo('')
    } else if (type === 'success') {
      setSuccess(message)
      setError('')
      setInfo('')
    } else if (type === 'info') {
      setInfo(message)
      setError('')
      setSuccess('')
    }
  }

  const clearFeedback = () => {
    setError('')
    setSuccess('')
    setInfo('')
    setFeedbackType(null)
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    setSuccessData(null)
    if (urlGroupId) {
      router.push(`/grupos/${urlGroupId}`)
    } else {
      router.push('/procedimentos')
    }
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
  const [uploadProgress, setUploadProgress] = useState<{
    isUploading: boolean
    currentFile: number
    totalFiles: number
    currentFileName: string
    progress: number
  }>({
    isUploading: false,
    currentFile: 0,
    totalFiles: 0,
    currentFileName: '',
    progress: 0
  })
  
  // Estado para rastrear progresso individual de cada arquivo
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<number, {
    fileName: string
    progress: number
    status: 'pending' | 'uploading' | 'success' | 'error'
    error?: string
  }>>({})
  
  // Armazenar dados dos uploads concluídos para associar ao procedimento depois
  const [uploadedAttachments, setUploadedAttachments] = useState<Array<{
    file_name: string
    file_size: number
    file_type: string
    file_url: string
    filePath: string
  }>>([])
  
  

  // Função helper para converter URI (file://) em Blob no mobile
  const convertUriToBlob = async (uri: string): Promise<Blob> => {
    try {
      const response = await fetch(uri)
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar arquivo: ${response.status} ${response.statusText}`)
      }
      
      const blob = await response.blob()
      
      if (blob.size === 0) {
        throw new Error('Blob está vazio (0 bytes) - arquivo pode não existir mais ou estar protegido')
      }
      
      return blob
    } catch (error: any) {
      console.error(`[UPLOAD] ❌ Erro ao converter URI para Blob:`, error)
      throw error
    }
  }

  // Função para fazer upload de um único arquivo - USA procedureId REAL (não temporário)
  // Retorna { success: boolean, attachment?: { file_name, file_size, file_type, file_url } }
  const uploadSingleFile = async (file: File | string, index: number, procedureId: string): Promise<{ success: boolean; attachment?: any }> => {
    if (!user?.id) {
      showFeedback('error', '❌ Erro: Usuário não autenticado')
      return { success: false }
    }
    
    if (!procedureId) {
      console.error('[UPLOAD] ❌ procedureId não fornecido')
      return { success: false }
    }
    
    // MOBILE FIX: Verificar se é URI (file://) e converter para Blob
    let fileToUpload: File | Blob
    let fileName: string
    let fileSize: number
    let fileType: string
    
    if (typeof file === 'string' && file.startsWith('file://')) {
      // É um URI do mobile - converter para Blob
      
      try {
        const blob = await convertUriToBlob(file)
        fileToUpload = blob
        
        // Extrair nome do arquivo do URI
        fileName = file.split('/').pop() || `image-${Date.now()}.jpg`
        fileSize = blob.size
        fileType = blob.type || 'image/jpeg'
        
      } catch (error: any) {
        console.error(`[UPLOAD] ❌ Falha ao converter URI:`, error)
        setFileUploadProgress(prev => ({
          ...prev,
          [index]: {
            ...prev[index],
            status: 'error',
            error: error.message
          }
        }))
        return { success: false }
      }
    } else if (file instanceof File) {
      // É um File - validar se é válido
      
      // MOBILE FIX: Verificar se o File é inválido (size: 0 ou type: undefined)
      if (file.size === 0 || !file.type || file.type === '') {
        
        try {
          // Ler como ArrayBuffer e recriar
          const arrayBuffer = await file.arrayBuffer()
          
          if (arrayBuffer.byteLength === 0) {
            throw new Error('Arquivo está vazio (0 bytes)')
          }
          
          // Inferir tipo MIME
          let inferredType = file.type
          if (!inferredType || inferredType === '') {
            const fileName = file.name.toLowerCase()
            if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
              inferredType = 'image/jpeg'
            } else if (fileName.endsWith('.png')) {
              inferredType = 'image/png'
            } else if (fileName.endsWith('.pdf')) {
              inferredType = 'application/pdf'
            } else {
              inferredType = 'application/octet-stream'
            }
          }
          
          // Criar novo File válido
          const fixedFile = new File([arrayBuffer], file.name, {
            type: inferredType,
            lastModified: file.lastModified || Date.now()
          })
          
          
          fileToUpload = fixedFile
          fileName = fixedFile.name
          fileSize = fixedFile.size
          fileType = fixedFile.type
        } catch (error: any) {
          console.error(`[UPLOAD] ❌ Erro ao corrigir File:`, error)
          setFileUploadProgress(prev => ({
            ...prev,
            [index]: {
              ...prev[index],
              status: 'error',
              error: `Arquivo inválido: ${error.message}`
            }
          }))
          return { success: false }
        }
      } else {
        // File já é válido
        fileToUpload = file
        fileName = file.name
        fileSize = file.size
        fileType = file.type
      }
    } else {
      console.error(`[UPLOAD] ❌ Tipo de arquivo inválido:`, typeof file)
      return { success: false }
    }
    
    // COMPRESSÃO: Comprimir imagens antes de enviar para o servidor (economiza banda e custo Vercel)
    if (fileToUpload instanceof File && fileToUpload.type.startsWith('image/')) {
      const TARGET_SIZE_MB = 1.5;
      if (fileToUpload.size > TARGET_SIZE_MB * 1024 * 1024) {
        try {
          const compressed = await compressImage(fileToUpload, {
            maxSizeMB: TARGET_SIZE_MB,
            maxWidth: 2500,
            maxHeight: 2500,
            quality: 0.85
          });
          fileToUpload = compressed;
          fileName = compressed.name;
          fileSize = compressed.size;
          fileType = compressed.type;
        } catch (compressError) {
          console.warn("[UPLOAD] Falha na compressão, enviando original", compressError);
        }
      }
    }
    
    
    // Atualizar status do arquivo para "uploading" com progresso inicial de 1%
    setFileUploadProgress(prev => {
      const newProgress: Record<number, {
        fileName: string
        progress: number
        status: 'pending' | 'uploading' | 'success' | 'error'
        error?: string
      }> = {
        ...prev,
        [index]: {
          fileName: fileName,
          status: 'uploading' as const,
          progress: 1 // Progresso inicial para mostrar que iniciou
        }
      }
      
      // Atualizar progresso geral
      const totalFiles = Object.keys(newProgress).length
      const completedFiles = Object.values(newProgress).filter(p => p?.status === 'success').length
      const inProgressFiles = Object.values(newProgress).filter(p => p?.status === 'uploading').length
      const progressPercent = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0
      
      setUploadProgress({
        isUploading: true,
        currentFile: completedFiles,
        totalFiles: totalFiles,
        currentFileName: fileName,
        progress: progressPercent
      })
      
      return newProgress
    })
    
    try {
      // Encurtar nome do arquivo se for muito longo (problema comum no mobile)
      const originalFileName = fileName
      const maxFileNameLength = 100 // Limite de caracteres para nome do arquivo
      let safeFileName = originalFileName
      
      if (originalFileName.length > maxFileNameLength) {
        const fileExt = originalFileName.split('.').pop() || 'bin'
        const nameWithoutExt = originalFileName.substring(0, originalFileName.lastIndexOf('.'))
        const truncatedName = nameWithoutExt.substring(0, maxFileNameLength - fileExt.length - 10) // -10 para margem
        safeFileName = `${truncatedName}...${Date.now().toString().slice(-6)}.${fileExt}`
      }
      
      
      // Gerar nome único para o arquivo (sempre curto)
      const fileExtension = safeFileName.split('.').pop() || 'bin'
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}` // Encurtado para 8 chars
      // Usar ID REAL do procedimento (não temporário)
      const filePath = `${user.id}/${procedureId}/${uniqueFileName}`
      
      // Obter tipo MIME - usar o tipo do blob se disponível, senão inferir do nome
      let correctMimeType = fileType
      if (!correctMimeType || correctMimeType === 'application/octet-stream') {
        correctMimeType = getCorrectMimeType(safeFileName)
      }
      
      
      // Timeout maior para arquivos grandes
      const fileSizeMB = fileSize / (1024 * 1024)
      const baseTimeout = Math.max(120000, fileSizeMB * 15000) // Mínimo 2min, +15s por MB
      const uploadTimeout = Math.min(baseTimeout, 300000) // Máximo 5 minutos
      
      
      // Fazer upload usando API route (usa service key automaticamente - mais confiável)
      
      // Progresso já foi atualizado para 1% acima, agora atualizar para 5% quando iniciar o upload
      setFileUploadProgress(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          progress: 5,
          status: 'uploading'
        }
      }))
      
      // MOBILE FIX: Converter Blob para File se necessário (para compatibilidade com FormData)
      let fileForUpload: File
      if (fileToUpload instanceof Blob && !(fileToUpload instanceof File)) {
        // Criar File a partir do Blob
        fileForUpload = new File([fileToUpload], safeFileName, { type: correctMimeType })
      } else {
        fileForUpload = fileToUpload as File
      }
      
      const result = await uploadToSupabaseStorage({
        bucket: 'procedure-attachments',
        path: filePath,
        file: fileForUpload,
        contentType: correctMimeType,
        // Não precisa de accessToken - API route usa service key
        timeout: uploadTimeout,
        onProgress: (progress) => {
          // Atualizar progresso real (5% a 90%)
          const progressPercent = Math.max(5, Math.min(90, progress.percent))
          
          setFileUploadProgress(prev => ({
            ...prev,
            [index]: {
              ...prev[index],
              progress: progressPercent
            }
          }))
          
          // Log apenas a cada 10% para não poluir
          if (progress.percent % 10 < 1 || progress.percent >= 90) {
            // Progress logging removed
          }
        }
      })
      
      
      if (!result.success || !result.data) {
        const errorMessage = result.error?.message || 'Erro desconhecido ao fazer upload'
        console.error(`[UPLOAD] ❌ Falha no upload:`, errorMessage)
        
        setFileUploadProgress(prev => ({
          ...prev,
          [index]: {
            ...prev[index],
            status: 'error',
            progress: 0,
            error: errorMessage
          }
        }))
        
        let userMessage = errorMessage
        if (errorMessage.includes('timeout') || errorMessage.includes('demorou mais')) {
          userMessage = `O arquivo "${safeFileName}" é muito grande ou sua conexão está lenta. Tente novamente ou use um arquivo menor.`
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          userMessage = 'Sessão expirada. Por favor, faça login novamente.'
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          userMessage = 'Sem permissão para fazer upload. Entre em contato com o suporte.'
        }
        
        showFeedback('error', `❌ Erro ao enviar ${safeFileName}: ${userMessage}`)
        return { success: false }
      }
      
      // Upload concluído com sucesso!
      
      setFileUploadProgress(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          progress: 95
        }
      }))
      
      // Obter URL pública (a API route já retorna, mas vamos garantir)
      
      const publicUrl = getPublicUrl('procedure-attachments', filePath)
      
      
      // Atualizar progresso para 100% e status para success
      setFileUploadProgress(prev => {
        const newProgress: Record<number, {
          fileName: string
          progress: number
          status: 'pending' | 'uploading' | 'success' | 'error'
          error?: string
        }> = {
          ...prev,
          [index]: {
            ...prev[index],
            status: 'success' as const,
            progress: 100
          }
        }
        
        // Atualizar progresso geral
        const totalFiles = Object.keys(newProgress).length
        const completedFiles = Object.values(newProgress).filter(p => p?.status === 'success').length
        const progressPercent = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0
        
        setUploadProgress({
          isUploading: completedFiles < totalFiles,
          currentFile: completedFiles,
          totalFiles: totalFiles,
          currentFileName: safeFileName,
          progress: progressPercent
        })
        
        // Se todos os uploads terminarem, desativar o estado de upload IMEDIATAMENTE
        if (completedFiles >= totalFiles) {
          console.log('[UPLOAD] ✅ Todos os uploads concluídos! Desativando estado de upload...')
          setUploadProgress({
            isUploading: false,
            currentFile: 0,
            totalFiles: 0,
            currentFileName: '',
            progress: 0
          })
        }
        
        return newProgress
      })
      
      // Armazenar dados do upload
      setUploadedAttachments(prev => {
        const newAttachments = [...prev, {
          file_name: safeFileName, // Usar nome seguro
          file_size: fileSize,
          file_type: correctMimeType,
          file_url: publicUrl,
          filePath: filePath
        }]
        return newAttachments
      })
      
      // Retornar sucesso com dados do attachment
      return {
        success: true,
        attachment: {
          file_name: safeFileName,
          file_size: fileSize,
          file_type: correctMimeType,
          file_url: publicUrl,
          filePath: filePath
        }
      }
    } catch (error: any) {
      console.error(`[UPLOAD] ❌ Erro inesperado ao fazer upload de ${fileName}:`, error)
      
      setFileUploadProgress(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          status: 'error',
          progress: 0,
          error: error?.message || 'Erro desconhecido'
        }
      }))
      
        const errorMessage = error?.message || 'Erro desconhecido ao fazer upload'
        const safeFileName = fileName.length > 100 ? fileName.substring(0, 100) + '...' : fileName
        showFeedback('error', `❌ Erro ao enviar ${safeFileName}: ${errorMessage}`)
      return { success: false }
    }
  }
  const router = useRouter()

  // Função para preencher todos os campos com dados de teste
  const preencherDadosTeste = () => {
    const hoje = new Date().toISOString().split('T')[0]
    const dataNascimento = new Date()
    dataNascimento.setFullYear(dataNascimento.getFullYear() - 35)
    
    setFormData({
      // 1. Identificação do Procedimento
      nomePaciente: 'Maria da Silva Teste',
      dataNascimento: dataNascimento.toISOString().split('T')[0],
      dataProcedimento: hoje,
      convenio: 'Unimed',
      carteirinha: '123456789',
      tipoProcedimento: 'Cesariana',
      tecnicaAnestesica: 'Raquianestesia',
      codigoTSSU: '30701029',
      grupoAnestesico: 'Geral',
      especialidadeCirurgiao: 'Ginecologia',
      nomeCirurgiao: 'Dr. João Santos',
      nomeEquipe: 'Equipe Cirúrgica A',
      hospital: 'Hospital Santa Maria',
      patientGender: 'F',
      horario: '14:30',
      duracaoHoras: '2',
      
      // 2. Dados do Procedimento (não-obstétrico)
      sangramento: 'Não',
      nauseaVomito: 'Não',
      dor: 'Não',
      observacoesProcedimento: 'Procedimento realizado sem intercorrências',
      
      // Campos para relatório do cirurgião
      enviarRelatorioCirurgiao: 'Sim',
      emailCirurgiao: 'cirurgiao@teste.com',
      telefoneCirurgiao: '11987654321',

      // Campos para procedimentos obstétricos
      acompanhamentoAntes: 'Sim',
      tipoParto: 'Cesariana',
      tipoCesariana: 'Raquianestesia',
      indicacaoCesariana: 'Sim',
      descricaoIndicacaoCesariana: 'Iteratividade (cesariana anterior)',
      retencaoPlacenta: 'Não',
      laceracaoPresente: 'Não',
      grauLaceracao: '',
      hemorragiaPuerperal: 'Não',
      transfusaoRealizada: 'Não',
      
      // 3. Dados Administrativos
      valor: '3500,00',
      formaPagamento: 'Parcelado',
      numero_parcelas: '3',
      parcelas_recebidas: '1',
      parcelas: [
        { numero: 1, valor: 1166.67, recebida: true, data_recebimento: hoje },
        { numero: 2, valor: 1166.67, recebida: false, data_recebimento: '' },
        { numero: 3, valor: 1166.66, recebida: false, data_recebimento: '' }
      ],
      statusPagamento: 'Pendente',
      dataPagamento: '',
      observacoes: 'Primeira parcela recebida',
      
      // 4. Upload de Fichas
      fichas: [],
    })

    setSuccess('✅ Formulário preenchido com dados de teste!')
    setFeedbackType('success')
    setTimeout(() => {
      setSuccess('')
      setFeedbackType(null)
    }, 3000)
  }



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
    if (!birthDate) return '0'
    
    // Converter data brasileira (DD/MM/YYYY) para ISO se necessário
    let isoDate = birthDate
    if (birthDate.includes('/')) {
      const [day, month, year] = birthDate.split('/')
      isoDate = `${year}-${month}-${day}`
    }
    
    try {
      const today = new Date()
      const birth = new Date(isoDate)
      
      // Validar se a data é válida
      if (isNaN(birth.getTime())) {
        return '0'
      }
      
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      
      // Garantir que idade não seja negativa
      return age < 0 ? '0' : age.toString()
    } catch (error) {
      return '0'
    }
  }

  // Função helper para corrigir arquivo inválido do mobile
  const fixInvalidMobileFile = async (file: File): Promise<File | null> => {
    
    // Se o arquivo já é válido, retornar como está
    if (file.size > 0 && file.type && file.type !== '') {
      return file
    }
    
    try {
      // Ler o arquivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      
      if (arrayBuffer.byteLength === 0) {
        console.error(`[FILE-FIX] ❌ ArrayBuffer está vazio (0 bytes)`)
        return null
      }
      
      // Inferir tipo MIME do nome do arquivo se não tiver
      let mimeType = file.type
      if (!mimeType || mimeType === '') {
        const fileName = file.name.toLowerCase()
        if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
          mimeType = 'image/jpeg'
        } else if (fileName.endsWith('.png')) {
          mimeType = 'image/png'
        } else if (fileName.endsWith('.pdf')) {
          mimeType = 'application/pdf'
        } else {
          mimeType = 'application/octet-stream'
        }
      }
      
      // Criar novo File válido a partir do ArrayBuffer
      const fixedFile = new File([arrayBuffer], file.name, {
        type: mimeType,
        lastModified: file.lastModified || Date.now()
      })
      
      
      return fixedFile
    } catch (error: any) {
      console.error(`[FILE-FIX] ❌ Erro ao corrigir arquivo:`, error)
      return null
    }
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (files.length === 0) {
      return
    }
    
    
    // MOBILE FIX: Validar e corrigir arquivos inválidos
    const validFiles: File[] = []
    
    for (const file of files) {
      
      // Validar tipos de arquivo permitidos
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      const isValidType = validTypes.includes(file.type) || 
                         file.name.toLowerCase().endsWith('.pdf') ||
                         file.name.toLowerCase().endsWith('.jpg') ||
                         file.name.toLowerCase().endsWith('.jpeg') ||
                         file.name.toLowerCase().endsWith('.png')
      
      if (!isValidType) {
        showFeedback('error', `⚠️ Arquivo "${file.name}" tem tipo não permitido. Use PDF, JPEG ou PNG.`)
        continue
      }
      
      // Verificar se o arquivo é inválido (problema comum no mobile)
      if (file.size === 0 || !file.type || file.type === '') {
        // Tentar corrigir o arquivo
        const fixedFile = await fixInvalidMobileFile(file)
        
        if (fixedFile && fixedFile.size > 0) {
          validFiles.push(fixedFile)
        } else {
          console.error(`[FILE-UPLOAD] ❌ Não foi possível corrigir o arquivo: ${file.name}`)
          showFeedback('error', `❌ Erro ao processar ${file.name}. Tente selecionar novamente.`)
          continue
        }
      } else {
        // Arquivo já é válido
        validFiles.push(file)
      }
    }
    
    if (validFiles.length === 0) {
      showFeedback('error', '❌ Nenhum arquivo válido foi selecionado.')
      return
    }
    
    
    // Validar quantidade total
    if (formData.fichas.length + validFiles.length > LIMITES_UPLOAD.quantidadeMaxima) {
      showFeedback('error', `⚠️ Limite de arquivos excedido: Máximo de ${LIMITES_UPLOAD.quantidadeMaxima} arquivos permitidos.`)
      return
    }
    
    // Validar usando função utilitária (apenas tipo de arquivo)
    const todosArquivos = [...formData.fichas, ...validFiles]
    const validacao = validarArquivos(todosArquivos)
    
    if (!validacao.valido) {
      showFeedback('error', `⚠️ ${validacao.erro}`)
      return
    }
    
    // Adicionar arquivos ao estado
    const currentIndex = formData.fichas.length
    setFormData(prev => ({
      ...prev,
      fichas: [...prev.fichas, ...validFiles]
    }))
    
    // Inicializar progresso para cada arquivo
    validFiles.forEach((file, fileIndex) => {
      const index = currentIndex + fileIndex
      setFileUploadProgress(prev => ({
        ...prev,
        [index]: {
          fileName: file.name,
          progress: 0,
          status: 'pending'
        }
      }))
    })
    
    // Criar previews apenas para imagens (não para PDFs - pode travar o navegador)
    validFiles.forEach(file => {
      const isImage = file.type.startsWith('image/') || 
                     file.name.toLowerCase().endsWith('.jpg') ||
                     file.name.toLowerCase().endsWith('.jpeg') ||
                     file.name.toLowerCase().endsWith('.png')
      
      const isPDF = file.type === 'application/pdf' || 
                   file.name.toLowerCase().endsWith('.pdf')
      
      if (isImage) {
        // Apenas criar preview para imagens
        const reader = new FileReader()
        
        // Timeout para evitar travamento
        const timeoutId = setTimeout(() => {
          reader.abort()
          console.warn(`[FILE-UPLOAD] ⏱️ Timeout ao criar preview de ${file.name}`)
          // Adicionar placeholder para imagens que falharam
          setPreviewFiles(prev => [...prev, ''])
        }, 10000) // 10 segundos timeout
        
        reader.onload = (e) => {
          clearTimeout(timeoutId)
          const result = e.target?.result
          if (result) {
            setPreviewFiles(prev => [...prev, result as string])
          } else {
            setPreviewFiles(prev => [...prev, ''])
          }
        }
        
        reader.onerror = () => {
          clearTimeout(timeoutId)
          console.error(`[FILE-UPLOAD] ❌ Erro ao criar preview de ${file.name}`)
          setPreviewFiles(prev => [...prev, ''])
        }
        
        try {
          reader.readAsDataURL(file)
        } catch (error) {
          clearTimeout(timeoutId)
          console.error(`[FILE-UPLOAD] ❌ Erro ao ler arquivo ${file.name}:`, error)
          setPreviewFiles(prev => [...prev, ''])
        }
      } else if (isPDF) {
        // Para PDFs, não criar preview (apenas adicionar placeholder vazio)
        // PDFs grandes podem travar o navegador ao tentar converter para base64
        setPreviewFiles(prev => [...prev, ''])
      } else {
        // Outros tipos de arquivo
        setPreviewFiles(prev => [...prev, ''])
      }
    })
    
    // NÃO iniciar upload ainda - será feito após criar o procedimento
    // Estado será atualizado no handleSubmit
    
    // Feedback removido - não exibir mensagem ao adicionar arquivos
    
    // NÃO fazer upload automático - aguardar criação do procedimento
    // Upload será feito no handleSubmit após criar o procedimento
    
    // Limpar input para permitir selecionar o mesmo arquivo novamente se necessário
    e.target.value = ''
  }

  // Remove file
  const removeFile = (index: number) => {
    // Remover arquivo da lista
    setFormData(prev => ({
      ...prev,
      fichas: prev.fichas.filter((_, i) => i !== index)
    }))
    setPreviewFiles(prev => prev.filter((_, i) => i !== index))
    
    // Remover progresso do arquivo
    setFileUploadProgress(prev => {
      const newProgress: typeof prev = {}
      Object.keys(prev).forEach(key => {
        const keyNum = parseInt(key)
        if (keyNum < index) {
          newProgress[keyNum] = prev[keyNum]
        } else if (keyNum > index) {
          newProgress[keyNum - 1] = prev[keyNum]
        }
        // keyNum === index é removido
      })
      return newProgress
    })
    
    // Remover dados de upload se existirem
    setUploadedAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Função auxiliar para converter data para formato ISO (YYYY-MM-DD)
  const convertDateToISO = (data: string): string => {
    if (!data || !data.trim()) return ''
    
    // Se já estiver no formato ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.trim())) {
      return data.trim()
    }
    
    // Se estiver no formato DD/MM/YYYY ou DD-MM-YYYY
    const parts = data.trim().split(/[\/\-]/)
    if (parts.length === 3) {
      const [dia, mes, ano] = parts
      // Se o ano tem 2 dígitos, assumir 20XX
      const anoCompleto = ano.length === 2 ? `20${ano}` : ano
      // Validar se é uma data válida
      const date = new Date(`${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`)
      if (!isNaN(date.getTime())) {
        return `${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
      }
    }
    
    // Tentar parsear como data genérica
    const date = new Date(data)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    return ''
  }

  // Função auxiliar para fazer match inteligente de tipo de procedimento
  const matchTipoProcedimento = (texto: string): string => {
    if (!texto) return ''
    const textoLower = texto.toLowerCase()
    
    // Mapeamento de palavras-chave para tipos de procedimento
    const mapeamento: Record<string, string> = {
      'cesariana': 'Cesariana',
      'cesárea': 'Cesariana',
      'cesarea': 'Cesariana',
      'parto normal': 'Parto Normal',
      'parto vaginal': 'Parto Normal',
      'parto': 'Parto Normal',
      'cirurgia geral': 'Cirurgia Geral',
      'cirurgia ortopédica': 'Cirurgia Ortopédica',
      'ortopedia': 'Cirurgia Ortopédica',
      'cirurgia plástica': 'Cirurgia Plástica',
      'plastica': 'Cirurgia Plástica',
      'cirurgia vascular': 'Cirurgia Vascular',
      'vascular': 'Cirurgia Vascular',
      'cirurgia neurológica': 'Cirurgia Neurológica',
      'neurologia': 'Cirurgia Neurológica',
      'cirurgia cardíaca': 'Cirurgia Cardíaca',
      'cardiologia': 'Cirurgia Cardíaca',
      'cirurgia digestiva': 'Cirurgia Digestiva',
      'digestiva': 'Cirurgia Digestiva',
    }
    
    // Buscar match exato primeiro
    for (const [key, value] of Object.entries(mapeamento)) {
      if (textoLower.includes(key)) {
        return value
      }
    }
    
    // Se não encontrou match, verificar se algum tipo de procedimento está contido no texto
    for (const tipo of TIPOS_PROCEDIMENTO) {
      if (textoLower.includes(tipo.toLowerCase()) || tipo.toLowerCase().includes(textoLower)) {
        return tipo
      }
    }
    
    return ''
  }

  // Função auxiliar para fazer match inteligente de técnica anestésica
  const matchTecnicaAnestesica = (texto: string): string => {
    if (!texto) return ''
    const textoLower = texto.toLowerCase()
    
    // Mapeamento de palavras-chave para técnicas anestésicas
    const mapeamento: Record<string, string> = {
      'raquianestesia': 'Raquianestesia',
      'raqui': 'Raquianestesia',
      'anestesia geral': 'Anestesia geral',
      'geral': 'Anestesia geral',
      'bloqueio periférico': 'Bloqueio Periférico',
      'bloqueio': 'Bloqueio Periférico',
      'sedação consciente': 'Sedação Consciente',
      'sedação': 'Sedação Consciente',
      'anestesia regional': 'Anestesia Regional',
      'regional': 'Anestesia Regional',
      'bloqueio de plexo': 'Bloqueio de Plexo',
      'plexo': 'Bloqueio de Plexo',
      'anestesia subaracnoidea': 'Anestesia Subaracnoidea',
      'subaracnoidea': 'Anestesia Subaracnoidea',
      'anestesia peridural': 'Anestesia Peridural',
      'peridural': 'Anestesia Peridural',
      'bloqueio axilar': 'Bloqueio Axilar',
      'axilar': 'Bloqueio Axilar',
      'bloqueio femoral': 'Bloqueio Femoral',
      'femoral': 'Bloqueio Femoral',
      'duplo bloqueio': 'Raquianestesia', // Assumir raqui como padrão para duplo bloqueio
      'bloqueio duplo': 'Raquianestesia',
      'acompanhamento': 'Acompanhamento anestésico',
    }
    
    // Buscar match nas opções disponíveis
    for (const [key, value] of Object.entries(mapeamento)) {
      if (textoLower.includes(key)) {
        // Verificar se o valor existe na lista
        const existe = TIPOS_ANESTESIA.find(a => a.nome === value)
        if (existe) {
          return value
        }
      }
    }
    
    return ''
  }

  // Função para processar OCR e preencher campos automaticamente
  const handleOCRExtract = async (rawText: string, confidence?: number, parsedData?: any) => {
    try {
      // Se já temos dados parseados pela IA Vision, usar eles diretamente
      if (parsedData) {
        console.log('✅ [AI Vision] Dados recebidos (Detailed):', parsedData)
        
        const updates: Partial<FormData> = {}
        const camposPreenchidos: string[] = []
        
        // Mapeamento direto
        if (parsedData.nome) {
          updates.nomePaciente = parsedData.nome
          camposPreenchidos.push('Nome do Paciente')
        }
        if (parsedData.nascimento) {
          const isoBirth = convertDateToISO(parsedData.nascimento)
          if (isoBirth) {
            updates.dataNascimento = isoBirth
            camposPreenchidos.push('Data de Nascimento')
          }
        }
        if (parsedData.dataProcedimento) {
          const isoDate = convertDateToISO(parsedData.dataProcedimento)
          if (isoDate) {
            updates.dataProcedimento = isoDate
            camposPreenchidos.push('Data do Procedimento')
          }
        }
        if (parsedData.tipoProcedimento) {
          const match = matchTipoProcedimento(parsedData.tipoProcedimento)
          if (match) {
            updates.tipoProcedimento = match
            camposPreenchidos.push('Tipo de Procedimento')
          }
        }
        if (parsedData.tecnica) {
          const match = matchTecnicaAnestesica(parsedData.tecnica)
          if (match) {
            updates.tecnicaAnestesica = match
            const item = TIPOS_ANESTESIA.find(a => a.nome === match)
            if (item) updates.codigoTSSU = item.codigo
            camposPreenchidos.push('Técnica Anestésica')
          }
        }
        
        // Campos Detalhados
        if (parsedData.sexo) updates.patientGender = (parsedData.sexo === 'M' ? 'M' : parsedData.sexo === 'F' ? 'F' : 'Other') as any
        if (parsedData.convenio) updates.convenio = normalizarConvenio(parsedData.convenio)
        if (parsedData.carteirinha) updates.carteirinha = parsedData.carteirinha
        if (parsedData.hospital) updates.hospital = parsedData.hospital
        if (parsedData.nomeCirurgiao) updates.nomeCirurgiao = parsedData.nomeCirurgiao
        if (parsedData.horario) updates.horario = parsedData.horario

        // Aplicar todos os updates
        Object.entries(updates).forEach(([field, value]) => {
          updateFormData(field as keyof FormData, value)
        })

        setOcrCamposPreenchidos(camposPreenchidos)
        showFeedback('success', `✅ IA Vision processada! ${camposPreenchidos.length} campos principais identificados.`)
        return
      }

      if (!rawText || rawText.trim().length === 0) {
        showFeedback('error', '⚠️ Nenhum texto foi extraído da imagem. Verifique se a imagem está clara e legível.')
        return
      }

      // Armazenar texto bruto e confiança para exibição
      setOcrRawText(rawText)
      setOcrConfidence(confidence)

      // Tentar parsear com IA primeiro
      let parsed: ReturnType<typeof parseFicha> | null = null
      let usandoIA = false
      
      try {
        console.log('🤖 [CADASTRO DETALHADO] Tentando parse com IA...')
        const response = await fetch('/api/ocr/parse-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: rawText }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.parsed && data.camposPreenchidos >= 4) {
            // IA retornou dados suficientes (>= 4 campos obrigatórios)
            parsed = data.parsed as ReturnType<typeof parseFicha>
            usandoIA = true
            console.log('✅ [CADASTRO DETALHADO] Parse com IA bem-sucedido:', data.camposPreenchidos, 'campos')
          }
        }
      } catch (aiError: any) {
        console.warn('⚠️ [CADASTRO DETALHADO] Erro ao processar com IA, usando parse tradicional:', aiError.message)
      }

      // Se IA não retornou dados suficientes, usar parse tradicional
      if (!parsed || !usandoIA) {
        console.log('📄 [CADASTRO DETALHADO] Usando parse tradicional (regex)')
        parsed = parseFicha(rawText)
      }

      console.log('📄 [CADASTRO DETALHADO] Dados parseados:', parsed, usandoIA ? '(IA)' : '(Regex)')

      // Preencher APENAS campos obrigatórios marcados com *
      const updates: Partial<FormData> = {}
      const camposPreenchidos: string[] = []

      // 1. Nome do paciente * (obrigatório)
      if (parsed.nome && parsed.nome.trim()) {
        updates.nomePaciente = parsed.nome.trim()
        camposPreenchidos.push('Nome do Paciente')
      }

      // 2. Data de nascimento * (obrigatório) - converter para formato ISO
      if (parsed.nascimento && parsed.nascimento.trim()) {
        const dataISO = convertDateToISO(parsed.nascimento.trim())
        if (dataISO) {
          updates.dataNascimento = dataISO
          camposPreenchidos.push('Data de Nascimento')
        }
      }

      // 3. Data do procedimento / entrada * (obrigatório) - converter para formato ISO
      if (parsed.dataProcedimento || parsed.entrada) {
        const dataProc = parsed.dataProcedimento || parsed.entrada
        if (dataProc && dataProc.trim()) {
          const dataISO = convertDateToISO(dataProc.trim())
          if (dataISO) {
            updates.dataProcedimento = dataISO
            camposPreenchidos.push('Data do Procedimento')
          }
        }
      }

      // 4. Tipo de procedimento / procedimento realizado * (obrigatório) - fazer match inteligente
      if (parsed.tipoProcedimento || parsed.procedimento) {
        const proced = parsed.tipoProcedimento || parsed.procedimento
        if (proced && proced.trim()) {
          const tipoMatch = matchTipoProcedimento(proced.trim())
          if (tipoMatch) {
            updates.tipoProcedimento = tipoMatch
            camposPreenchidos.push('Tipo de Procedimento')
          } else {
            // Se não encontrou match, usar o valor direto se estiver na lista
            const valorDireto = TIPOS_PROCEDIMENTO.find(t => t.toLowerCase() === proced.trim().toLowerCase())
            if (valorDireto) {
              updates.tipoProcedimento = valorDireto
              camposPreenchidos.push('Tipo de Procedimento')
            } else {
              // Fallback: usar o valor direto mesmo sem match
              updates.tipoProcedimento = proced.trim()
              camposPreenchidos.push('Tipo de Procedimento')
            }
          }
        }
      }

      // 5. Técnica anestésica * (obrigatório) - fazer match inteligente
      if (parsed.tecnica && parsed.tecnica.trim()) {
        const tecnicaMatch = matchTecnicaAnestesica(parsed.tecnica.trim())
        if (tecnicaMatch) {
          updates.tecnicaAnestesica = tecnicaMatch
          // Encontrar código TSSU correspondente
          const anestesiaEncontrada = TIPOS_ANESTESIA.find(a => a.nome === tecnicaMatch)
          if (anestesiaEncontrada) {
            updates.codigoTSSU = anestesiaEncontrada.codigo
          }
          camposPreenchidos.push('Técnica Anestésica')
        } else {
          // Se não encontrou match, tentar usar o valor direto se estiver na lista
          const valorDireto = TIPOS_ANESTESIA.find(a => a.nome.toLowerCase() === parsed.tecnica.trim().toLowerCase())
          if (valorDireto) {
            updates.tecnicaAnestesica = valorDireto.nome
            updates.codigoTSSU = valorDireto.codigo
            camposPreenchidos.push('Técnica Anestésica')
          } else {
            // Fallback: tentar encontrar por substring
            const tecnicaLower = parsed.tecnica.toLowerCase()
            const anestesiaEncontrada = TIPOS_ANESTESIA.find(a => 
              a.nome.toLowerCase().includes(tecnicaLower) || 
              tecnicaLower.includes(a.nome.toLowerCase())
            )
            if (anestesiaEncontrada) {
              updates.tecnicaAnestesica = anestesiaEncontrada.nome
              updates.codigoTSSU = anestesiaEncontrada.codigo
              camposPreenchidos.push('Técnica Anestésica')
            }
          }
        }
      }

      // 6. Sexo * (obrigatório)
      if (parsed.sexo && (parsed.sexo === 'M' || parsed.sexo === 'F')) {
        updates.patientGender = parsed.sexo as 'M' | 'F'
        camposPreenchidos.push('Sexo')
      }

      // 7. Convênio * (obrigatório)
      if (parsed.convenio && parsed.convenio.trim()) {
        updates.convenio = normalizarConvenio(parsed.convenio)
        camposPreenchidos.push('Convênio')
      }

      // 8. Cirurgião * (obrigatório)
      if (parsed.nomeCirurgiao || parsed.cirurgiao) {
        const cirurg = parsed.nomeCirurgiao || parsed.cirurgiao
        if (cirurg && cirurg.trim()) {
          updates.nomeCirurgiao = cirurg.trim()
          camposPreenchidos.push('Cirurgião')
        }
      }

      console.log('✅ [CADASTRO DETALHADO] Updates a serem aplicados:', updates)

      // Atualizar formulário
      setFormData(prev => ({
        ...prev,
        ...updates
      }))

      // Log no Supabase (opcional)
      if (user?.id && supabase) {
        try {
          const { error: logError } = await supabase.from('ocr_logs').insert({
            user_id: user.id,
            raw_text: rawText,
            parsed: parsed,
            confidence: confidence ? parseFloat(confidence.toFixed(2)) : null,
            created_at: new Date().toISOString()
          })
          
          if (logError) {
            // Ignorar erro se a tabela não existir ou se houver problema de permissão
            console.warn('Erro ao salvar log OCR (tabela pode não existir ou sem permissão):', logError)
          }
        } catch (logError) {
          // Ignorar erros de log
          console.warn('Erro ao salvar log OCR:', logError)
        }
      }

      // Calcular campos faltando para exibição
      const camposFaltando = [
        !updates.nomePaciente && 'Nome do Paciente',
        !updates.dataNascimento && 'Data de Nascimento',
        !updates.dataProcedimento && 'Data do Procedimento',
        !updates.tipoProcedimento && 'Tipo de Procedimento',
        !updates.tecnicaAnestesica && 'Técnica Anestésica',
        !updates.patientGender && 'Sexo',
        !updates.convenio && 'Convênio',
        !updates.nomeCirurgiao && 'Cirurgião'
      ].filter(Boolean) as string[]

      // Armazenar informações para exibição
      setOcrCamposPreenchidos(camposPreenchidos)
      setOcrCamposFaltando(camposFaltando)

      // Feedback de sucesso
      const totalPreenchidos = camposPreenchidos.length
      if (totalPreenchidos > 0) {
        let mensagem = `✅ OCR processado com sucesso! ${totalPreenchidos} campo(s) preenchido(s) automaticamente.`
        
        if (camposFaltando.length > 0) {
          mensagem += ` Revise os campos abaixo e preencha os faltantes manualmente.`
        } else {
          mensagem += ` Todos os campos obrigatórios foram preenchidos! Revise e ajuste se necessário.`
        }
        
        showFeedback('success', mensagem)
      } else {
        showFeedback('error', '⚠️ Nenhum campo obrigatório foi encontrado no OCR. Verifique se a imagem está clara e legível, ou preencha os campos manualmente.')
      }

    } catch (error: any) {
      console.error('Erro ao processar OCR:', error)
      showFeedback('error', `❌ Erro ao processar dados extraídos: ${error.message || 'Erro desconhecido'}`)
    }
  }

  // ===== SOLUÇÃO: handleSubmit otimizado para salvar no mobile =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()
    
    console.log('[SUBMIT] 🚀 Iniciando salvamento (Mobile)')
    
    if (!user?.id) {
      showFeedback('error', '❌ Não autenticado.')
      return
    }

    if (currentSection !== 3) {
      showFeedback('error', '⚠️ Complete todas as etapas.')
      return
    }

    // Limpar attachments anteriores (serão recriados após upload com ID real)
    setUploadedAttachments([])

    // Validações básicas
    const camposObrigatorios = {
      'Nome': formData.nomePaciente,
      'Data': formData.dataProcedimento,
      'Procedimento': formData.tipoProcedimento,
      'Anestesia': formData.tecnicaAnestesica
    }
    
    const faltando = Object.entries(camposObrigatorios)
      .filter(([_, value]) => !value)
      .map(([key]) => key)
    
    if (faltando.length > 0) {
      showFeedback('error', `⚠️ Campos obrigatórios não preenchidos: ${faltando.join(', ')}`)
      addToast({
        title: 'Campos obrigatórios',
        description: `Preencha: ${faltando.join(', ')}`,
        variant: 'error',
        duration: 6000
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
        
      // Timeout de segurança - 90s no mobile (createProcedure tem timeout de 45s x 3 tentativas = até 135s, mas vamos usar 90s como segurança)
      const safetyTimeout = setTimeout(() => {
          setLoading(false)
        showFeedback('error', '❌ Operação demorou muito. Verifique sua conexão.')
      }, 90000)

    setLoading(true)
    showFeedback('info', '⏳ Salvando procedimento...')
    
    try {
      // CRÍTICO: Limpar dados para mobile - remover campos undefined/null
      const procedureData: any = {
        // Campos obrigatórios
        procedure_name: formData.tipoProcedimento,
        procedure_value: parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        procedure_date: formData.dataProcedimento,
        procedure_type: formData.tipoProcedimento,
        
        // Campos do paciente
        patient_name: formData.nomePaciente,
        tecnica_anestesica: formData.tecnicaAnestesica,
        user_id: user.id,
        anesthesiologist_name: user.name || 'Anônimo',
        show_to_secretary: formData.show_to_secretary,
      }
      
      // Adicionar campos opcionais apenas se tiverem valor
      if (formData.dataNascimento) {
        procedureData.data_nascimento = formData.dataNascimento
        procedureData.patient_age = parseInt(calculateAge(formData.dataNascimento))
      }
      
      if (formData.convenio) procedureData.convenio = formData.convenio
      if (formData.carteirinha) procedureData.carteirinha = formData.carteirinha
      if (formData.patientGender) procedureData.patient_gender = formData.patientGender
      
      if (formData.nomeCirurgiao) {
        procedureData.nome_cirurgiao = formData.nomeCirurgiao
        procedureData.surgeon_name = formData.nomeCirurgiao
      }
      
      if (formData.especialidadeCirurgiao) procedureData.especialidade_cirurgiao = formData.especialidadeCirurgiao
      if (formData.nomeEquipe) procedureData.nome_equipe = formData.nomeEquipe
      if (formData.hospital) procedureData.hospital_clinic = formData.hospital
      if (formData.group_id) {
        procedureData.group_id = formData.group_id
        if (formData.anesthesiologist_user_id) {
          procedureData.anesthesiologist_user_id = formData.anesthesiologist_user_id
        }
        if (formData.billing_entity_type) {
          procedureData.billing_entity_type = formData.billing_entity_type
        }
        if (formData.anesthesiologist_role) {
          procedureData.anesthesiologist_role = formData.anesthesiologist_role
        }
      }
      
      if (formData.horario) {
        procedureData.horario = formData.horario
        procedureData.procedure_time = formData.horario
      }
      
      if (formData.duracaoHoras) {
        const duracao = Math.round(parseFloat(formData.duracaoHoras) * 60)
        procedureData.duracao_minutos = duracao
        procedureData.duration_minutes = duracao
      }
      
      if (formData.codigoTSSU) procedureData.codigo_tssu = formData.codigoTSSU
      if (formData.grupoAnestesico) procedureData.grupo_anestesico = formData.grupoAnestesico
        
      // Campos do procedimento
      if (formData.sangramento) procedureData.sangramento = formData.sangramento
      if (formData.nauseaVomito) procedureData.nausea_vomito = formData.nauseaVomito
      if (formData.dor) procedureData.dor = formData.dor
      if (formData.observacoesProcedimento) procedureData.observacoes_procedimento = formData.observacoesProcedimento

      // Campos obstétricos
      if (formData.acompanhamentoAntes) procedureData.acompanhamento_antes = formData.acompanhamentoAntes
      if (formData.tipoParto) procedureData.tipo_parto = formData.tipoParto
      if (formData.tipoCesariana) procedureData.tipo_cesariana = formData.tipoCesariana
      if (formData.indicacaoCesariana) procedureData.indicacao_cesariana = formData.indicacaoCesariana
      if (formData.descricaoIndicacaoCesariana) procedureData.descricao_indicacao_cesariana = formData.descricaoIndicacaoCesariana
      if (formData.retencaoPlacenta) procedureData.retencao_placenta = formData.retencaoPlacenta
      if (formData.laceracaoPresente) procedureData.laceracao_presente = formData.laceracaoPresente
      if (formData.grauLaceracao) procedureData.grau_laceracao = formData.grauLaceracao
      if (formData.hemorragiaPuerperal) procedureData.hemorragia_puerperal = formData.hemorragiaPuerperal
      if (formData.transfusaoRealizada) procedureData.transfusao_realizada = formData.transfusaoRealizada
        
        // Campos financeiros
      procedureData.payment_status = STATUS_PAGAMENTO_MAP[formData.statusPagamento] || 'pending'
      
      if (formData.statusPagamento === 'Pago' && formData.dataPagamento) {
        procedureData.payment_date = formData.dataPagamento
      }
      
      if (formData.formaPagamento) procedureData.forma_pagamento = formData.formaPagamento
      if (formData.numero_parcelas) procedureData.numero_parcelas = parseInt(formData.numero_parcelas)
      
      if (formData.parcelas && formData.parcelas.length > 0) {
        procedureData.parcelas_recebidas = formData.parcelas.filter(p => p.recebida).length
      }
      
      if (formData.observacoes) procedureData.observacoes_financeiras = formData.observacoes

      // Feedback
      if (formData.enviarRelatorioCirurgiao === 'Sim') {
        procedureData.feedback_solicitado = true
        if (formData.emailCirurgiao) procedureData.email_cirurgiao = formData.emailCirurgiao
        if (formData.telefoneCirurgiao) procedureData.telefone_cirurgiao = formData.telefoneCirurgiao
      }
      
      console.log('[SUBMIT] 📦 Dados preparados:', Object.keys(procedureData).length, 'campos')
      console.log('[SUBMIT] 📦 Payload size:', JSON.stringify(procedureData).length, 'bytes')
      
      // MOBILE FIX: Usar API route para criar procedimento (mais confiável no mobile)
      // API route usa service role key e não depende de sessão do cliente
      console.log('[SUBMIT] 🚀 Criando procedimento via API route (bypass de sessão)')
      console.log('[SUBMIT] 📊 Tem imagens anexadas?', formData.fichas?.length > 0 ? `Sim (${formData.fichas.length})` : 'Não')
      
      // Log específico para debug quando há imagens
      if (formData.fichas && formData.fichas.length > 0) {
        console.log('[SUBMIT] ⚠️ ATENÇÃO: Há imagens anexadas. Procedimento será criado PRIMEIRO, depois upload das imagens.')
      }
      
      const startTime = Date.now()
      
      let result: any = null
      let createProcedureError: any = null
      
      try {
        // Usar API route para criar procedimento (mais confiável no mobile)
        console.log('[SUBMIT] Chamando /api/create-procedure...')
        
        const response = await fetch('/api/create-procedure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            procedureData,
            userId: user.id
          })
        })
        
        const responseData = await response.json()
        
        if (!response.ok || !responseData.success) {
          throw new Error(responseData.error || 'Erro ao criar procedimento via API')
        }
        
        // API route retorna apenas os dados básicos, precisamos montar o objeto result
        result = {
          id: responseData.data.id,
          procedure_name: responseData.data.procedure_name,
          patient_name: responseData.data.patient_name,
          created_at: responseData.data.created_at
        }
        
        console.log('[SUBMIT] ✅ Procedimento criado via API! ID:', result.id)
        
      } catch (error: any) {
        createProcedureError = error
        console.error('[SUBMIT] ❌ Erro ao criar procedimento via API:', error)
        
        // Fallback: tentar via procedureService (método antigo)
        console.log('[SUBMIT] 🔄 Tentando fallback via procedureService...')
        
        try {
          result = await procedureService.createProcedure(procedureData)
          if (result) {
            createProcedureError = null
            console.log('[SUBMIT] ✅ Fallback funcionou! ID:', result.id)
          }
        } catch (fallbackError: any) {
          console.error('[SUBMIT] ❌ Fallback também falhou:', fallbackError)
        }
      }
      
      const elapsedTime = Date.now() - startTime
      
      
      if (!result || createProcedureError) {
        clearTimeout(safetyTimeout)
        setLoading(false)
        
        console.error('[SUBMIT] ❌ Falha ao criar procedimento')
        console.error('[SUBMIT] ❌ Tempo decorrido:', elapsedTime, 'ms')
        console.error('[SUBMIT] ❌ Há imagens anexadas?', formData.fichas?.length > 0 ? `Sim (${formData.fichas.length})` : 'Não')
        
        // Verificar se foi timeout
        if (elapsedTime >= 45000) {
          console.error('[SUBMIT] ⏱️ TIMEOUT detectado (45s ou mais)')
          showFeedback('error', '⏱️ Operação demorou muito. Verifique sua conexão.')
        } else if (createProcedureError) {
          // Exceção capturada
          showFeedback('error', `❌ Erro: ${createProcedureError?.message || 'Erro desconhecido'}`)
        } else {
          // Mensagem específica para mobile
          showFeedback('error', '❌ Não foi possível salvar. Verifique sua conexão e tente novamente.')
        }
        
        addToast({
          title: 'Erro ao salvar',
          description: 'A operação demorou muito ou houve um erro de conexão. Tente conectar ao WiFi ou aguarde alguns minutos.',
          variant: 'error',
          duration: 8000
        })
          return
        }
        
      console.log('[SUBMIT] ✅ Procedimento ID:', result.id)
      
      // AGORA fazer upload das imagens com o ID REAL do procedimento
      if (formData.fichas && formData.fichas.length > 0) {
        console.log('[SUBMIT] 📤 Iniciando upload de', formData.fichas.length, 'arquivo(s) com ID real do procedimento...')
        console.log('[SUBMIT] 📤 Arquivos a enviar:', formData.fichas.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        })))
        
        // MOBILE FIX: Verificar e corrigir arquivos inválidos ANTES do upload
        const validFilesForUpload: File[] = []
        for (let i = 0; i < formData.fichas.length; i++) {
          const file = formData.fichas[i]
          
          if (file.size === 0 || !file.type || file.type === '') {
            
            try {
              const arrayBuffer = await file.arrayBuffer()
              if (arrayBuffer.byteLength === 0) {
                console.error(`[SUBMIT] ❌ Arquivo ${i + 1} está vazio (0 bytes)`)
                continue
              }
              
              // Inferir tipo MIME
              let inferredType = 'application/octet-stream'
              const fileName = file.name.toLowerCase()
              if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
                inferredType = 'image/jpeg'
              } else if (fileName.endsWith('.png')) {
                inferredType = 'image/png'
              } else if (fileName.endsWith('.pdf')) {
                inferredType = 'application/pdf'
              }
              
              const fixedFile = new File([arrayBuffer], file.name, {
                type: inferredType,
                lastModified: file.lastModified || Date.now()
              })
              
              
              validFilesForUpload.push(fixedFile)
            } catch (error: any) {
              console.error(`[SUBMIT] ❌ Erro ao corrigir arquivo ${i + 1}:`, error)
            }
          } else {
            validFilesForUpload.push(file)
          }
        }
        
        
        if (validFilesForUpload.length === 0) {
          console.warn('[SUBMIT] ⚠️ Nenhum arquivo válido para upload')
        } else {
          // Inicializar estado de upload
          setUploadProgress({
            isUploading: true,
            currentFile: 0,
            totalFiles: validFilesForUpload.length,
            currentFileName: '',
            progress: 0
          })
          
          // Inicializar progresso para cada arquivo
          validFilesForUpload.forEach((file, index) => {
            setFileUploadProgress(prev => ({
              ...prev,
              [index]: {
                fileName: file.name,
                progress: 0,
                status: 'pending'
              }
            }))
          })
          
          showFeedback('info', `📤 Enviando ${validFilesForUpload.length} arquivo(s)...`)
          
          // Fazer upload paralelo de todos os arquivos e coletar attachments diretamente
          const procedureId = result.id // Salvar o ID do procedimento antes do map
          const uploadPromises = validFilesForUpload.map(async (file, index) => {
            // Atualizar status para "uploading" imediatamente quando iniciar
            setFileUploadProgress(prev => ({
              ...prev,
              [index]: {
                ...prev[index],
                status: 'uploading',
                progress: 1 // Progresso inicial mínimo para mostrar que iniciou
              }
            }))
            
            try {
              const uploadResult = await uploadSingleFile(file, index, procedureId)
              
              if (uploadResult.success && uploadResult.attachment) {
                return { success: true, attachment: uploadResult.attachment, index }
              } else {
                console.error(`[SUBMIT] ❌ Upload ${index + 1} falhou - sem attachment`)
                return { success: false, index }
              }
            } catch (error: any) {
              console.error(`[SUBMIT] ❌ Erro no upload ${index + 1}:`, error)
              return { success: false, index }
            }
          })
        
        // Aguardar todos os uploads e coletar resultados
        const uploadResultsWithAttachments = await Promise.all(uploadPromises)
        
        const successCount = uploadResultsWithAttachments.filter(r => r.success === true).length
        const failCount = uploadResultsWithAttachments.filter(r => r.success === false).length
        
        // Desativar estado de upload
        setUploadProgress({
          isUploading: false,
          currentFile: 0,
          totalFiles: 0,
          currentFileName: '',
          progress: 0
        })
        
        if (failCount === 0) {
          showFeedback('success', `✅ ${successCount} arquivo(s) enviado(s) com sucesso!`)
        } else {
          showFeedback('info', `⚠️ ${successCount} arquivo(s) enviado(s), ${failCount} falhou(ram)`)
            }
            
        // Vincular attachments que foram enviados com sucesso
        // Usar os attachments coletados diretamente dos resultados dos uploads
        const successfulAttachments = uploadResultsWithAttachments
          .filter(r => r.success === true && r.attachment)
          .map(r => r.attachment)
        
        console.log('[SUBMIT] 📎 Verificando attachments para vincular...')
        console.log('[SUBMIT] 📎 Total de uploads bem-sucedidos:', successCount)
        console.log('[SUBMIT] 📎 Attachments coletados para vincular:', successfulAttachments.length)
        
        if (successfulAttachments.length > 0) {
          console.log('[SUBMIT] 📎 Vinculando', successfulAttachments.length, 'attachment(s)...')
          
          // Buscar URLs dos attachments do estado atualizado (caso não tenham sido coletadas)
          const currentStateAttachments = uploadedAttachments
          
          for (let i = 0; i < successfulAttachments.length; i++) {
            let attachment = successfulAttachments[i]
            
            // Se o attachment não tiver URL, tentar buscar do estado
            if (!attachment.file_url || attachment.file_url === '') {
              const stateAttachment = currentStateAttachments.find(a => 
                a.file_name === attachment.file_name ||
                a.file_name.includes(attachment.file_name.substring(0, 20))
              )
              if (stateAttachment) {
                attachment = { ...attachment, ...stateAttachment }
              }
            }
            
            
            if (!attachment.file_url || attachment.file_url === '') {
                continue
              }
              
            try {
              // MOBILE FIX: Usar API route para criar attachment (bypass RLS)
              const attachmentResponse = await fetch('/api/create-attachment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  procedure_id: procedureId,
                  file_name: attachment.file_name,
                  file_size: attachment.file_size,
                  file_type: attachment.file_type,
                  file_url: attachment.file_url
                })
              })
              
              const attachmentResult = await attachmentResponse.json()
              
              if (attachmentResponse.ok && attachmentResult.success) {
              } else {
              }
            } catch (e: any) {
              console.error(`[SUBMIT] ❌ Erro ao vincular attachment ${i + 1}:`, e)
              console.error(`[SUBMIT] ❌ Erro detalhado:`, {
                message: e?.message,
                code: e?.code,
                details: e?.details
              })
            }
            
            // Pausa entre attachments no mobile
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          
          console.log('[SUBMIT] ✅ Processo de vinculação de attachments concluído')
        } else {
          console.warn('[SUBMIT] ⚠️ Nenhum attachment para vincular')
          console.warn('[SUBMIT] ⚠️ uploadedAttachments do estado:', uploadedAttachments.length)
          console.warn('[SUBMIT] ⚠️ uploadResults:', uploadResultsWithAttachments.length)
        }
        } // Fim do if (validFilesForUpload.length > 0)
      }
      
      // Criar link de feedback (não bloquear se falhar)
      let feedbackUrl = ''
      if (formData.enviarRelatorioCirurgiao === 'Sim' && formData.emailCirurgiao) {
        try {
          const feedbackLink = await feedbackService.createFeedbackLinkOnly({
            procedureId: result.id,
            emailCirurgiao: formData.emailCirurgiao,
            telefoneCirurgiao: formData.telefoneCirurgiao
          })
          if (feedbackLink) feedbackUrl = feedbackLink
        } catch (e) {
          console.warn('[SUBMIT] ⚠️ Erro ao criar link de feedback:', e)
          }
        }
        
      // Salvar parcelas (não bloquear se falhar)
      if (formData.parcelas && formData.parcelas.length > 0) {
        try {
          const parcelasData = formData.parcelas.map(p => ({
            procedure_id: result.id,
            numero_parcela: p.numero,
            valor_parcela: p.valor,
            recebida: p.recebida,
            data_recebimento: p.data_recebimento || null
          }))
          
          await procedureService.createParcelas(parcelasData)
        } catch (e) {
          console.warn('[SUBMIT] ⚠️ Erro ao salvar parcelas:', e)
        }
      }
      
      // Preparar modal de sucesso
      setSuccessData({
        paciente: formData.nomePaciente,
        procedimento: formData.tipoProcedimento,
        valor: formData.valor,
        parcelas: formData.parcelas?.length > 0 
          ? `${formData.parcelas.filter(p => p.recebida).length}/${formData.parcelas.length} recebidas`
          : 'Não parcelado',
        feedbackUrl: feedbackUrl || undefined,
        emailCirurgiao: formData.emailCirurgiao || undefined,
        telefoneCirurgiao: formData.telefoneCirurgiao || undefined
      })
      
      // Finalizar
      clearTimeout(safetyTimeout)
      setLoading(false)
      setShowSuccessModal(true)
      showFeedback('success', '✅ Procedimento salvo!')
      
    } catch (error: any) {
      clearTimeout(safetyTimeout)
      setLoading(false)
      
      console.error('[SUBMIT] ❌ Erro fatal:', error)
      console.error('[SUBMIT] Stack:', error?.stack)
      
      // Mensagem de erro específica
      let errorMessage = 'Erro ao salvar procedimento.'
      
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = '🌐 Erro de conexão. Verifique sua internet.'
      } else if (error?.message?.includes('timeout')) {
        errorMessage = '⏱️ Operação demorou muito. Tente novamente.'
      } else if (error?.message?.includes('401') || error?.message?.includes('403')) {
        errorMessage = '🔐 Sessão expirada. Faça login novamente.'
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      showFeedback('error', `❌ ${errorMessage}`)
        addToast({
          title: 'Erro ao salvar',
        description: errorMessage + ' Se o problema persistir, tente conectar ao WiFi.',
        variant: 'error',
        duration: 8000
        })
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <Link href={urlGroupId ? `/grupos/${urlGroupId}` : "/procedimentos"}>
                  <Button variant="ghost" size="sm" className="text-sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              Novo Procedimento Anestésico
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Cadastre um novo procedimento com todas as informações
            </p>
          </div>
        </div>

        {/* Opções de Preenchimento Automático */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gray-200"></div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preenchimento Automático (Opcional)</span>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>
        </div>
          
        {/* Progress Indicator - Mobile Optimized */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-semibold text-gray-700">
                Passo {currentSection + 1} de {sections.length}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 truncate">
              {sections[currentSection].title}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5">
            <div 
              className="bg-teal-500 h-2 sm:h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Progress Steps - Mobile Optimized */}
        <div className="mb-6">
          {/* Mobile: Horizontal scrollable steps */}
          <div className="block md:hidden">
            <div 
              className="flex space-x-2 overflow-x-auto pb-2 px-4 scrollbar-hide"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {sections.map((section, index) => {
                const Icon = section.icon
                const isActive = currentSection === section.id
                const isCompleted = currentSection > section.id
                const isClickable = isCompleted || isActive
                
                return (
                  <button
                    key={section.id}
                    onClick={() => isClickable && setCurrentSection(section.id)}
                    disabled={!isClickable}
                    className={`flex-shrink-0 flex flex-col items-center p-3 rounded-lg min-w-[90px] transition-all duration-200 ${
                      isActive 
                        ? 'bg-teal-500 text-white shadow-md scale-105' 
                        : isCompleted
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-600 opacity-60'
                    } ${!isClickable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-1.5">
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className="text-xs font-medium text-center leading-tight px-1">
                      {section.title.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-center opacity-80 mt-0.5">
                      {index + 1}/{sections.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Desktop: Original horizontal layout */}
          <div className="hidden md:flex items-center justify-center space-x-2">
            {sections.map((section, index) => {
              const Icon = section.icon
              const isActive = currentSection === section.id
              const isCompleted = currentSection > section.id
              const isClickable = isCompleted || isActive
              
              return (
                <div key={section.id} className="flex items-center">
                  <button
                    onClick={() => isClickable && setCurrentSection(section.id)}
                    disabled={!isClickable}
                    className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                      !isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                      isActive 
                        ? 'bg-teal-500 border-teal-500 text-white shadow-lg scale-110' 
                        : isCompleted
                        ? 'bg-teal-600 border-teal-600 text-white hover:bg-teal-500'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs font-medium text-center max-w-[80px] ${
                      isActive ? 'text-teal-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {section.title}
                    </span>
                  </button>
                  {index < sections.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 transition-all duration-200 ${
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
                {feedbackType === 'error' ? error : feedbackType === 'success' ? success : info || '⏳ Processando...'}
              </div>
            </div>
          )}

          {/* Section 0: Identificação do Procedimento */}
          {currentSection === 0 && (
            <div className="space-y-6">
              {/* OCR IA Vision - Agora apenas no passo 1 */}
              <div className="relative ocr-info-container mb-6">
                <UploadFicha 
                  onExtract={handleOCRExtract}
                  onError={(error) => showFeedback('error', `Erro no OCR: ${error}`)}
                />
                <button
                  type="button"
                  onClick={() => setShowOcrInfo(!showOcrInfo)}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 p-2 sm:p-1.5 rounded-full text-blue-600 hover:text-blue-700 transition-colors z-10 flex items-center justify-center"
                >
                  <Info className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
                
                {showOcrInfo && (
                  <div className="absolute top-14 right-0 z-20 w-full sm:w-80 bg-white border border-blue-200 rounded-lg shadow-lg p-3 text-xs text-gray-700">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <strong className="text-blue-800 block mb-1">Importante:</strong>
                        <p>Esta foto é usada apenas para extrair os dados e <strong>não será salva</strong>.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Exibição dos resultados do OCR */}
              {ocrRawText && (
                <div className="mb-6">
                  <OCRResultDisplay
                    ocrRawText={ocrRawText}
                    camposPreenchidos={ocrCamposPreenchidos}
                    camposFaltando={ocrCamposFaltando}
                    confidence={ocrConfidence}
                  />
                </div>
              )}

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
                placeholder="Ex: Maria da Silva Santos"
                icon={<User className="w-5 h-5" />}
                    value={formData.nomePaciente}
                    onChange={(e) => updateFormData('nomePaciente', e.target.value)}
                required
              />
              <Input
                    label="Data de Nascimento"
                    type="date"
                    icon={<Calendar className="w-5 h-5" />}
                    value={formData.dataNascimento}
                    onChange={(e) => updateFormData('dataNascimento', e.target.value)}
              />
              <Input
                    label="Idade"
                    type="text"
                    icon={<User className="w-5 h-5" />}
                    value={formData.dataNascimento ? `${calculateAge(formData.dataNascimento)} anos` : '0 anos'}
                    disabled
                    placeholder="Calculada automaticamente"
              />
              <Input
                    label="Data do Procedimento *"
                    type="date"
                    icon={<Calendar className="w-5 h-5" />}
                    value={formData.dataProcedimento}
                    onChange={(e) => updateFormData('dataProcedimento', e.target.value)}
                required
              />
              <ConvenioCombobox
                value={formData.convenio}
                onChange={(v) => updateFormData('convenio', v)}
              />
              <Input
                    label="Carterinha/Prontuário"
                    placeholder="Número da carteirinha ou prontuário"
                    icon={<CreditCard className="w-5 h-5" />}
                    value={formData.carteirinha}
                    onChange={(e) => updateFormData('carteirinha', e.target.value)}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Sexo do Paciente
                </label>
                <select
                  value={formData.patientGender}
                  onChange={(e) => updateFormData('patientGender', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900"
                  style={{
                    color: formData.patientGender ? '#111827' : '#9CA3AF'
                  }}
                >
                  <option value="" disabled hidden>Selecione o sexo</option>
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
                placeholder="Ex: Cirurgia cardíaca, Cesárea, Artroscopia..."
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
                        className="w-full px-4 py-3 text-left hover:bg-teal-50 focus:bg-teal-50 focus:outline-none border-b border-gray-100 last:border-b-0 touch-manipulation"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          selecionarAnestesia(anestesia)
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          selecionarAnestesia(anestesia)
                        }}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nome da Equipe"
                  placeholder="Nome da equipe médica"
                  icon={<Users className="w-5 h-5" />}
                  value={formData.nomeEquipe}
                  onChange={(e) => updateFormData('nomeEquipe', e.target.value)}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Users className="w-4 h-4 mr-1 text-teal-600" />
                    Vincular ao Grupo
                  </label>
                  <select
                    className="w-full px-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white h-[52px]"
                    value={formData.group_id}
                    onChange={(e) => updateFormData('group_id', e.target.value)}
                  >
                    <option value="">Nenhum (Agenda Particular)</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.group_id && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-teal-50/40 border border-teal-100 rounded-xl">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <User className="w-4 h-4 mr-1.5 text-teal-600" />
                      Anestesista (Grupo)
                    </label>
                    <select
                      className="w-full px-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white h-[52px]"
                      value={formData.anesthesiologist_user_id}
                      onChange={(e) => updateFormData('anesthesiologist_user_id', e.target.value)}
                      disabled={loadingGroupMembers}
                    >
                      {loadingGroupMembers ? (
                        <option value="">Carregando médicos do grupo...</option>
                      ) : (
                        <>
                          <option value="">Selecione o anestesista...</option>
                          {groupMembers.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.crm ? `(CRM: ${m.crm})` : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>



                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <Building className="w-4 h-4 mr-1.5 text-teal-600" />
                      Entidade de Faturamento
                    </label>
                    <select
                      className="w-full px-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white h-[52px]"
                      value={formData.billing_entity_type}
                      onChange={(e) => updateFormData('billing_entity_type', e.target.value)}
                    >
                      <option value="">Em aberto</option>
                      <option value="cnpj_anestesista">Faturar por CPF/CNPJ do Anestesista</option>
                      <option value="cnpj_grupo">Faturar por CNPJ do Grupo</option>
                    </select>
                  </div>
                </div>
              )}


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
                placeholder="Ex: 14:30 (formato 24h)"
                type="time"
                icon={<Clock className="w-5 h-5" />}
                value={formData.horario}
                onChange={(e) => updateFormData('horario', e.target.value)}
              />
              <Input
                label="Duração (horas)"
                placeholder="Ex: 2 ou 2.5 (em horas)"
                type="number"
                icon={<Clock className="w-5 h-5" />}
                value={formData.duracaoHoras}
                onChange={(e) => updateFormData('duracaoHoras', e.target.value)}
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
      </div>
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
                    <div className="space-y-4 border-t border-teal-500 pt-6">
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
                    <div className="mt-8 space-y-6 border-t border-teal-500 pt-6">
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
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Grau da Laceração
                          </label>
                          <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-6">
                            {['1', '2', '3', '4'].map((grau) => (
                              <label key={grau} className="flex items-center space-x-2 min-w-0">
                                <input
                                  type="radio"
                                  value={grau}
                                  checked={formData.grauLaceracao === grau}
                                  onChange={(e) => updateFormData('grauLaceracao', e.target.value)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-700 whitespace-nowrap">Grau {grau}</span>
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
                  <div className="mt-8 space-y-6 border-t border-teal-500 pt-6">
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
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Parto instrumentalizado, vaginal ou cesariana?
                        </label>
                        <div className="grid grid-cols-1 sm:flex sm:items-center gap-3 sm:gap-6">
                          <label className="flex items-center space-x-2 min-w-0">
                            <input
                              type="radio"
                              value="Instrumentalizado"
                              checked={formData.tipoParto === 'Instrumentalizado'}
                              onChange={(e) => updateFormData('tipoParto', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-700">Instrumentalizado</span>
                          </label>
                          <label className="flex items-center space-x-2 min-w-0">
                            <input
                              type="radio"
                              value="Vaginal"
                              checked={formData.tipoParto === 'Vaginal'}
                              onChange={(e) => updateFormData('tipoParto', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-700">Vaginal</span>
                          </label>
                          <label className="flex items-center space-x-2 min-w-0">
                            <input
                              type="radio"
                              value="Cesariana"
                              checked={formData.tipoParto === 'Cesariana'}
                              onChange={(e) => updateFormData('tipoParto', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500 flex-shrink-0"
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
                                  value="Raquianestesia"
                                  checked={formData.tipoCesariana === 'Raquianestesia'}
                                  onChange={(e) => updateFormData('tipoCesariana', e.target.value)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">Raquianestesia</span>
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
                              value="Raquianestesia"
                              checked={formData.tipoCesariana === 'Raquianestesia'}
                              onChange={(e) => updateFormData('tipoCesariana', e.target.value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Raquianestesia</span>
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

                {/* Campos financeiros unificados */}
                {(formData.statusPagamento === 'Pendente' || formData.statusPagamento === 'Pago') && (
                  <div className="space-y-6">
                    <div className={`grid grid-cols-1 ${formData.statusPagamento === 'Pago' ? 'md:grid-cols-2' : ''} gap-6`}>
                      <Input
                        label="Valor do Procedimento Anestésico"
                        placeholder="0,00"
                        icon={<span className="text-gray-500 font-medium">R$</span>}
                        value={formData.valor}
                        onChange={(e) => updateFormData('valor', e.target.value)}
                      />
                      {/* Data do Pagamento - apenas para status "Pago" */}
                      {formData.statusPagamento === 'Pago' && (
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
                      )}
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
                          {(formData.statusPagamento === 'Pago' ? FORMAS_PAGAMENTO_PAGO : FORMAS_PAGAMENTO_PENDENTE).map(forma => (
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
                            {formData.statusPagamento === 'Pago' 
                              ? 'Informe em quantas vezes foi dividido o pagamento'
                              : 'Informe em quantas vezes será dividido o pagamento'}
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

                {formData.statusPagamento === 'Aguardando' && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">
                      Quando o valor for definido, você poderá atualizar o status do pagamento.
                    </p>
                  </div>
                )}



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
                    Faça upload de até {LIMITES_UPLOAD.quantidadeMaxima} arquivos (PDF, JPG, PNG) - Campo opcional
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
                      Arquivos Selecionados ({formData.fichas.length})
                    </h4>
                    
                    {/* Mensagem informativa sobre upload */}
                    {!uploadProgress.isUploading && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-800">
                            <strong>Importante:</strong> Para iniciar o upload dos arquivos, clique no botão <strong>"Finalizar e Salvar"</strong> ao final do formulário.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Barra de progresso geral */}
                    {uploadProgress.isUploading && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900">
                            Enviando arquivos...
                          </span>
                          <span className="text-sm font-semibold text-blue-700">
                            {uploadProgress.currentFile}/{uploadProgress.totalFiles}
                          </span>
                        </div>
                        <Progress value={uploadProgress.progress} className="h-2" />
                        {uploadProgress.currentFileName && (
                          <p className="text-xs text-blue-600 mt-1 truncate">
                            {uploadProgress.currentFileName}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {formData.fichas.map((file, index) => {
                        const fileProgress = fileUploadProgress[index]
                        const isUploading = fileProgress?.status === 'uploading'
                        const isSuccess = fileProgress?.status === 'success'
                        const isError = fileProgress?.status === 'error'
                        const isPending = !fileProgress || fileProgress.status === 'pending'
                        
                        return (
                          <div key={index} className={`border rounded-lg p-4 ${
                            isUploading ? 'border-blue-300 bg-blue-50' :
                            isSuccess ? 'border-green-300 bg-green-50' :
                            isError ? 'border-red-300 bg-red-50' :
                            'border-gray-200'
                          }`}>
                          <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                {isSuccess ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                ) : isError ? (
                                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                ) : isUploading ? (
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 flex-shrink-0"></div>
                                ) : (
                                  <FileImage className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={`text-sm font-medium truncate ${
                                  isSuccess ? 'text-green-900' :
                                  isError ? 'text-red-900' :
                                  isUploading ? 'text-blue-900' :
                                  'text-gray-900'
                                }`}>
                                {file.name}
                              </span>
                            </div>
                              {!isUploading && (
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                              )}
                          </div>
                            
                            {/* Barra de progresso individual */}
                            {fileProgress && (
                              <div className="space-y-1 mb-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className={
                                    isSuccess ? 'text-green-700' :
                                    isError ? 'text-red-700' :
                                    isUploading ? 'text-blue-700' :
                                    'text-gray-600'
                                  }>
                                    {isSuccess ? '✅ Enviado' :
                                     isError ? '❌ Erro' :
                                     isUploading ? 'Enviando...' :
                                     'Aguardando...'}
                                  </span>
                                  <span className={
                                    isSuccess ? 'text-green-700 font-semibold' :
                                    isError ? 'text-red-700' :
                                    isUploading ? 'text-blue-700 font-semibold' :
                                    'text-gray-600'
                                  }>
                                    {fileProgress.progress}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      isSuccess ? 'bg-green-500' :
                                      isError ? 'bg-red-500' :
                                      isUploading ? 'bg-blue-500' :
                                      'bg-gray-300'
                                    }`}
                                    style={{ width: `${fileProgress.progress}%` }}
                                  />
                                </div>
                                {isError && fileProgress.error && (
                                  <p className="text-xs text-red-600 mt-1 truncate" title={fileProgress.error}>
                                    {fileProgress.error}
                                  </p>
                                )}
                              </div>
                            )}
                            
                          <div className="text-xs text-gray-500">
                              {formatarTamanhoArquivo(file.size)}
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
                          {(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && (
                            <div className="mt-2 flex items-center justify-center h-20 bg-gray-100 rounded">
                              <FileText className="w-8 h-8 text-gray-400" />
                              <span className="ml-2 text-xs text-gray-500">PDF</span>
                  </div>
                )}
              </div>
                        )
                      })}
                  </div>
                        </div>
                      )}
                            </div>
                          </Card>
          )}


          {/* Navigation - Mobile Optimized */}
          <div className="mt-8">
            {/* Mobile: Stacked buttons */}
            {/* Mobile: Sticky Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 z-[45] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
              <div className="flex gap-3">
                {currentSection > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCurrentSection(Math.max(0, currentSection - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 h-12 text-base font-bold rounded-xl border-2 border-gray-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                )}
                {currentSection < 3 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setCurrentSection(Math.min(3, currentSection + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`h-12 text-base font-bold rounded-xl shadow-lg shadow-teal-100 ${currentSection > 0 ? 'flex-1' : 'w-full'}`}
                  >
                    Próximo
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`h-12 text-base font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-100 ${currentSection > 0 ? 'flex-1' : 'w-full'}`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Finalizar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex justify-between items-center gap-4 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="min-w-[140px]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {currentSection === 0 ? 'Início' : `Voltar (Passo ${currentSection})`}
              </Button>

              <div className="text-xs sm:text-sm text-gray-500 font-medium text-center px-2">
                <span className="block sm:inline">Passo {currentSection + 1} de {sections.length}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline truncate">{sections[currentSection].title}</span>
              </div>

              {currentSection < 3 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentSection(Math.min(3, currentSection + 1))}
                  className="min-w-[140px]"
                >
                  Próximo (Passo {currentSection + 2})
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="min-w-[180px] bg-green-600 hover:bg-green-700"
                >
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center sm:p-4 z-[9999] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleSuccessModalClose()
            }
          }}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-8 overflow-y-auto">
              {/* Header do Modal */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Procedimento Criado com Sucesso!
                </h3>
                <p className="text-gray-600">
                  Seu procedimento foi salvo e está disponível na lista.
                </p>
              </div>

              {/* Detalhes do Procedimento */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg 
                    className="w-5 h-5 text-gray-700" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                  Detalhes do Procedimento
                </h4>
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
                        <strong className="flex items-center gap-1">
                          <svg 
                            className="w-4 h-4 text-gray-700" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                            />
                          </svg>
                          Instruções:
                        </strong> Copie o link acima e envie para o cirurgião via WhatsApp, email ou SMS. 
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
