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
  Search
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
import { useSecretaria } from '@/contexts/SecretariaContext'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import UploadFicha from '@/components/UploadFicha'
import { parseFicha } from '@/utils/parseFicha'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { VoiceExtractionDisplay } from '@/components/VoiceExtractionDisplay'

interface FormData {
  nomePaciente: string
  dataProcedimento: string
  tipoProcedimento: string
  tecnicaAnestesica: string
  codigoTSSU: string
  valor: string
  statusPagamento: string
  dataPagamento: string
  secretariaId: string
}

// Lista de tipos de anestesia com códigos TSSU (igual à página de novo procedimento)
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

// ✅ Cache em memória para secretárias vinculadas
let secretariasCache: Map<string, { data: any[], timestamp: number }> = new Map()
const SECRETARIAS_CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export default function CadastroRapido() {
  const { user } = useAuth()
  const secretariaContext = useSecretaria()
  const secretaria = secretariaContext?.secretaria || null
  const { addToast } = useToast()
  const router = useRouter()
  const dateInputRef = React.useRef<HTMLInputElement>(null)

  // Debug: verificar se o componente está sendo renderizado
  useEffect(() => {
    console.log('🔍 [CADASTRO RÁPIDO] Componente renderizado', { 
      user: !!user, 
      secretaria: !!secretaria,
      hasSecretariaContext: !!secretariaContext 
    })
  }, [user, secretaria, secretariaContext])

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
    
    // Buscar match nas opções disponíveis (com códigos TSSU)
    for (const anestesia of TIPOS_ANESTESIA) {
      const nomeLower = anestesia.nome.toLowerCase()
      // Match exato ou parcial
      if (textoLower.includes(nomeLower) || nomeLower.includes(textoLower)) {
        return anestesia.nome
      }
    }
    
    // Mapeamento de variações comuns para os nomes exatos da lista
    const mapeamento: Record<string, string> = {
      'raqui': 'Raquianestesia',
      'raquianestesia': 'Raquianestesia',
      'espinhal': 'Raquianestesia',
      'subaracnóidea': 'Anestesia regional (raquianestesia)',
      'subaracnoidea': 'Anestesia regional (raquianestesia)',
      'geral': 'Anestesia geral',
      'anestesia geral': 'Anestesia geral',
      'peridural': 'Anestesia regional (peridural)',
      'epidural': 'Anestesia regional (peridural)',
      'bloqueio periférico': 'Bloqueio periférico',
      'bloqueio': 'Bloqueio periférico',
      'sedação': 'Sedação consciente',
      'sedacao': 'Sedação consciente',
      'sedação consciente': 'Sedação consciente',
      'regional': 'Anestesia regional (raquianestesia)',
      'plexo': 'Anestesia regional (bloqueio de plexo braquial)',
      'axilar': 'Bloqueio de nervos cranianos',
      'femoral': 'Bloqueio periférico',
      'local': 'Anestesia local',
      'tópica': 'Anestesia tópica',
      'topica': 'Anestesia tópica',
      'duplo bloqueio': 'Duplo bloqueio (raqui + peridural)',
      'analgesia de parto': 'Analgesia de parto',
      'analgesia pós-operatória': 'Analgesia pós-operatória',
      'monitorização': 'Monitorização anestésica',
      'acompanhamento': 'Acompanhamento anestésico',
    }
    
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
  const handleOCRExtract = async (rawText: string, confidence?: number) => {
    try {
      if (!rawText || rawText.trim().length === 0) {
        setError('⚠️ Nenhum texto foi extraído da imagem. Verifique se a imagem está clara e legível.')
        return
      }

      // Armazenar texto bruto para debug
      setOcrRawText(rawText)

      // Tentar parsear com IA primeiro
      let parsed: ReturnType<typeof parseFicha> | null = null
      let usandoIA = false
      
      try {
        console.log('🤖 [CADASTRO RÁPIDO] Tentando parse com IA...')
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
            console.log('✅ [CADASTRO RÁPIDO] Parse com IA bem-sucedido:', data.camposPreenchidos, 'campos')
          }
        }
      } catch (aiError: any) {
        console.warn('⚠️ [CADASTRO RÁPIDO] Erro ao processar com IA, usando parse tradicional:', aiError.message)
      }

      // Se IA não retornou dados suficientes, usar parse tradicional
      if (!parsed || !usandoIA) {
        console.log('📄 [CADASTRO RÁPIDO] Usando parse tradicional (regex)')
        parsed = parseFicha(rawText)
      }

      console.log('📄 [CADASTRO RÁPIDO] Dados parseados:', parsed, usandoIA ? '(IA)' : '(Regex)')

      // Preencher campos do formulário rápido
      const updates: Partial<FormData> = {}
      const camposPreenchidos: string[] = []

      // 1. Nome do paciente * (obrigatório)
      if (parsed.nome && parsed.nome.trim()) {
        updates.nomePaciente = parsed.nome.trim()
        camposPreenchidos.push('Nome do Paciente')
      }

      // 2. Data do procedimento * (obrigatório) - converter para formato ISO
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

      // 3. Tipo de procedimento * (obrigatório) - fazer match inteligente
      if (parsed.tipoProcedimento || parsed.procedimento) {
        const proced = parsed.tipoProcedimento || parsed.procedimento
        if (proced && proced.trim()) {
          const tipoMatch = matchTipoProcedimento(proced.trim())
          if (tipoMatch) {
            updates.tipoProcedimento = tipoMatch
            camposPreenchidos.push('Tipo de Procedimento')
          } else {
            // Se não encontrou match, tentar usar o valor direto se estiver na lista
            const valorDireto = TIPOS_PROCEDIMENTO.find(t => t.toLowerCase() === proced.trim().toLowerCase())
            if (valorDireto) {
              updates.tipoProcedimento = valorDireto
              camposPreenchidos.push('Tipo de Procedimento')
            }
          }
        }
      }

      // 4. Técnica anestésica * (obrigatório) - fazer match inteligente
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
          }
        }
      }

      console.log('✅ [CADASTRO RÁPIDO] Updates a serem aplicados:', updates)

      // Atualizar formulário
      setFormData(prev => ({
        ...prev,
        ...updates
      }))

      // Log no Supabase (opcional)
      if (user?.id) {
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

      // Feedback de sucesso
      const totalPreenchidos = camposPreenchidos.length
      if (totalPreenchidos > 0) {
        const mensagem = `✅ OCR processado! ${totalPreenchidos} campo(s) preenchido(s): ${camposPreenchidos.join(', ')}`
        setSuccess(mensagem)
        addToast({
          title: 'OCR Processado!',
          description: mensagem,
          variant: 'success'
        })
        
        // Limpar mensagem após 5 segundos
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError('⚠️ Nenhum campo foi encontrado no OCR. Verifique se a imagem está clara e legível, ou preencha os campos manualmente.')
      }

    } catch (error: any) {
      console.error('Erro ao processar OCR:', error)
      setError(`❌ Erro ao processar dados extraídos: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const [formData, setFormData] = useState<FormData>({
    nomePaciente: '',
    dataProcedimento: '',
    tipoProcedimento: '',
    tecnicaAnestesica: '',
    codigoTSSU: '',
    valor: '',
    statusPagamento: 'Pendente',
    dataPagamento: '',
    secretariaId: '',
  })
  const [voiceTranscription, setVoiceTranscription] = useState<string | undefined>(undefined)
  const [voiceExtractedFields, setVoiceExtractedFields] = useState<Record<string, any> | undefined>(undefined)

  const [loading, setLoading] = useState(false)


  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [secretariasVinculadas, setSecretariasVinculadas] = useState<Array<{ id: string; nome: string; email: string }>>([])
  const [ocrRawText, setOcrRawText] = useState<string>('')
  const [anestesiasFiltradas, setAnestesiasFiltradas] = useState(TIPOS_ANESTESIA)
  const [buscaAnestesia, setBuscaAnestesia] = useState('')

  // ✅ Carregar secretárias vinculadas com cache
  useEffect(() => {
    let mounted = true

    const loadSecretarias = async () => {
      if (!user?.id) {
        if (mounted) {
          setSecretariasVinculadas([])
        }
        return
      }

      try {
        // ✅ Verificar cache primeiro
        const cached = secretariasCache.get(user.id)
        if (cached && Date.now() - cached.timestamp < SECRETARIAS_CACHE_TTL) {
          console.log('📦 [CADASTRO RÁPIDO] Usando cache de secretárias')
          if (mounted) {
            setSecretariasVinculadas(cached.data)
            
            // Se houver apenas uma secretária vinculada, selecionar automaticamente
            if (cached.data.length === 1 && !formData.secretariaId) {
              setFormData(prev => ({
                ...prev,
                secretariaId: cached.data[0].id
              }))
            }
          }
          return
        }

        console.log('🔄 [CADASTRO RÁPIDO] Carregando secretárias do banco')
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

        if (!mounted) return

        if (error) {
          console.error('Erro ao carregar secretárias:', error)
          setSecretariasVinculadas([])
          return
        }

        const secretarias = (data || [])
          .map(item => item.secretarias)
          .filter(Boolean) as Array<{ id: string; nome: string; email: string }>
        
        // ✅ Salvar no cache
        secretariasCache.set(user.id, {
          data: secretarias,
          timestamp: Date.now()
        })
        
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
        if (mounted) {
          setSecretariasVinculadas([])
        }
      }
    }

    loadSecretarias()

    return () => {
      mounted = false
    }
  }, [user?.id])

  // Definir secretaria automaticamente se houver uma vinculada
  useEffect(() => {
    if (secretaria && !formData.secretariaId) {
      setFormData(prev => ({
        ...prev,
        secretariaId: secretaria.id
      }))
    }
  }, [secretaria])

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar mensagens de erro ao editar
    if (error) setError('')
  }

  // ✅ Função memoizada para filtrar anestesias
  const filtrarAnestesias = useCallback((termo: string) => {
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
  }, []) // ✅ Sem dependências - função estável

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

  // Função para validar data ISO (yyyy-mm-dd) e garantir que não seja futura
  const validateDateISO = (dateISO: string): boolean => {
    if (!dateISO) return false
    
    // Verificar formato ISO
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false
    
    const date = new Date(dateISO)
    
    // Verificar se é uma data válida
    if (isNaN(date.getTime())) return false
    
    // Não permitir datas futuras
    const today = new Date()
    today.setHours(23, 59, 59, 999) // Fim do dia de hoje
    if (date > today) {
      return false
    }
    
    return true
  }

  // Obter data máxima permitida (hoje) no formato ISO para o input date
  const getMaxDate = (): string => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Função para formatar valor monetário
  const formatValueForDisplay = (value: string) => {
    if (!value) return ''
    const numericValue = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'))
    if (isNaN(numericValue)) return value
    return formatCurrency(numericValue)
  }

  // ✅ Handler memoizado para dados extraídos por comando de voz
  const handleVoiceData = useCallback((extractedData: any, transcription?: string) => {
    try {
      console.log('🎤 [VOICE RÁPIDO] Dados recebidos:', extractedData)
      console.log('📝 [VOICE RÁPIDO] Transcrição:', transcription)
      
      // Armazenar transcrição e campos extraídos para exibição
      setVoiceTranscription(transcription)
      setVoiceExtractedFields(extractedData)
      
      // Mapear os dados extraídos para o formato do formulário
      if (extractedData.patient_name) {
        updateFormData('nomePaciente', extractedData.patient_name)
      }
      if (extractedData.procedure_date) {
        updateFormData('dataProcedimento', extractedData.procedure_date)
      }
      
      // Tipo do procedimento - usar o NOME do procedimento (ex: "Cesariana")
      // Prioridade: procedure_name > procedure_type
      if (extractedData.procedure_name) {
        const tipoMatchado = matchTipoProcedimento(extractedData.procedure_name)
        if (tipoMatchado) {
          updateFormData('tipoProcedimento', tipoMatchado)
        } else {
          updateFormData('tipoProcedimento', extractedData.procedure_name)
        }
      } else if (extractedData.procedure_type) {
        const tipoMatchado = matchTipoProcedimento(extractedData.procedure_type)
        if (tipoMatchado) {
          updateFormData('tipoProcedimento', tipoMatchado)
        } else {
          updateFormData('tipoProcedimento', extractedData.procedure_type)
        }
      }
      if (extractedData.tecnica_anestesica) {
        updateFormData('tecnicaAnestesica', extractedData.tecnica_anestesica)
        // Tentar encontrar código TSSU correspondente
        const anestesia = TIPOS_ANESTESIA.find(a => 
          a.nome.toLowerCase() === extractedData.tecnica_anestesica.toLowerCase()
        )
        if (anestesia) {
          updateFormData('codigoTSSU', anestesia.codigo)
        }
      }
      if (extractedData.procedure_value) {
        updateFormData('valor', String(extractedData.procedure_value))
      }
      if (extractedData.payment_status) {
        const statusMap: Record<string, string> = {
          'pending': 'Pendente',
          'paid': 'Pago',
          'cancelled': 'Cancelado'
        }
        updateFormData('statusPagamento', statusMap[extractedData.payment_status] || extractedData.payment_status)
      }
      
      addToast('success', '✅ Dados extraídos do comando de voz com sucesso!')
    } catch (error: any) {
      console.error('❌ [VOICE RÁPIDO] Erro:', error)
      addToast('error', `❌ Erro ao processar comando de voz: ${error.message || 'Erro desconhecido'}`)
    }
  }, [addToast]) // ✅ Memoizado com dependência de addToast

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validação dos campos obrigatórios
    const camposObrigatorios = {
      'Nome do Paciente': formData.nomePaciente,
      'Data do Procedimento': formData.dataProcedimento,
      'Tipo do Procedimento': formData.tipoProcedimento,
      'Técnica Anestésica': formData.tecnicaAnestesica,
    }

    const camposVazios = Object.entries(camposObrigatorios)
      .filter(([_, value]) => !value || value.trim() === '')
      .map(([nome, _]) => nome)

    if (camposVazios.length > 0) {
      setError(`Por favor, preencha os seguintes campos obrigatórios: ${camposVazios.join(', ')}`)
      return
    }

    // Validar formato da data
    if (!validateDateISO(formData.dataProcedimento)) {
      if (formData.dataProcedimento) {
        const date = new Date(formData.dataProcedimento)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        
        if (date > today) {
          setError('Não é possível cadastrar procedimentos com data futura. Por favor, selecione uma data válida até hoje.')
        } else {
          setError('Data inválida. Por favor, selecione uma data válida.')
        }
      } else {
        setError('Por favor, selecione a data do procedimento.')
      }
      return
    }

    if (!user?.id) {
      setError('Usuário não autenticado. Por favor, faça login novamente.')
      return
    }

    setLoading(true)

    try {
      // Converter valor para número
      const valorNumerico = formData.valor 
        ? parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.'))
        : 0

      // Converter status de pagamento
      const paymentStatus = formData.statusPagamento === 'Pago' 
        ? 'paid' 
        : formData.statusPagamento === 'Cancelado'
        ? 'cancelled'
        : 'pending'

      // A data já está no formato ISO (yyyy-mm-dd) do input type="date"
      const dataISO = formData.dataProcedimento
      
      if (!dataISO || !validateDateISO(dataISO)) {
        setError('Data inválida. Por favor, selecione uma data válida.')
        setLoading(false)
        return
      }

      // Preparar dados do procedimento
      const procedureData = {
        user_id: user.id,
        patient_name: formData.nomePaciente,
        procedure_date: dataISO, // Usar data convertida para ISO
        procedure_type: formData.tipoProcedimento,
        procedure_name: formData.tipoProcedimento,
        tecnica_anestesica: formData.tecnicaAnestesica,
        codigo_tssu: formData.codigoTSSU && formData.codigoTSSU.trim() !== '' ? formData.codigoTSSU : undefined,
        procedure_value: valorNumerico || undefined,
        payment_status: paymentStatus,
        payment_date: formData.statusPagamento === 'Pago' && formData.dataPagamento ? formData.dataPagamento : undefined,
        forma_pagamento: 'Aguardando',
        secretaria_id: formData.secretariaId && formData.secretariaId.trim() !== '' ? formData.secretariaId : undefined,
        data_nascimento: undefined, // Campo opcional - undefined para cadastro rápido
        anesthesiologist_name: user.name || undefined, // Adicionar nome do anestesista
      }

      console.log('📝 [CADASTRO RÁPIDO] Tentando criar procedimento com dados:', {
        patient_name: procedureData.patient_name,
        procedure_date: procedureData.procedure_date,
        procedure_type: procedureData.procedure_type,
        user_id: procedureData.user_id,
        hasSecretaria: !!procedureData.secretaria_id
      })

      const result = await procedureService.createProcedure(procedureData)

      if (!result) {
        console.error('❌ [CADASTRO RÁPIDO] Falha ao criar procedimento. Verifique os logs do console (F12) para detalhes.')
        setError('Erro ao criar procedimento. Verifique sua conexão e tente novamente. Se o problema persistir, abra o console do navegador (F12) para ver mais detalhes. Possíveis causas: sessão expirada, problema de permissão ou campos obrigatórios faltando.')
        return
      }


      setSuccess('Procedimento cadastrado com sucesso!')
      addToast({
        title: 'Sucesso!',
        description: 'Procedimento cadastrado rapidamente.',
        variant: 'success'
      })

      // Redirecionar após 1 segundo
      setTimeout(() => {
        router.push('/procedimentos')
      }, 1000)
    } catch (err: any) {
      console.error('❌ [CADASTRO RÁPIDO] Erro ao criar procedimento:', err)
      console.error('   Tipo:', err?.constructor?.name)
      console.error('   Mensagem:', err?.message)
      console.error('   Stack:', err?.stack)
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Erro ao criar procedimento. Tente novamente.'
      
      if (err?.message) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Erro de conexão: Verifique sua internet e tente novamente.'
        } else if (err.message.includes('auth') || err.message.includes('permission') || err.message.includes('session')) {
          errorMessage = 'Erro de autenticação: Sua sessão expirou. Por favor, faça login novamente.'
        } else if (err.message.includes('timeout') || err.message.includes('Timeout')) {
          errorMessage = 'A operação demorou muito. Verifique sua conexão e tente novamente.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Cadastro Rápido de Procedimento</h1>
            <p className="text-gray-600 mt-2">Preencha os campos essenciais para cadastrar um procedimento rapidamente.</p>
          </div>

          {/* Alertas */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Dados do Procedimento</CardTitle>
              </CardHeader>
              
              <div className="p-6 space-y-6">
                {/* Opções de Preenchimento Automático */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preenchimento Automático (Opcional)</span>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Voice Recorder */}
                    <VoiceRecorder 
                      compact
                      onTranscriptionComplete={handleVoiceData}
                      onError={(error) => addToast('error', error)}
                    />

                    {/* OCR - Upload de Ficha */}
                    <UploadFicha
                      onExtract={handleOCRExtract}
                      onError={(error) => setError(`Erro no OCR: ${error}`)}
                    />
                  </div>
                </div>

                {/* Exibição dos dados extraídos */}
                {voiceTranscription || voiceExtractedFields ? (
                  <div>
                    <VoiceExtractionDisplay
                      transcription={voiceTranscription}
                      extractedFields={voiceExtractedFields}
                      onClose={() => {
                        setVoiceTranscription(undefined)
                        setVoiceExtractedFields(undefined)
                      }}
                    />
                  </div>
                ) : null}

                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px flex-1 bg-gray-200"></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ou preencha manualmente</span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>
                {/* Nome do Paciente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Paciente <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.nomePaciente}
                    onChange={(e) => updateFormData('nomePaciente', e.target.value)}
                    placeholder="Digite o nome do paciente"
                    required
                    className="w-full"
                  />
                </div>

                {/* Data do Procedimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do Procedimento <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      ref={dateInputRef}
                      type="date"
                      value={formData.dataProcedimento}
                      onChange={(e) => {
                        const value = e.target.value
                        updateFormData('dataProcedimento', value)
                        // Limpar erro ao selecionar uma data
                        if (error) setError('')
                      }}
                      onKeyDown={(e) => {
                        // Bloquear completamente a digitação manual
                        // Permitir apenas teclas de navegação e Escape
                        const allowedKeys = [
                          'Tab', 'Escape',
                          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                          'Home', 'End'
                        ]
                        
                        // Bloquear todas as outras teclas, incluindo números, letras e caracteres especiais
                        if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault()
                          e.stopPropagation()
                        }
                      }}
                      onPaste={(e) => {
                        // Prevenir colagem de texto manual
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onInput={(e) => {
                        // Prevenir qualquer digitação manual
                        const target = e.target as HTMLInputElement
                        // Se tentar digitar, reverter para o valor anterior
                        if (target.value !== formData.dataProcedimento) {
                          // Verificar se é uma mudança válida do calendário (formato ISO)
                          if (!/^\d{4}-\d{2}-\d{2}$/.test(target.value)) {
                            target.value = formData.dataProcedimento
                          }
                        }
                      }}
                      onClick={(e) => {
                        // Quando clicar no campo, tentar abrir o calendário
                        if (dateInputRef.current && dateInputRef.current.showPicker) {
                          e.preventDefault()
                          dateInputRef.current.showPicker()
                        }
                      }}
                      onFocus={(e) => {
                        // Quando focar, tentar abrir o calendário automaticamente
                        if (dateInputRef.current && dateInputRef.current.showPicker) {
                          e.preventDefault()
                          dateInputRef.current.showPicker()
                        }
                      }}
                      onBlur={(e) => {
                        // Validar data ao sair do campo
                        const value = e.target.value
                        if (value && !validateDateISO(value)) {
                          const date = new Date(value)
                          const today = new Date()
                          today.setHours(23, 59, 59, 999)
                          
                          if (date > today) {
                            setError('Não é possível cadastrar procedimentos com data futura.')
                          } else {
                            setError('Data inválida. Por favor, selecione uma data válida.')
                          }
                        } else if (value) {
                          // Limpar erro se a data estiver válida
                          setError('')
                        }
                      }}
                      max={getMaxDate()}
                      required
                      className="w-full cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        if (dateInputRef.current) {
                          if (dateInputRef.current.showPicker) {
                            dateInputRef.current.showPicker()
                          } else {
                            dateInputRef.current.focus()
                            dateInputRef.current.click()
                          }
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer z-10"
                      aria-label="Abrir calendário"
                    >
                      <Calendar className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Clique no ícone de calendário ou no campo para selecionar a data. Não é possível digitar manualmente.
                  </p>
                </div>

                {/* Tipo do Procedimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo do Procedimento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipoProcedimento}
                    onChange={(e) => updateFormData('tipoProcedimento', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Selecione o tipo de procedimento</option>
                    {TIPOS_PROCEDIMENTO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Técnica Anestésica */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Técnica Anestésica <span className="text-red-500">*</span>
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

                {/* Valor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor do Procedimento
                  </label>
                  <Input
                    type="text"
                    value={formData.valor}
                    onChange={(e) => {
                      const value = e.target.value
                      // Permitir apenas números, vírgula e ponto
                      const numericValue = value.replace(/[^\d,]/g, '')
                      updateFormData('valor', numericValue)
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      if (value) {
                        const formatted = formatValueForDisplay(value)
                        updateFormData('valor', formatted.replace(/[^\d,]/g, ''))
                      }
                    }}
                    placeholder="R$ 0,00"
                    className="w-full"
                  />
                </div>

                {/* Status do Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status do Pagamento
                  </label>
                  <select
                    value={formData.statusPagamento}
                    onChange={(e) => updateFormData('statusPagamento', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {STATUS_PAGAMENTO.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data do Pagamento - aparece apenas quando status é "Pago" */}
                {formData.statusPagamento === 'Pago' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data do Pagamento
                    </label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={formData.dataPagamento}
                        onChange={(e) => updateFormData('dataPagamento', e.target.value)}
                        max={getMaxDate()}
                        className="w-full cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement
                          if (input && input.showPicker) {
                            input.showPicker()
                          } else {
                            input.focus()
                            input.click()
                          }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer z-10"
                        aria-label="Abrir calendário"
                      >
                        <Calendar className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Secretária */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secretária Vinculada
                  </label>
                  <select
                    value={formData.secretariaId}
                    onChange={(e) => updateFormData('secretariaId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Nenhuma secretária</option>
                    {secretariasVinculadas.map((secretaria) => (
                      <option key={secretaria.id} value={secretaria.id}>
                        {secretaria.nome} ({secretaria.email})
                      </option>
                    ))}
                  </select>
                  {secretariasVinculadas.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Nenhuma secretária vinculada. <Link href="/configuracoes" className="text-teal-600 hover:text-teal-700">Vincular secretária</Link>
                    </p>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-end">
                <Link href="/dashboard">
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Procedimento
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </div>

      </Layout>
    </ProtectedRoute>
  )
}

