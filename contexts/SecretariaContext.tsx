'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { secretariaService, type Secretaria, type Notification } from '@/lib/secretarias'
import { useAuth } from './AuthContext'

interface SecretariaContextType {
  secretaria: Secretaria | null
  notifications: Notification[]
  unreadNotifications: number
  isLoading: boolean
  linkSecretaria: (email: string, nome?: string, telefone?: string) => Promise<boolean>
  unlinkSecretaria: () => Promise<boolean>
  refreshSecretaria: () => Promise<void>
  refreshNotifications: () => Promise<void>
  markNotificationAsRead: (notificationId: string) => Promise<void>
  markAllNotificationsAsRead: () => Promise<void>
}

const SecretariaContext = createContext<SecretariaContextType | undefined>(undefined)

export function SecretariaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [secretaria, setSecretaria] = useState<Secretaria | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const unreadNotifications = notifications.filter(n => !n.is_read).length

  // Carregar secretaria vinculada
  const loadSecretaria = async () => {
    if (!user) {
      setSecretaria(null)
      setIsLoading(false)
      return
    }

    try {
      const secretariaData = await secretariaService.getSecretariaByAnestesista(user.id)
      setSecretaria(secretariaData)
    } catch (error) {
      console.error('Erro ao carregar secretaria:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar notificações
  const loadNotifications = async () => {
    if (!user) return

    try {
      const notificationsData = await secretariaService.getNotifications(user.id)
      setNotifications(notificationsData)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    }
  }

  // Vincular secretaria
  const linkSecretaria = async (email: string, nome?: string, telefone?: string): Promise<boolean> => {
    if (!user) return false

    try {
      setIsLoading(true)
      const result = await secretariaService.createOrLinkSecretaria(user.id, email, nome, telefone)
      
      if (result) {
        setSecretaria(result.secretaria)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Erro ao vincular secretaria:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Desvincular secretaria
  const unlinkSecretaria = async (): Promise<boolean> => {
    if (!user || !secretaria) return false

    try {
      setIsLoading(true)
      const success = await secretariaService.unlinkSecretaria(user.id, secretaria.id)
      
      if (success) {
        setSecretaria(null)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Erro ao desvincular secretaria:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Atualizar dados da secretaria
  const refreshSecretaria = async (): Promise<void> => {
    await loadSecretaria()
  }

  // Atualizar notificações
  const refreshNotifications = async (): Promise<void> => {
    await loadNotifications()
  }

  // Marcar notificação como lida
  const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    try {
      const success = await secretariaService.markNotificationAsRead(notificationId)
      if (success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        )
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  // Marcar todas as notificações como lidas
  const markAllNotificationsAsRead = async (): Promise<void> => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      await Promise.all(unreadIds.map(id => secretariaService.markNotificationAsRead(id)))
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error)
    }
  }

  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      loadSecretaria()
      loadNotifications()
    } else {
      setSecretaria(null)
      setNotifications([])
      setIsLoading(false)
    }
  }, [user])

  // Atualizar notificações a cada 30 segundos
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [user])

  const value: SecretariaContextType = {
    secretaria,
    notifications,
    unreadNotifications,
    isLoading,
    linkSecretaria,
    unlinkSecretaria,
    refreshSecretaria,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
  }

  return (
    <SecretariaContext.Provider value={value}>
      {children}
    </SecretariaContext.Provider>
  )
}

export function useSecretaria() {
  const context = useContext(SecretariaContext)
  if (context === undefined) {
    throw new Error('useSecretaria deve ser usado dentro de um SecretariaProvider')
  }
  return context
}
