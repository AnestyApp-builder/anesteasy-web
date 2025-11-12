'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/supabase'

type Notification = Tables<'notifications'>

export interface LinkRequest {
  id: string
  requestId: string
  anestesista_id: string
  anestesista_name: string
  anestesista_email: string
  created_at: string
  is_read: boolean
}

interface SecretariaNotificationsContextType {
  notifications: Notification[]
  linkRequests: LinkRequest[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

const SecretariaNotificationsContext = createContext<SecretariaNotificationsContextType | undefined>(undefined)

export function SecretariaNotificationsProvider({ children, secretariaId }: { children: ReactNode; secretariaId: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const unreadCount = notifications.filter(n => !n.is_read).length + linkRequests.filter(r => !r.is_read).length

  const loadLinkRequests = async () => {
    if (!secretariaId) {
      setLinkRequests([])
      return
    }

    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('secretaria_link_requests')
        .select(`
          id,
          anestesista_id,
          created_at,
          users (
            id,
            name,
            email
          )
        `)
        .eq('secretaria_id', secretariaId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (requestsError) {
        console.error('❌ [NOTIFICATIONS] Erro ao carregar solicitações:', requestsError)
        setLinkRequests([])
      } else {
        const formattedRequests: LinkRequest[] = (requestsData || []).map((req: any) => ({
          id: `link_request_${req.id}`, // ID único para notificação virtual
          requestId: req.id,
          anestesista_id: req.anestesista_id,
          anestesista_name: req.users?.name || 'Nome não disponível',
          anestesista_email: req.users?.email || 'Email não disponível',
          created_at: req.created_at || '',
          is_read: false // Sempre não lida até ser processada
        }))
        setLinkRequests(formattedRequests)
      }
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Erro ao carregar solicitações:', error)
      setLinkRequests([])
    }
  }

  const loadNotifications = async () => {
    if (!secretariaId) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    try {
      console.log('🔔 [NOTIFICATIONS] Carregando notificações para secretária:', secretariaId)
      
      // Carregar notificações reais
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', secretariaId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('❌ [NOTIFICATIONS] Erro ao carregar notificações:', error)
        console.error('   Detalhes:', JSON.stringify(error, null, 2))
        setNotifications([])
      } else {
        console.log('✅ [NOTIFICATIONS] Notificações carregadas:', data?.length || 0)
        console.log('   Notificações:', data)
        setNotifications(data || [])
      }

      // Carregar solicitações pendentes
      await loadLinkRequests()
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Erro ao carregar notificações:', error)
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()

    // Escutar novas notificações e solicitações em tempo real
    if (secretariaId) {
      const channel = supabase
        .channel(`notifications:${secretariaId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${secretariaId}`
          },
          () => {
            loadNotifications()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'secretaria_link_requests',
            filter: `secretaria_id=eq.${secretariaId}`
          },
          () => {
            loadLinkRequests()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [secretariaId])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

      if (!error) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!secretariaId) return

    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds)

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  const refresh = async () => {
    await loadNotifications()
  }

  return (
    <SecretariaNotificationsContext.Provider
      value={{
        notifications,
        linkRequests,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        refresh
      }}
    >
      {children}
    </SecretariaNotificationsContext.Provider>
  )
}

export function useSecretariaNotifications() {
  const context = useContext(SecretariaNotificationsContext)
  if (context === undefined) {
    throw new Error('useSecretariaNotifications must be used within SecretariaNotificationsProvider')
  }
  return context
}

