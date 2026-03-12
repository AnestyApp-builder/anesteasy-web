'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Stethoscope, 
  Menu, 
  X, 
  User, 
  LogOut,
  LayoutDashboard,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  Calendar,
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { supabase } from '@/lib/supabase'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Procedimentos', href: '/procedimentos', icon: FileText },
  { name: 'Agenda', href: '/agenda', icon: Calendar },
  { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  { name: 'Plano', href: '/planos', icon: CreditCard },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isSecretaria, setIsSecretaria] = useState<boolean | null>(null)

  // Verificar se é secretária quando o usuário está autenticado
  useEffect(() => {
    const checkIfSecretaria = async () => {
      if (!isAuthenticated || !user) {
        setIsSecretaria(null)
        return
      }

      try {
        // Verificar se o usuário é secretária por email
        const { data, error } = await supabase
          .from('secretarias')
          .select('id')
          .eq('email', user.email)
          .maybeSingle()
        
        setIsSecretaria(!!data && !error)
      } catch (error) {
        setIsSecretaria(false)
      }
    }

    checkIfSecretaria()
  }, [isAuthenticated, user])

  // Handler para clicar no logo
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (isAuthenticated && user) {
      // Redirecionar para o dashboard apropriado
      if (isSecretaria) {
        router.push('/secretaria/dashboard')
      } else {
        router.push('/dashboard')
      }
    } else {
      // Se não estiver logado, ir para a página inicial
      router.push('/')
    }
  }

  return (
    <nav className="bg-gradient-to-r from-teal-600 to-teal-700 border-b border-teal-800 fixed top-0 left-0 right-0 z-[9999] shadow-lg">
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
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-white hover:text-white hover:bg-teal-500/20"
                  aria-label={`Navegar para ${item.name}`}
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              ))}
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
          id="mobile-navigation"
          className="md:hidden border-t border-teal-800 bg-gradient-to-b from-teal-700 to-teal-800 animate-slide-in"
          role="menu"
          aria-label="Menu de navegação móvel"
        >
          <div className="px-4 py-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-white hover:text-white hover:bg-teal-500/20"
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
                aria-label={`Navegar para ${item.name}`}
              >
                <item.icon className="w-5 h-5" aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            ))}
            <div className="border-t border-teal-800 pt-2 mt-2">
              <div className="flex items-center space-x-3 px-3 py-2" aria-label="Perfil do usuário">
                <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-teal-200" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-white">Perfil</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-white hover:text-white hover:bg-teal-500/20"
                onClick={(e) => {
                  e.preventDefault()
                  logout()
                }}
                aria-label="Sair da conta"
              >
                <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
