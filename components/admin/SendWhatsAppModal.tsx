'use client'

import { useState } from 'react'
import { X, Send, MessageSquare, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface SendWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  targetUserId: string
  targetName: string
  targetPhone: string | null
  within24hWindow: boolean
  targetTrialDaysLeft?: number
  onMessageSent?: () => void
}

export function SendWhatsAppModal({
  isOpen,
  onClose,
  targetUserId,
  targetName,
  targetPhone,
  within24hWindow,
  targetTrialDaysLeft,
  onMessageSent,
}: SendWhatsAppModalProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; text: string } | null>(null)

  // Geração dinâmica dos templates rápidos para interpolação dos dias de free trial
  const trialText = targetTrialDaysLeft && targetTrialDaysLeft > 0 
    ? ` Você possui ${targetTrialDaysLeft} dias de free trial para explorar ao máximo todos os recursos da plataforma.`
    : ' Estamos aqui para te ajudar a aproveitar ao máximo a plataforma.'

  const quickTemplates = [
    {
      label: '👋 Boas-vindas',
      text: `Olá! Somos a equipe AnestEasy. Seja bem-vindo!${trialText} Se precisar de algo, é só nos chamar! 😊`,
    },
    {
      label: '⏰ Trial expirando',
      text: 'Olá! Notamos que seu período de teste na AnestEasy está chegando ao fim. Que tal continuar aproveitando todos os recursos? Acesse sua conta e escolha o plano ideal para você! 🚀',
    },
    {
      label: '🆘 Suporte',
      text: 'Olá! Vi que você pode estar com alguma dificuldade na plataforma. Posso te ajudar com algo? Estamos à disposição! 💪',
    },
    {
      label: '🎉 Obrigado',
      text: 'Obrigado por usar o AnestEasy! Sua confiança é muito importante para nós. Se tiver sugestões ou feedback, adoraríamos ouvir! ⭐',
    },
  ]

  const handleSend = async () => {
    if (!message.trim() || isSending) return

    setIsSending(true)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setResult({ success: false, text: 'Sessão expirada. Faça login novamente.' })
        return
      }

      const response = await fetch('/api/admin/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetUserId,
          message: message.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({ success: true, text: 'Mensagem enviada com sucesso!' })
        setMessage('')
        onMessageSent?.()
      } else {
        setResult({ success: false, text: data.error || 'Erro ao enviar mensagem' })
      }
    } catch (error: any) {
      setResult({ success: false, text: error.message || 'Erro ao enviar mensagem' })
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setMessage('')
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Enviar WhatsApp</h3>
              <p className="text-sm text-gray-500">
                Para: <span className="font-medium">{targetName}</span>
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Warning se fora da janela de 24h */}
          {!within24hWindow && (
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Janela de 24h expirada</p>
                <p className="text-amber-700 mt-0.5">
                  O cliente não interagiu com o bot recentemente. A mensagem pode não ser entregue.
                </p>
              </div>
            </div>
          )}

          {/* Sem WhatsApp Validado */}
          {!targetPhone && (
            <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">WhatsApp não validado</p>
                <p className="text-red-700 mt-0.5">
                  Este usuário ainda não vinculou ou validou o WhatsApp no aplicativo. O envio de mensagens está bloqueado.
                </p>
              </div>
            </div>
          )}

          {/* Templates rápidos */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Mensagens rápidas
            </p>
            <div className="flex flex-wrap gap-2">
              {quickTemplates.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setMessage(tmpl.text)}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-green-50 hover:text-green-700 hover:border-green-200 border border-gray-200 rounded-full transition-all"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={5}
              maxLength={4096}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {message.length}/4096
            </p>
          </div>

          {/* Result feedback */}
          {result && (
            <div className={`flex gap-3 p-3 rounded-xl ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.text}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50">
          <Button variant="outline" onClick={handleClose} size="sm">
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending || !targetPhone}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar WhatsApp
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
