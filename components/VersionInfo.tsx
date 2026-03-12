'use client'

import { useEffect, useState } from 'react'
import { fetchWithTimeout } from '@/lib/utils'

interface VersionData {
  version: string
  buildDate: string
  buildId: string
  buildTimestamp: number
  environment?: string
}

/**
 * Componente para exibir informações de versão (útil para debug)
 * Também verifica automaticamente por novas versões
 */
export function VersionInfo() {
  const [version, setVersion] = useState<VersionData | null>(null)
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    let mounted = true

    // Carregar versão inicial
    const loadVersion = async () => {
      try {
        const response = await fetchWithTimeout('/version.json', {
          cache: 'no-cache',
          timeout: 5000, // 5 segundos para version.json
          maxRetries: 1 // Apenas 1 retry para version.json
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!mounted) return
        
        setVersion(data)
        // Salvar timestamp atual no localStorage
        const currentBuildId = localStorage.getItem('buildId')
        if (currentBuildId && currentBuildId !== data.buildId) {
          setHasUpdate(true)
        }
        localStorage.setItem('buildId', data.buildId)
      } catch (err) {
        // Silenciar erro - version.json pode não existir em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ version.json não encontrado (normal em desenvolvimento):', err)
        }
      }
    }

    loadVersion()

    // Verificar por atualizações a cada 2 minutos
    const interval = setInterval(async () => {
      try {
        const response = await fetchWithTimeout('/version.json', {
          cache: 'no-cache',
          timeout: 5000,
          maxRetries: 1
        })
        
        if (!response.ok) {
          return // Ignorar se não conseguir verificar
        }
        
        const data = await response.json()
        
        if (version && data.buildId !== version.buildId) {
          console.log('🆕 Nova versão detectada!', {
            antiga: version.buildId,
            nova: data.buildId
          })
          if (mounted) {
            setHasUpdate(true)
          }
        }
      } catch (err) {
        // Silenciar erro - não crítico
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Erro ao verificar versão (não crítico):', err)
        }
      }
    }, 120000) // 2 minutos

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [version])

  const handleReload = () => {
    // Limpar cache e recarregar
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          // Desregistrar e recarregar
          registration.unregister().then(() => {
            window.location.reload()
          })
        } else {
          window.location.reload()
        }
      })
    } else {
      window.location.reload()
    }
  }

  // Não renderizar nada em produção, exceto se houver atualização
  if (process.env.NODE_ENV === 'production' && !hasUpdate) {
    return null
  }

  return (
    <>
      {/* Banner de atualização disponível */}
      {hasUpdate && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white p-4 rounded-lg shadow-xl max-w-sm animate-fade-in">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Nova versão disponível!</p>
              <p className="text-xs mt-1 opacity-90">Clique para atualizar</p>
            </div>
            <button
              onClick={handleReload}
              className="flex-shrink-0 px-3 py-1 bg-white text-emerald-600 rounded text-sm font-medium hover:bg-emerald-50 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      )}

      {/* Info de versão (apenas dev) */}
      {process.env.NODE_ENV === 'development' && version && (
        <div className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white p-3 rounded text-xs font-mono opacity-50 hover:opacity-100 transition-opacity">
          <div>v{version.version}</div>
          <div className="text-gray-400">{new Date(version.buildDate).toLocaleString('pt-BR')}</div>
          <div className="text-gray-500 text-[10px] mt-1">{version.buildId}</div>
        </div>
      )}
    </>
  )
}

