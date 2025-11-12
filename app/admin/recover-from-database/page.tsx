'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { databaseRecoveryService, DatabaseAttachment, DatabaseRecoveryResult } from '@/lib/database-recovery'
import { AlertTriangle, CheckCircle, XCircle, Database, FileImage, RefreshCw } from 'lucide-react'

export default function RecoverFromDatabasePage() {
  const [attachments, setAttachments] = useState<DatabaseAttachment[]>([])
  const [corruptedAttachments, setCorruptedAttachments] = useState<DatabaseAttachment[]>([])
  const [recoveryResults, setRecoveryResults] = useState<DatabaseRecoveryResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    corrupted: 0,
    healthy: 0
  })

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Carregar estatísticas
      const attachmentStats = await databaseRecoveryService.getAttachmentStats()
      setStats(attachmentStats)
      setCorruptedAttachments(attachmentStats.corruptedList)

      // Carregar todos os anexos para referência
      const allAttachments = await databaseRecoveryService.findImageAttachments()
      setAttachments(allAttachments)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAttachment = (attachmentId: string) => {
    setSelectedAttachments(prev => 
      prev.includes(attachmentId) 
        ? prev.filter(id => id !== attachmentId)
        : [...prev, attachmentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedAttachments.length === corruptedAttachments.length) {
      setSelectedAttachments([])
    } else {
      setSelectedAttachments(corruptedAttachments.map(att => att.id))
    }
  }

  const handleRecoverSelected = async () => {
    if (selectedAttachments.length === 0) return

    setIsRecovering(true)
    setShowResults(false)
    
    try {
      // Filtrar anexos selecionados
      const attachmentsToRecover = corruptedAttachments.filter(att => 
        selectedAttachments.includes(att.id)
      )

      // Recuperar anexos selecionados
      const results = await databaseRecoveryService.recoverMultipleAttachments(attachmentsToRecover)
      setRecoveryResults(results)

      setShowResults(true)
      
      // Recarregar dados
      await loadData()
      
      // Limpar seleção
      setSelectedAttachments([])
    } catch (error) {
      console.error('Erro durante recuperação:', error)
    } finally {
      setIsRecovering(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getSuccessCount = () => {
    return recoveryResults.filter(r => r.success).length
  }

  const getErrorCount = () => {
    return recoveryResults.filter(r => !r.success).length
  }

  const getExpectedMimeType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop()
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'gif':
        return 'image/gif'
      case 'webp':
        return 'image/webp'
      case 'bmp':
        return 'image/bmp'
      default:
        return 'image/jpeg'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Recuperação Baseada no Banco de Dados
            </h1>
          </div>
          <p className="text-gray-600">
            Esta ferramenta identifica e recupera imagens corrompidas baseando-se nos registros da tabela procedure_attachments.
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FileImage className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Imagens</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Corrompidas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.corrupted}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Saudáveis</p>
                <p className="text-2xl font-bold text-gray-900">{stats.healthy}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recuperados</p>
                <p className="text-2xl font-bold text-gray-900">{getSuccessCount()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button
            onClick={loadData}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar Dados</span>
          </Button>

          {corruptedAttachments.length > 0 && (
            <Button
              onClick={handleSelectAll}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>
                {selectedAttachments.length === corruptedAttachments.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </span>
            </Button>
          )}

          {selectedAttachments.length > 0 && (
            <Button
              onClick={handleRecoverSelected}
              disabled={isRecovering}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              {isRecovering ? (
                <Loading />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span>
                {isRecovering ? 'Recuperando...' : `Recuperar ${selectedAttachments.length} Anexo(s)`}
              </span>
            </Button>
          )}
        </div>

        {/* Lista de Anexos Corrompidos */}
        {corruptedAttachments.length > 0 ? (
          <Card className="mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Anexos Corrompidos Encontrados
              </h2>
              <p className="text-gray-600 mt-1">
                Selecione os anexos que deseja recuperar
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {corruptedAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedAttachments.includes(attachment.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleSelectAttachment(attachment.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedAttachments.includes(attachment.id)}
                        onChange={() => handleSelectAttachment(attachment.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">{attachment.file_name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <span>•</span>
                          <span className="text-red-600">
                            Atual: {attachment.file_type}
                          </span>
                          <span>•</span>
                          <span className="text-green-600">
                            Esperado: {getExpectedMimeType(attachment.file_name)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          ID: {attachment.id} • Procedimento: {attachment.procedure_id}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {attachment.created_at ? new Date(attachment.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum anexo corrompido encontrado!
            </h3>
            <p className="text-gray-600">
              Todos os anexos de imagem estão com o tipo MIME correto.
            </p>
          </Card>
        )}

        {/* Resultados da Recuperação */}
        {showResults && recoveryResults.length > 0 && (
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Resultados da Recuperação
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {recoveryResults.map((result, index) => {
                const attachment = corruptedAttachments.find(att => att.id === result.attachmentId)
                return (
                  <div key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          result.success ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-900">
                            {attachment?.file_name || result.attachmentId}
                          </p>
                          {result.success ? (
                            <div className="text-sm text-gray-600">
                              <span className="text-green-600">✓ Recuperado</span>
                              {result.recoveredMimeType && (
                                <span className="ml-2">
                                  Tipo: {result.recoveredMimeType}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-red-600">
                              Erro: {result.error}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {result.success && result.newUrl && (
                        <div className="text-sm text-gray-500">
                          <a 
                            href={result.newUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Ver arquivo
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
