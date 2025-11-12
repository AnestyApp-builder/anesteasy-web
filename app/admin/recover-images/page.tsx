'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { imageRecoveryService, CorruptedFile, RecoveryResult } from '@/lib/image-recovery'
import { AlertTriangle, CheckCircle, XCircle, Download, RefreshCw, Trash2 } from 'lucide-react'

export default function RecoverImagesPage() {
  const [corruptedFiles, setCorruptedFiles] = useState<CorruptedFile[]>([])
  const [recoveryResults, setRecoveryResults] = useState<RecoveryResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)

  // Carregar arquivos corrompidos ao montar o componente
  useEffect(() => {
    loadCorruptedFiles()
  }, [])

  const loadCorruptedFiles = async () => {
    setIsLoading(true)
    try {
      const files = await imageRecoveryService.findCorruptedFiles()
      setCorruptedFiles(files)
    } catch (error) {
      console.error('Erro ao carregar arquivos corrompidos:', error)
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
      setSelectedFiles(corruptedFiles.map(file => file.path))
    }
  }

  const handleRecoverSelected = async () => {
    if (selectedFiles.length === 0) return

    setIsRecovering(true)
    setShowResults(false)
    
    try {
      // Recuperar arquivos selecionados
      const results = await imageRecoveryService.recoverMultipleFiles(selectedFiles)
      setRecoveryResults(results)

      // Atualizar registros no banco de dados
      await imageRecoveryService.updateDatabaseRecords(results)

      // Remover arquivos originais (opcional - comentado por segurança)
      // await imageRecoveryService.removeOriginalFiles(results)

      setShowResults(true)
      
      // Recarregar lista de arquivos corrompidos
      await loadCorruptedFiles()
      
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
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Recuperação de Imagens Corrompidas
            </h1>
          </div>
          <p className="text-gray-600">
            Esta ferramenta identifica e recupera imagens que foram armazenadas com tipo MIME incorreto.
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Arquivos Corrompidos</p>
                <p className="text-2xl font-bold text-gray-900">{corruptedFiles.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recuperados</p>
                <p className="text-2xl font-bold text-gray-900">{getSuccessCount()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Com Erro</p>
                <p className="text-2xl font-bold text-gray-900">{getErrorCount()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button
            onClick={loadCorruptedFiles}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar Lista</span>
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
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700"
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
                Arquivos Corrompidos Encontrados
              </h2>
              <p className="text-gray-600 mt-1">
                Selecione os arquivos que deseja recuperar
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {corruptedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedFiles.includes(file.path) ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                  }`}
                  onClick={() => handleSelectFile(file.path)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.path)}
                        onChange={() => handleSelectFile(file.path)}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span className="text-red-600">
                            Atual: {file.currentMimeType}
                          </span>
                          <span>•</span>
                          <span className="text-green-600">
                            Esperado: {file.expectedMimeType}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {new Date(file.lastModified).toLocaleDateString('pt-BR')}
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
              Todas as imagens estão com o tipo MIME correto.
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
                        Novo: {result.newPath.split('/').pop()}
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
