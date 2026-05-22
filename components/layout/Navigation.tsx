'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { 
  Menu, X, User, LogOut, LayoutDashboard, FileText, 
  DollarSign, BarChart3, Settings, Calendar, 
  CreditCard, MessageSquarePlus, Sparkles,
  Stethoscope, HelpCircle, Users
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { procedureService } from '@/lib/procedures'
import { supabase } from '@/lib/supabase'
import { FeedbackModal } from '@/components/FeedbackModal'
import { trackLead } from '@/lib/analytics'

// Navigation items memoized inside the component

export const Navigation = React.memo(function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { user, logout, isAuthenticated } = useAuth()
  const { workspaceType, currentGroupId, userGroups, setWorkspace } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [sentCount, setSentCount] = useState(0)
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false)
  const workspaceDropdownRef = useRef<HTMLDivElement>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

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
      if (
        showWorkspaceDropdown &&
        workspaceDropdownRef.current &&
        !workspaceDropdownRef.current.contains(event.target as Node)
      ) {
        setShowWorkspaceDropdown(false)
      }
      if (
        showUserMenu &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileMenuOpen])

  const navigationItems = React.useMemo(() => {
    if (workspaceType === 'personal') {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Procedimentos', href: '/procedimentos', icon: FileText },
        { name: 'Agenda', href: '/agenda', icon: Calendar },
        { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
        { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
      ]
    } else {
      // Group context
      return [
        { name: 'Agenda', href: `/grupos/${currentGroupId}?tab=agenda`, icon: Calendar },
        { name: 'Escalas', href: `/grupos/${currentGroupId}?tab=shifts`, icon: Calendar },
        { name: 'Membros', href: `/grupos/${currentGroupId}?tab=members`, icon: Users },
        { name: 'Financeiro', href: `/grupos/${currentGroupId}?tab=finance`, icon: DollarSign },
        { name: 'Procedimentos', href: `/grupos/${currentGroupId}?tab=procedures`, icon: FileText },
      ]
    }
  }, [workspaceType, currentGroupId])

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
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogoClick}
              className="no-underline focus:outline-none cursor-pointer bg-transparent border-none p-0 shrink-0"
              aria-label={isAuthenticated ? 'Ir para o dashboard' : 'Ir para a página inicial'}
            >
              <Logo size="sm" className="sm:hidden" showText={false} />
              <Logo size="md" className="hidden sm:flex" />
            </button>

            {/* Context Switcher Dropdown */}
            {isAuthenticated && (
              <div className="relative" ref={workspaceDropdownRef}>
                <button
                  onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-teal-700/50 hover:bg-teal-700 transition-colors border border-teal-500/30 group max-w-[140px] sm:max-w-none"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
                    {workspaceType === 'personal' ? (
                      <User className="w-4 h-4 text-teal-100" />
                    ) : (
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: userGroups.find(g => g.id === currentGroupId)?.color || '#14b8a6' }} 
                      />
                    )}
                    <span className="text-sm font-bold text-white max-w-[120px] truncate">
                      {workspaceType === 'personal' 
                        ? 'Conta Pessoal' 
                        : userGroups.find(g => g.id === currentGroupId)?.name || 'Grupo'
                      }
                    </span>
                  </div>
                  <div className="w-4 h-4 text-teal-300 opacity-70 group-hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </button>

                {showWorkspaceDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 pb-2 mb-2 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conta</span>
                      <button
                        onClick={() => {
                          setWorkspace('personal')
                          setShowWorkspaceDropdown(false)
                          router.push('/dashboard')
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors mt-1",
                          workspaceType === 'personal' ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-600 hover:bg-slate-50 font-medium"
                        )}
                      >
                        <User className="w-4 h-4" /> Conta Pessoal
                      </button>
                    </div>

                    <div className="px-3 py-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meus Grupos</span>
                        <Link 
                          href="/grupos"
                          onClick={() => setShowWorkspaceDropdown(false)}
                          className="text-[10px] text-teal-600 font-bold hover:underline"
                        >
                          Gerenciar
                        </Link>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {userGroups.length === 0 ? (
                          <p className="text-xs text-slate-400 italic px-2 py-1">Nenhum grupo.</p>
                        ) : (
                          userGroups.map(group => (
                            <button
                              key={group.id}
                              onClick={() => {
                                setWorkspace('group', group.id)
                                setShowWorkspaceDropdown(false)
                                router.push(`/grupos/${group.id}`)
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors text-left truncate",
                                workspaceType === 'group' && currentGroupId === group.id 
                                  ? "bg-teal-50 text-teal-700 font-bold" 
                                  : "text-slate-600 hover:bg-slate-50 font-medium"
                              )}
                            >
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                              <span className="truncate">{group.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden lg:flex flex-1 justify-center items-center space-x-1 xl:space-x-4 px-2">
              {navigationItems.map((item) => {
                const isActive = workspaceType === 'group' 
                  ? searchParams.get('tab') === new URLSearchParams(item.href.split('?')[1]).get('tab') || (item.name === 'Agenda' && !searchParams.get('tab'))
                  : pathname === item.href || (item.href === '/dashboard' && pathname === '/')
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-1 px-2 py-1.5 xl:px-3 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-all duration-200 whitespace-nowrap",
                      isActive 
                        ? "bg-white text-teal-700 shadow-sm" 
                        : "text-white hover:bg-white/10"
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* User Menu */}
          {isAuthenticated ? (
            <div className="hidden lg:flex items-center space-x-2 xl:space-x-3 shrink-0">
              {/* Botão de Sugestão Desktop - Mais compacto agora */}
              <button
                onClick={() => setFeedbackModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 text-teal-600 bg-white hover:bg-teal-50 shadow-sm border border-transparent"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Sugerir</span>
              </button>

              <div className="h-6 w-px bg-white/20 mx-1" />
              
              <NotificationBell />
              
              <div className="relative" ref={userMenuRef}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20 flex items-center justify-center w-9 h-9 min-h-0 border border-white/10 rounded-full p-0"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 pb-2 mb-2 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ajustes da Conta</span>
                    </div>
                    {workspaceType === 'personal' ? (
                      <>
                        <Link href="/planos" onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium">
                          <CreditCard className="w-4 h-4" /> Plano
                        </Link>
                        <Link href="/configuracoes" onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium">
                          <Settings className="w-4 h-4" /> Configurações
                        </Link>
                        <Link href="/tutorial" onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium">
                          <HelpCircle className="w-4 h-4" /> Ajuda
                        </Link>
                      </>
                    ) : (
                      <Link href={`/grupos/${currentGroupId}?tab=settings`} onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium">
                        <Settings className="w-4 h-4" /> Ajustes do Grupo
                      </Link>
                    )}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button 
                        onClick={(e) => {
                          e.preventDefault()
                          setShowUserMenu(false)
                          logout()
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold"
                      >
                        <LogOut className="w-4 h-4" /> Sair da Conta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex items-center space-x-2 sm:space-x-4 shrink-0">
              <Link href="/como-funciona">
                <Button variant="ghost" className="text-white hover:text-emerald-300 hover:bg-white/10 font-medium">
                  Como funciona
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:text-emerald-300 hover:bg-white/20 font-medium">
                  Entrar
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-xl shadow-emerald-600/30 font-semibold" onClick={trackLead}>
                  Começar Grátis
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2 shrink-0">
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
          className="lg:hidden border-t border-teal-700/30 bg-teal-700/95 backdrop-blur-lg animate-in slide-in-from-top duration-300 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="menu"
          aria-label="Menu de navegação móvel"
        >
          <div className="px-4 py-2 space-y-1">
            {isAuthenticated ? (
              <>
                {navigationItems.map((item) => {
                  const isActive = workspaceType === 'group' 
                    ? searchParams.get('tab') === new URLSearchParams(item.href.split('?')[1]).get('tab') || (item.name === 'Agenda' && !searchParams.get('tab'))
                    : pathname === item.href || (item.href === '/dashboard' && pathname === '/')

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                        isActive 
                          ? "bg-white text-teal-700" 
                          : "text-white hover:text-white hover:bg-teal-500/20"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                      role="menuitem"
                      aria-label={`Navegar para ${item.name}`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className={cn("w-5 h-5", isActive ? "text-teal-600" : "text-teal-200")} aria-hidden="true" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  )
                })}

                {/* Botão de Sugestão Mobile */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setFeedbackModalOpen(true)
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 mt-2"
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquarePlus className="w-5 h-5" />
                    <span>Sugerir Melhoria</span>
                  </div>
                  <Sparkles className="w-4 h-4" />
                </button>
                <div className="border-t border-teal-500/30 pt-1 mt-1">
                  <div className="flex items-center space-x-3 px-3 py-2" aria-label="Perfil do usuário">
                    <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-teal-100" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">Minha Conta</span>
                      <span className="text-xs text-teal-200">{user?.email}</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-white hover:bg-red-500/20 hover:text-red-200 py-2 h-auto"
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
              </>
            ) : (
              <>
                <Link
                  href="/como-funciona"
                  className="block px-3 py-3 rounded-lg text-sm font-bold text-white hover:bg-teal-500/20"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Como funciona
                </Link>
                <Link
                  href="/login"
                  className="block px-3 py-3 rounded-lg text-sm font-bold text-white hover:bg-teal-500/20"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="block px-3 py-3 rounded-lg text-sm font-bold text-emerald-300 hover:bg-teal-500/20"
                  onClick={() => {
                    trackLead()
                    setMobileMenuOpen(false)
                  }}
                >
                  Começar Grátis
                </Link>
              </>
            )}
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
