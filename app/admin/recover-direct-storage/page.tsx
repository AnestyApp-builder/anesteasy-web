'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { directStorageRecoveryService, StorageFile, DirectRecoveryResult } from '@/lib/direct-storage-recovery'
import { AlertTriangle, CheckCircle, XCircle, HardDrive, RefreshCw, Download, Eye } from 'lucide-react'

export default function RecoverDirectStoragePage() {
  const [corruptedFiles, setCorruptedFiles] = useState<StorageFile[]>([])
  const [recoveryResults, setRecoveryResults] = useState<DirectRecoveryResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
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
      const storageStats = await directStorageRecoveryService.getStorageStats()
      setStats(storageStats)
      setCorruptedFiles(storageStats.corruptedList)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectFile = (filePath: string) => {
    setSelectedFiles(prev => 
      prev.includes(filePath) 
        ? prev.filter(path => path !== filePath)
        : [...prev, filePath]
    )
  }

  const handleSelectAll = () => {
    if (selectedFiles.length === corruptedFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(corruptedFiles.map(file => file.name))
    }
  }

  const handleRecoverSelected = async () => {
    if (selectedFiles.length === 0) return

    setIsRecovering(true)
    setShowResults(false)
    
    try {
      // Recuperar arquivos selecionados
      const results = await directStorageRecoveryService.recoverMultipleFilesDirectly(selectedFiles)
      setRecoveryResults(results)

      // Atualizar registros no banco de dados
      await directStorageRecoveryService.updateDatabaseRecords(results)

      setShowResults(true)
      
      // Recarregar dados
      await loadData()
      
      // Limpar seleção
      setSelectedFiles([])
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
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Recuperação Direta do Storage
            </h1>
          </div>
          <p className="text-gray-600">
            Esta ferramenta trabalha diretamente com o Supabase Storage para identificar e recuperar imagens corrompidas de forma mais eficiente.
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Arquivos</p>
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
                <p className="text-sm font-medium text-gray-600">Corrompidos</p>
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
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-purple-600" />
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
            <span>Atualizar Storage</span>
          </Button>

          {corruptedFiles.length > 0 && (
            <Button
              onClick={handleSelectAll}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>
                {selectedFiles.length === corruptedFiles.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </span>
            </Button>
          )}

          {selectedFiles.length > 0 && (
            <Button
              onClick={handleRecoverSelected}
              disabled={isRecovering}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              {isRecovering ? (
                <Loading />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {isRecovering ? 'Recuperando...' : `Recuperar ${selectedFiles.length} Arquivo(s)`}
              </span>
            </Button>
          )}
        </div>

        {/* Lista de Arquivos Corrompidos */}
        {corruptedFiles.length > 0 ? (
          <Card className="mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Arquivos Corrompidos no Storage
              </h2>
              <p className="text-gray-600 mt-1">
                Selecione os arquivos que deseja recuperar diretamente do storage
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {corruptedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedFiles.includes(file.name) ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                  }`}
                  onClick={() => handleSelectFile(file.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.name)}
                        onChange={() => handleSelectFile(file.name)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatFileSize(file.metadata?.size || 0)}</span>
                          <span>•</span>
                          <span className="text-red-600">
                            Atual: {file.metadata?.mimetype || 'unknown'}
                          </span>
                          <span>•</span>
                          <span className="text-green-600">
                            Esperado: {getExpectedMimeType(file.name)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                          <span>ID: {file.id}</span>
                          <span>•</span>
                          <span>Modificado: {new Date(file.updated_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Aqui você pode adicionar uma função para visualizar o arquivo
                        }}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Ver</span>
                      </Button>
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
              Nenhum arquivo corrompido encontrado!
            </h3>
            <p className="text-gray-600">
              Todos os arquivos de imagem no storage estão com o tipo MIME correto.
            </p>
          </Card>
        )}

        {/* Resultados da Recuperação */}
        {showResults && recoveryResults.length > 0 && (
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Resultados da Recuperação Direta
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {recoveryResults.map((result, index) => (
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
                          {result.originalPath.split('/').pop()}
                        </p>
                        {result.success ? (
                          <div className="text-sm text-gray-600">
                            <span className="text-green-600">✓ Recuperado</span>
                            {result.recoveredMimeType && (
                              <span className="ml-2">
                                Tipo: {result.recoveredMimeType}
                              </span>
                            )}
                            {result.fileSize && (
                              <span className="ml-2">
                                Tamanho: {formatFileSize(result.fileSize)}
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
                    
                    {result.success && result.newPath && (
                      <div className="text-sm text-gray-500">
                        <span className="text-purple-600">Novo: {result.newPath.split('/').pop()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
