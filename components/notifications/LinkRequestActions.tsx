'use client'

import { useState, useEffect } from 'react'
import { UserCheck, UserX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface LinkRequestActionsProps {
  notificationId: string // Pode ser requestId ou notificationId
  onAccept: (requestId: string, anestesistaId?: string) => Promise<void>
  onReject: (requestId: string) => Promise<void>
  anestesistaId?: string // Opcional: se já tiver o ID do anestesista
}

export function LinkRequestActions({ notificationId, onAccept, onReject, anestesistaId: providedAnestesistaId }: LinkRequestActionsProps) {
  const [anestesistaId, setAnestesistaId] = useState<string | null>(providedAnestesistaId || null)
  const [isLoading, setIsLoading] = useState(!providedAnestesistaId)

  useEffect(() => {
    // Se já tiver o anestesistaId fornecido, não precisa buscar
    if (providedAnestesistaId) {
      setAnestesistaId(providedAnestesistaId)
      setIsLoading(false)
      return
    }

    // Tentar buscar pelo requestId (se notificationId for um requestId)
    const fetchRequestData = async () => {
      try {
        // Primeiro tentar buscar diretamente pelo ID (pode ser requestId)
        const { data, error } = await supabase
          .from('secretaria_link_requests')
          .select('anestesista_id')
          .eq('id', notificationId)
          .eq('status', 'pending')
          .maybeSingle()

        if (!error && data) {
          setAnestesistaId(data.anestesista_id)
          setIsLoading(false)
          return
        }

        // Se não encontrou, tentar buscar por notification_id
        const { data: dataByNotification, error: errorByNotification } = await supabase
          .from('secretaria_link_requests')
          .select('anestesista_id')
          .eq('notification_id', notificationId)
          .eq('status', 'pending')
          .maybeSingle()

        if (!errorByNotification && dataByNotification) {
          setAnestesistaId(dataByNotification.anestesista_id)
        }
      } catch (error) {
        console.error('Erro ao buscar dados da solicitação:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequestData()
  }, [notificationId, providedAnestesistaId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center mt-3">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
      <Button
        size="sm"
        onClick={() => onAccept(notificationId, anestesistaId || undefined)}
        className="text-xs bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
      >
        <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
        Aceitar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onReject(notificationId)}
        className="text-xs w-full sm:w-auto"
      >
        <UserX className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
        Recusar
      </Button>
    </div>
  )
}

