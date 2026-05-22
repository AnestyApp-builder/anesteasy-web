'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  updated_at?: string
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadNotifications: number
  isLoading: boolean
  refreshNotifications: () => Promise<void>
  markNotificationAsRead: (notificationId: string) => Promise<void>
  markAllNotificationsAsRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

// Cache de notificações com TTL de 30 segundos
const NOTIFICATIONS_CACHE_TTL = 30000
let notificationsCache: {
  data: Notification[]
  timestamp: number
  userId: string
} | null = null

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const unreadNotifications = notifications.filter(n => !n.is_read).length

  // Carregar notificações com cache
  const loadNotifications = async (forceRefresh = false) => {
    if (!user) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    try {
      const now = Date.now()

      // Verificar cache se não for refresh forçado
      if (
        !forceRefresh &&
        notificationsCache &&
        notificationsCache.userId === user.id &&
        now - notificationsCache.timestamp < NOTIFICATIONS_CACHE_TTL
      ) {
        setNotifications(notificationsCache.data)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar notificações:', error)
        setNotifications([])
      } else {
        const notificationsData = data || []
        setNotifications(notificationsData)

        // Atualizar cache
        notificationsCache = {
          data: notificationsData,
          timestamp: now,
          userId: user.id,
        }
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  // Marcar notificação como lida (remove da lista, pois lista só exibe não lidas)
  const markNotificationAsRead = React.useCallback(async (notificationId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (!error) {
        // Remover da lista local imediatamente
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        // Invalidar cache para o próximo refresh buscar dados frescos
        notificationsCache = null
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }, [])

  // Marcar todas como lidas (limpa a lista inteira)
  const markAllNotificationsAsRead = React.useCallback(async (): Promise<void> => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds)

      if (!error) {
        // Limpar lista local imediatamente
        setNotifications([])
        // Invalidar cache
        notificationsCache = null
      }
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error)
    }
  }, [notifications])

  // Atualizar notificações (forçar refresh)
  const refreshNotifications = React.useCallback(async (): Promise<void> => {
    await loadNotifications(true)
  }, [user])

  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      loadNotifications()
    } else {
      setNotifications([])
      setIsLoading(false)
    }
  }, [user])

  // Atualizar notificações a cada 30 segundos
  useEffect(() => {
    if (!user) return
    
    // Configurar assinatura em tempo real para novas notificações
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Adicionar nova notificação ao início da lista
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          
          // Tocar som de notificação (opcional)
          try {
            const audio = new Audio('/notification.mp3')
            audio.play().catch(() => {})
          } catch (e) {}
        }
      )
      .subscribe()

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [user])

  const value = React.useMemo(() => ({
    notifications,
    unreadNotifications,
    isLoading,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  }), [notifications, unreadNotifications, isLoading, refreshNotifications, markNotificationAsRead, markAllNotificationsAsRead])

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationsProvider')
  }
  return context
}
