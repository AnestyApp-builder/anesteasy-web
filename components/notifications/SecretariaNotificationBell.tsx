'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { Bell, X, Check, UserCheck, UserX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { useSecretariaNotifications } from '@/contexts/SecretariaNotificationsContext'
import { LinkRequestActions } from './LinkRequestActions'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function SecretariaNotificationBell() {
  const { notifications, linkRequests, unreadCount, markAsRead, markAllAsRead, isLoading } = useSecretariaNotifications()
  const { addToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  

  const handleAcceptLink = async (requestId: string, anestesistaId?: string) => {
    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        addToast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'warning',
          duration: 5000
        })
        return
      }

      const response = await fetch('/api/secretaria/accept-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          requestId,
          anestesistaId
        })
      })

      const data = await response.json()

      if (data.success) {
        // Recarregar página para atualizar anestesistas vinculados e notificações
        if (!data.alreadyLinked) {
          window.location.reload()
        } else {
          // Recarregar apenas as notificações
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      } else {
        addToast({
          title: 'Erro ao aceitar',
          description: data.error || 'Não foi possível aceitar a vinculação. Tente novamente.',
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Erro ao aceitar vinculação:', error)
      addToast({
        title: 'Erro ao aceitar',
        description: 'Não foi possível aceitar a vinculação. Verifique sua conexão e tente novamente.',
        variant: 'error'
      })
    }
  }

  const handleRejectLink = async (requestId: string) => {
    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        addToast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'warning',
          duration: 5000
        })
        return
      }

      const response = await fetch('/api/secretaria/reject-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          requestId
        })
      })

      const data = await response.json()

      if (data.success) {
        // Recarregar notificações
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        addToast({
          title: 'Erro ao recusar',
          description: data.error || 'Não foi possível recusar a vinculação. Tente novamente.',
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Erro ao recusar vinculação:', error)
      addToast({
        title: 'Erro ao recusar',
        description: 'Não foi possível recusar a vinculação. Verifique sua conexão e tente novamente.',
        variant: 'error'
      })
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:text-white hover:bg-white/20 rounded-lg transition-colors"
        title="Notificações"
        aria-label="Notificações"
        aria-expanded={isOpen}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {!isLoading && unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-red-500 border-red-500 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] sm:max-h-96 overflow-hidden flex flex-col transform transition-all">
            <div className="p-3 sm:p-4 border-b border-teal-200 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Notificações</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs hidden sm:inline-flex"
                  >
                    Marcar todas como lidas
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Fechar notificações"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {notifications.length === 0 && linkRequests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-teal-200 [&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-teal-200">
                  {/* Solicitações de vinculação pendentes */}
                  {linkRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors ${
                        !request.is_read ? 'bg-teal-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium break-words ${
                              !request.is_read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              Solicitação de Vinculação
                            </h4>
                            {!request.is_read && (
                              <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 break-words">
                            <strong>{request.anestesista_name}</strong> ({request.anestesista_email}) deseja vincular você como secretária.
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {request.created_at && formatDistanceToNow(new Date(request.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                          
                          {/* Botões de ação */}
                          {!request.is_read && (
                            <div className="mt-3">
                              <LinkRequestActions 
                                notificationId={request.requestId}
                                anestesistaId={request.anestesista_id}
                                onAccept={(requestId) => handleAcceptLink(requestId, request.anestesista_id)}
                                onReject={(requestId) => handleRejectLink(requestId)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Notificações reais */}
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? 'bg-teal-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium break-words ${
                              !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                              )}
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 h-auto"
                                  aria-label="Marcar como lida"
                                >
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 break-words">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {notification.created_at && formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                          
                          {/* Botões de ação para solicitações de vinculação */}
                          {notification.type === 'link_request' && !notification.is_read && (
                            <div className="mt-3">
                              <LinkRequestActions 
                                notificationId={notification.id}
                                onAccept={handleAcceptLink}
                                onReject={handleRejectLink}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

