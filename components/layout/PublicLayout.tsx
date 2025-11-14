'use client'

import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

interface PublicLayoutProps {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header público simples */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="focus:outline-none">
              <Logo size="md" />
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-primary-600 hover:bg-primary-700">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Logo size="sm" className="mb-4" />
              <p className="text-sm text-gray-600">
                Plataforma de gestão profissional para anestesiologistas
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/termos" className="text-sm text-gray-600 hover:text-primary-600">
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link href="/politica-privacidade" className="text-sm text-gray-600 hover:text-primary-600">
                    Política de Privacidade
                  </Link>
                </li>
                <li>
                  <Link href="/responsabilidade" className="text-sm text-gray-600 hover:text-primary-600">
                    Responsabilidade
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Contato</h3>
              <p className="text-sm text-gray-600">
                Suporte: suporte@anesteasy.com.br
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            © {new Date().getFullYear()} AnestEasy. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}

