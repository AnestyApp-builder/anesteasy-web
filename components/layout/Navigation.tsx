'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Menu, X, User, LogOut, LayoutDashboard, FileText, 
  DollarSign, BarChart3, Settings, Calendar, 
  CreditCard, MessageSquarePlus, Sparkles,
  Stethoscope
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { procedureService } from '@/lib/procedures'
import { supabase } from '@/lib/supabase'
import { FeedbackModal } from '@/components/FeedbackModal'

// Navigation items memoized inside the component

export const Navigation = React.memo(function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const [sentCount, setSentCount] = useState(0)

  const fetchSentCount = useCallback(async () => {
    if (user?.id) {
      const count = await procedureService.getSentProceduresCount(user.id)
      setSentCount(count)
    }
  }, [user?.id])

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchSentCount()

      // Inscrição em tempo real para mudanças nos procedimentos
      const channel = supabase
        .channel('procedures_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'procedures',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchSentCount()
          }
        )
        .subscribe()

      // Listener para eventos manuais de atualização (opcional)
      window.addEventListener('procedureUpdated', fetchSentCount)

      return () => {
        supabase.removeChannel(channel)
        window.removeEventListener('procedureUpdated', fetchSentCount)
      }
    }
  }, [isAuthenticated, user?.id, fetchSentCount])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuOpen && 
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileMenuOpen])

  const navigationItems = React.useMemo(() => [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Procedimentos', href: '/procedimentos', icon: FileText },
    { name: 'Agenda', href: '/agenda', icon: Calendar },
    { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
    { name: 'Plano', href: '/planos', icon: CreditCard },
    { name: 'Configurações', href: '/configuracoes', icon: Settings },
  ], [])

  // Handler para clicar no logo
  const handleLogoClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (isAuthenticated && user) {
      router.push('/dashboard')
    } else {
      router.push('/')
    }
  }, [isAuthenticated, user, router])

  return (
    <>
      <nav className="bg-teal-600/90 backdrop-blur-md border-b border-teal-700/50 fixed top-0 left-0 right-0 z-[9999] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={handleLogoClick}
              className="no-underline focus:outline-none cursor-pointer bg-transparent border-none p-0"
              aria-label={isAuthenticated ? 'Ir para o dashboard' : 'Ir para a página inicial'}
            >
              <Logo size="md" />
            </button>
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-white hover:text-white hover:bg-teal-500/20 relative"
                  aria-label={`Navegar para ${item.name}`}
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              ))}
              
              {/* Botão de Sugestão Desktop */}
              <button
                onClick={() => setFeedbackModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 text-teal-500 bg-white hover:bg-teal-50 border border-white shadow-sm"
              >
                <MessageSquarePlus className="w-4 h-4 text-teal-600" />
                <span>Sugerir</span>
              </button>
            </div>
          )}

          {/* User Menu */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center space-x-4">
              <NotificationBell />
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center" aria-label="Perfil do usuário">
                <User className="w-4 h-4 text-primary-600" aria-hidden="true" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.preventDefault()
                  logout()
                }}
                aria-label="Sair da conta"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Cadastrar</Button>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {isAuthenticated && (
              <div className="flex items-center">
                <NotificationBell />
              </div>
            )}
            <Button
              ref={buttonRef}
              variant="ghost"
              size="sm"
              className="text-white hover:text-white hover:bg-teal-500/20"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div 
          ref={menuRef}
          id="mobile-navigation"
          className="md:hidden border-t border-teal-700/30 bg-teal-700/95 backdrop-blur-lg animate-in slide-in-from-top duration-300 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="menu"
          aria-label="Menu de navegação móvel"
        >
          <div className="px-4 py-2 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-white hover:text-white hover:bg-teal-500/20"
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
                aria-label={`Navegar para ${item.name}`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5 text-teal-200" aria-hidden="true" />
                  <span className="font-semibold">{item.name}</span>
                </div>
              </Link>
            ))}

            {/* Botão de Sugestão Mobile */}
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                setFeedbackModalOpen(true)
              }}
              className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-bold transition-all duration-200 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 mt-4"
            >
              <div className="flex items-center space-x-3">
                <MessageSquarePlus className="w-5 h-5" />
                <span>Sugerir Melhoria</span>
              </div>
              <Sparkles className="w-4 h-4" />
            </button>
            <div className="border-t border-teal-500/30 pt-2 mt-2">
              <div className="flex items-center space-x-3 px-3 py-3" aria-label="Perfil do usuário">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-teal-100" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">Minha Conta</span>
                  <span className="text-xs text-teal-200">{user?.email}</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-white hover:bg-red-500/20 hover:text-red-200 py-6"
                onClick={(e) => {
                  e.preventDefault()
                  logout()
                }}
                aria-label="Sair da conta"
              >
                <LogOut className="w-5 h-5 mr-3" aria-hidden="true" />
                <span className="font-bold">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      </nav>
      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={feedbackModalOpen} 
        onClose={() => setFeedbackModalOpen(false)} 
      />
    </>
  )
})
