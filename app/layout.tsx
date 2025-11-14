import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SecretariaProvider } from '@/contexts/SecretariaContext'
import { VersionInfo } from '@/components/VersionInfo'

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
        {/* Cache Busting Meta Tags */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('[SW] Registrado com sucesso:', registration.scope);
                      
                      // Verificar por atualizações a cada 30 segundos
                      setInterval(() => {
                        registration.update();
                      }, 30000);
                      
                      // Detectar quando há uma nova versão esperando
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nova versão disponível!
                            console.log('[SW] Nova versão disponível! Recarregando...');
                            window.location.reload();
                          }
                        });
                      });
                    },
                    function(err) {
                      console.log('[SW] Falha ao registrar:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className="h-full font-sans antialiased">
        <AuthProvider>
          <SecretariaProvider>
            {children}
            <VersionInfo />
          </SecretariaProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
