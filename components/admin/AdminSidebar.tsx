'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Bug,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/suporte', label: 'Suporte (Inbox)', icon: MessageSquare },
  { href: '/admin/mensagens', label: 'Campanhas', icon: Sparkles },
  { href: '/admin/stats', label: 'Estatísticas', icon: BarChart3 },
  { href: '/admin/error-logs', label: 'Logs de Erro', icon: Bug },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch {
      window.location.href = '/'
    }
  }

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === '/admin/dashboard'
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans">
      {/* Logo Area com Gradiente Premium Teal */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800 bg-gradient-to-r from-teal-900/40 via-slate-900 to-slate-900 relative overflow-hidden">
        {/* Efeito de brilho de fundo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-cyan-400" />
        
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md shadow-teal-500/20 flex-shrink-0">
            <Logo size="sm" showText={false} className="w-6 h-6 scale-110" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold text-white tracking-tight truncate">AnestEasy</h1>
                <span className="bg-teal-500/10 text-teal-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-teal-500/20 uppercase">CRM</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-teal-400" /> Painel de Gestão
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto">
        <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-3 ${isCollapsed ? 'sr-only' : ''}`}>
          Menu Principal
        </p>

        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative
                ${active
                  ? 'bg-gradient-to-r from-teal-500/15 to-teal-500/5 text-teal-300 font-bold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }
              `}
              title={isCollapsed ? item.label : undefined}
            >
              {/* Indicador de item ativo lateral */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-teal-400 to-teal-600 rounded-r-full" />
              )}
              
              <div className={`
                p-1 rounded-lg transition-colors
                ${active ? 'text-teal-400 bg-teal-500/10' : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'}
              `}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
              </div>

              {!isCollapsed && (
                <span className="truncate tracking-wide">{item.label}</span>
              )}

              {/* Ponto de destaque sutil no hover */}
              {!active && !isCollapsed && (
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 opacity-0 group-hover:opacity-100 ml-auto transition-opacity duration-200" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-slate-900 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xs flex-shrink-0">
              ADM
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">Administrador</p>
              <p className="text-[10px] text-slate-400 truncate">Acesso Total</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
            text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-transparent
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title={isCollapsed ? 'Sair do painel' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="font-semibold tracking-wide">{isLoggingOut ? 'Saindo...' : 'Sair do Sistema'}</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Botão Mobile */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white shadow-xl hover:bg-slate-800 transition-colors"
        aria-label="Alternar menu de navegação"
      >
        {mobileOpen ? <X className="w-5 h-5 text-teal-400" /> : <Menu className="w-5 h-5 text-teal-400" />}
      </button>

      {/* Overlay Mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer Mobile */}
      <div
        className={`
          lg:hidden fixed inset-y-0 left-0 z-40 w-72 shadow-2xl transform transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent />
      </div>

      {/* Sidebar Desktop */}
      <div
        className={`
          hidden lg:flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out flex-shrink-0 relative h-full shadow-lg
          ${isCollapsed ? 'w-[72px]' : 'w-64'}
        `}
      >
        <SidebarContent />

        {/* Botão de Colapsar */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-7 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all z-20 shadow-md cursor-pointer"
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </>
  )
}
