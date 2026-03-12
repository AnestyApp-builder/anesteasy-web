'use client'

import React from 'react'
import { Navigation } from './Navigation'
import { PageTransition } from '@/components/ui/PageTransition'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen user-area-bg">
      <Navigation />
      {/* Espaçamento para compensar o Navigation fixo */}
      <div className="h-16"></div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  )
}
