'use client'

import { SecretariaAuthProvider } from '@/contexts/SecretariaAuthContext'

export default function SecretariaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SecretariaAuthProvider>
      {children}
    </SecretariaAuthProvider>
  )
}
