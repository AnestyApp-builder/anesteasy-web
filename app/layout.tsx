import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/contexts/ToastContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { WorkspaceProvider } from '@/contexts/WorkspaceContext'
import { NotificationsProvider } from '@/contexts/NotificationsContext'
import { DeferredVersionInfo } from '@/components/DeferredVersionInfo'
import { Toaster } from '@/components/ui/Toaster'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { Suspense } from 'react'
import FacebookPixel from '@/components/analytics/FacebookPixel'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AnestEasy - Gestão Financeira para Anestesistas',
  description: 'Sistema completo de gestão financeira e procedimentos para anestesistas',
  keywords: 'anestesiologia, gestão financeira, procedimentos médicos, CRM',
  authors: [{ name: 'AnestEasy Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo-anesteasy.png', sizes: 'any', type: 'image/png' },
    ],
    shortcut: '/icon-192.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AnestEasy',
    startupImage: '/apple-splash-2048-2732.png',
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
  maximumScale: 5, // Permitir zoom para acessibilidade (WCAG)
  userScalable: true, // Permitir zoom para acessibilidade
  themeColor: '#14b8a6',
  viewportFit: 'cover', // Suporte para safe areas do iPhone X+
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <link rel="canonical" href="https://anesteasy.com" />
        {/* Cache otimizado - permite cache para recursos estáticos, mas força revalidação para HTML */}
        <meta httpEquiv="Cache-Control" content="public, max-age=3600, must-revalidate" />
        
        {/* PWA e Mobile - Meta tags para iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AnestEasy" />
        <meta name="theme-color" content="#14b8a6" />
        <meta name="msapplication-TileColor" content="#14b8a6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        
        {/* Splash screens para diferentes tamanhos de iPhone */}
        <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/apple-splash-1290-2796.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/apple-splash-1179-2556.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/apple-splash-1284-2778.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/apple-splash-1170-2532.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/apple-splash-1125-2436.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/apple-splash-1242-2688.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/apple-splash-828-1792.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/apple-splash-750-1334.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/apple-splash-2048-2732.png" />
      </head>
      <body
        className={`h-full font-sans antialiased ${inter.className}`}
        style={{ backgroundColor: '#f1f5f9' }}
      >
        <AuthProvider>
          <WorkspaceProvider>
            <NotificationsProvider>
              <ToastProvider>
                {children}
                <Toaster />
                <ServiceWorkerRegister />
                <DeferredVersionInfo />
                <Suspense fallback={null}>
                  <FacebookPixel />
                </Suspense>
              </ToastProvider>
            </NotificationsProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
