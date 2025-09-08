import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AnestEasy - Gestão Financeira para Anestesistas',
  description: 'Sistema completo de gestão financeira e procedimentos para anestesistas',
  keywords: 'anestesiologia, gestão financeira, procedimentos médicos, CRM',
  authors: [{ name: 'AnestEasy Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
