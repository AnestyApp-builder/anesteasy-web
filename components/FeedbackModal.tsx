'use client'

import React, { useState } from 'react'
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [suggestion, setSuggestion] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { user } = useAuth()
  const { addToast } = useToast()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suggestion.trim()) return

    setIsSending(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion,
          userName: user?.name,
          email: user?.email
        }),
      })

      const data = await response.json()

      if (data.success) {
        addToast({
          title: 'Sugestão enviada!',
          description: 'Obrigado por nos ajudar a crescer. Sua ideia foi encaminhada!',
          variant: 'success'
        })
        setSuggestion('')
        onClose()
      } else {
        addToast({
          title: 'Erro ao enviar',
          description: 'Não conseguimos processar sua sugestão agora. Tente mais tarde.',
          variant: 'error'
        })
      }
    } catch (error) {
      addToast({
        title: 'Erro técnico',
        description: 'Ocorreu uma falha na conexão. Tente novamente.',
        variant: 'error'
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative">
        {/* Header */}
        <div className="bg-teal-600 p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Sugerir Melhoria</h3>
              <p className="text-teal-100 text-xs">Sua ideia pode virar a próxima funcionalidade!</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              O que poderíamos melhorar no AnestEasy?
            </label>
            <textarea
              autoFocus
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Descreva sua ideia aqui... (ex: 'Gostaria de ver um gráfico de faturamento por convênio')"
              className="w-full h-40 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none text-gray-700 placeholder:text-gray-400"
              disabled={isSending}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-gray-400 leading-tight flex-1">
              * Sua sugestão será enviada diretamente para a equipe de desenvolvimento.
            </p>
            <Button
              type="submit"
              disabled={isSending || !suggestion.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-teal-600/20"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Sugestão
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
