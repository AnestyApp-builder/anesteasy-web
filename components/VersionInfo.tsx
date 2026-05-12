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
 * Também verifica automaticamente por novas versões com estratégia de Silent Update
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
          timeout: 5000,
          maxRetries: 1
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!mounted) return
        
        setVersion(data)
        
        // Verificar atualização apenas em produção
        const currentBuildId = localStorage.getItem('buildId')
        if (currentBuildId && currentBuildId !== data.buildId && process.env.NODE_ENV === 'production') {
          setHasUpdate(true)
        }
        localStorage.setItem('buildId', data.buildId)
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ version.json não encontrado:', err)
        }
      }
    }

    loadVersion()

    // Verificar por atualizações a cada 5 minutos (Apenas em Produção)
    let interval: any;
    if (process.env.NODE_ENV === 'production') {
      interval = setInterval(async () => {
        try {
          const response = await fetchWithTimeout('/version.json', {
            cache: 'no-cache',
            timeout: 5000,
            maxRetries: 1
          })
          
          if (!response.ok) return
          
          const data = await response.json()
          
          if (version && data.buildId !== version.buildId) {
            console.log('🆕 Nova versão detectada!')
            if (mounted) setHasUpdate(true)
          }
        } catch (err) {
          // Silenciar erro
        }
      }, 300000) // 5 minutos
    }

    return () => {
      mounted = false
      if (interval) clearInterval(interval)
    }
  }, [version])

  const handleReload = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
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

  // Silent Update Logic: Recarrega automaticamente apenas se for seguro
  useEffect(() => {
    if (!hasUpdate || process.env.NODE_ENV === 'development') return

    const safeToReload = () => {
      const path = window.location.pathname
      // Não recarregar se o usuário estiver em telas de formulário/edição para não perder dados
      const isFormPage = path.includes('/novo') || 
                        path.includes('/rapido') || 
                        path.includes('/editar') ||
                        path.includes('/financeiro/contas')
      return !isFormPage
    }

    if (safeToReload()) {
      console.log('🔄 [Silent Update] Aplicando nova versão silenciosamente...')
      const timeout = setTimeout(() => {
        handleReload()
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [hasUpdate])

  // Em produção com Silent Update, não renderizamos nada na tela (Totalmente silencioso)
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  // Info de versão (apenas dev para debug)
  return version && (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white p-2 rounded text-[10px] font-mono opacity-20 hover:opacity-100 transition-opacity pointer-events-none hover:pointer-events-auto">
      <div>v{version.version} | {version.buildId.substring(0, 7)}</div>
    </div>
  )
}
