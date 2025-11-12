'use client'

import { useState, useEffect } from 'react'
import { UserCheck, UserX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface LinkRequestActionsProps {
  notificationId: string
  onAccept: (notificationId: string, anestesistaId: string) => Promise<void>
  onReject: (notificationId: string) => Promise<void>
}

export function LinkRequestActions({ notificationId, onAccept, onReject }: LinkRequestActionsProps) {
  const [anestesistaId, setAnestesistaId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRequestData = async () => {
      try {
        const { data, error } = await supabase
          .from('secretaria_link_requests')
          .select('anestesista_id')
          .eq('notification_id', notificationId)
          .eq('status', 'pending')
          .single()

        if (!error && data) {
          setAnestesistaId(data.anestesista_id)
        }
      } catch (error) {
        console.error('Erro ao buscar dados da solicitação:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequestData()
  }, [notificationId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center mt-3">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!anestesistaId) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
      <Button
        size="sm"
        onClick={() => onAccept(notificationId, anestesistaId)}
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

