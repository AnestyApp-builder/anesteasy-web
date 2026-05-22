'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, FileText, TrendingUp, Clock, Gift } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface WelcomeModalProps {
  userId: string
  userName: string
  trialEndsAt?: string | null
}

const STORAGE_KEY = 'welcome_v1_'

const features = [
  {
    icon: FileText,
    title: 'Registre procedimentos',
    description: 'Cadastre manualmente ou via foto — o sistema extrai os dados automaticamente.'
  },
  {
    icon: TrendingUp,
    title: 'Acompanhe seu financeiro',
    description: 'Visualize receitas, pendências e relatórios em tempo real.'
  },
  {
    icon: Clock,
    title: 'Controle de pagamentos',
    description: 'Saiba quais convênios ainda estão pendentes e evite perder cobranças.'
  }
]

/** Calcula quantos dias inteiros restam até trialEndsAt (mínimo 0) */
function calcTrialDaysLeft(trialEndsAt?: string | null): number {
  if (!trialEndsAt) return 0
  const msLeft = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
}

export function WelcomeModal({ userId, userName, trialEndsAt }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    const key = `${STORAGE_KEY}${userId}`
    const alreadySeen = localStorage.getItem(key)
    if (!alreadySeen) {
      // Pequeno delay para não competir com a animação de entrada do dashboard
      const t = setTimeout(() => setIsOpen(true), 800)
      return () => clearTimeout(t)
    }
  }, [userId])

  const handleClose = () => {
    localStorage.setItem(`${STORAGE_KEY}${userId}`, 'shown')
    setIsOpen(false)
  }

  const firstName = userName?.split(' ')[0] || 'Médico'
  const daysLeft = calcTrialDaysLeft(trialEndsAt)

  // Texto dinâmico do banner de trial
  const trialBannerText = () => {
    if (!trialEndsAt) {
      return (
        <>
          <span className="font-bold">Período gratuito</span> para explorar todos os recursos — sem precisar de cartão.
        </>
      )
    }
    if (daysLeft <= 0) {
      return (
        <>
          Seu período gratuito <span className="font-bold">terminou hoje</span>. Assine para continuar usando.
        </>
      )
    }
    return (
      <>
        <span className="font-bold">{daysLeft} {daysLeft === 1 ? 'dia grátis' : 'dias grátis'}</span> para explorar todos os recursos — sem precisar de cartão.
      </>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fechar */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho com gradiente */}
            <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 px-6 pt-8 pb-10 text-center relative overflow-hidden">
              {/* Círculos decorativos */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/10 rounded-full" />

              <div className="relative">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
                  Bem-vindo, {firstName}!
                </h2>
                <p className="text-teal-100 text-sm sm:text-base">
                  Sua conta foi criada com sucesso.
                </p>
              </div>
            </div>

            {/* Faixa de trial */}
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-center gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Gift className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-sm text-amber-800">
                {trialBannerText()}
              </p>
            </div>

            {/* Conteúdo */}
            <div className="px-6 py-5">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                O que você pode fazer agora
              </p>

              <ul className="space-y-4">
                {features.map(({ icon: Icon, title, description }) => (
                  <li key={title} className="flex items-start gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center mt-0.5">
                      <Icon className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <p className="text-sm text-gray-500 leading-snug">{description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rodapé */}
            <div className="px-6 pb-6">
              <Button
                onClick={handleClose}
                className="w-full py-3 text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/25 active:scale-[0.98] transition-all rounded-xl"
              >
                Começar agora
              </Button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Não mostramos isso novamente neste dispositivo.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
