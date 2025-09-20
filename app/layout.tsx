import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SecretariaProvider } from '@/contexts/SecretariaContext'

export const metadata: Metadata = {
  title: 'AnestEasy - Gestão Financeira para Anestesistas',
  description: 'Sistema completo de gestão financeira e procedimentos para anestesistas',
  keywords: 'anestesiologia, gestão financeira, procedimentos médicos, CRM',
  authors: [{ name: 'AnestEasy Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AnestEasy',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://anesteasy.com',
    title: 'AnestEasy - Gestão Financeira para Anestesistas',
    description: 'Sistema completo de gestão financeira e procedimentos para anestesistas',
    siteName: 'AnestEasy',
  },
  twitter: {
    card: 'summary',
    title: 'AnestEasy - Gestão Financeira para Anestesistas',
    description: 'Sistema completo de gestão financeira e procedimentos para anestesistas',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#14b8a6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full font-sans antialiased">
        <AuthProvider>
          <SecretariaProvider>
            {children}
          </SecretariaProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
