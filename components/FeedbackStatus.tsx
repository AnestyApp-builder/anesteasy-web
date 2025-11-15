'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertCircle, CheckCircle, Clock, Mail, RefreshCw } from 'lucide-react'
import { feedbackService } from '@/lib/feedback'

interface FeedbackStatusProps {
  procedureId: string
}

export function FeedbackStatus({ procedureId }: FeedbackStatusProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<{
    linkCriado: boolean
    linkExpirado: boolean
    respondido: boolean
    emailCirurgiao?: string
    dataEnvio?: string
    dataResposta?: string
  } | null>(null)
  const [feedback, setFeedback] = useState<{
    nauseaVomito: string
    cefaleia: string
    dorLombar: string
    anemiaTransfusao: string
    respondidoEm?: string
  } | null>(null)

  const loadFeedbackData = async () => {
    setLoading(true)
    try {
      const [statusData, feedbackData] = await Promise.all([
        feedbackService.getFeedbackStatus(procedureId),
        feedbackService.getFeedbackByProcedureId(procedureId)
      ])
      setStatus(statusData)
      setFeedback(feedbackData)
    } catch (error) {
      setError('Erro ao carregar dados do feedback')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeedbackData()
  }, [procedureId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Carregando Feedback...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            Erro ao carregar feedback
          </CardTitle>
        </CardHeader>
        <div className="p-6">
          <p className="text-gray-600">{error}</p>
        </div>
      </Card>
    )
  }

  if (!status?.linkCriado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Feedback não solicitado
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {status.respondido ? (
            <>
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Feedback Respondido
            </>
          ) : status.linkExpirado ? (
            <>
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Link Expirado
            </>
          ) : (
            <>
              <Clock className="w-5 h-5 mr-2 text-yellow-600" />
              Aguardando Resposta
            </>
          )}
        </CardTitle>
      </CardHeader>
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Email do Cirurgião: {status.emailCirurgiao}
          </p>
          <p className="text-sm text-gray-600">
            Data de Envio: {new Date(status.dataEnvio!).toLocaleDateString()}
          </p>
          {status.dataResposta && (
            <p className="text-sm text-gray-600">
              Data da Resposta: {new Date(status.dataResposta).toLocaleDateString()}
            </p>
          )}
        </div>

        {feedback && (
          <div className="space-y-4 border-t border-teal-500 pt-4">
            <h3 className="text-lg font-medium">Respostas do Cirurgião</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Náuseas ou Vômitos?</p>
                <p className={`text-sm ${feedback.nauseaVomito === 'Sim' ? 'text-red-600' : 'text-green-600'}`}>
                  {feedback.nauseaVomito}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Cefaleia?</p>
                <p className={`text-sm ${feedback.cefaleia === 'Sim' ? 'text-red-600' : 'text-green-600'}`}>
                  {feedback.cefaleia}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Dor Lombar?</p>
                <p className={`text-sm ${feedback.dorLombar === 'Sim' ? 'text-red-600' : 'text-green-600'}`}>
                  {feedback.dorLombar}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Anemia com necessidade de transfusão?</p>
                <p className={`text-sm ${feedback.anemiaTransfusao === 'Sim' ? 'text-red-600' : 'text-green-600'}`}>
                  {feedback.anemiaTransfusao}
                </p>
              </div>
            </div>
          </div>
        )}

        {!status.respondido && !status.linkExpirado && (
          <div className="text-sm text-gray-600">
            <p>O cirurgião ainda não respondeu ao feedback.</p>
            <p>O link expira em {new Date(status.dataEnvio!).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
