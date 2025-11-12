'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/supabase'

type Notification = Tables<'notifications'>

interface SecretariaNotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

const SecretariaNotificationsContext = createContext<SecretariaNotificationsContextType | undefined>(undefined)

export function SecretariaNotificationsProvider({ children, secretariaId }: { children: ReactNode; secretariaId: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const loadNotifications = async () => {
    if (!secretariaId) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    try {
      console.log('🔔 [NOTIFICATIONS] Carregando notificações para secretária:', secretariaId)
      
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
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Erro ao carregar notificações:', error)
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()

    // Escutar novas notificações em tempo real
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

