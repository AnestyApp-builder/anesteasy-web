'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Clock, FileText, Star } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { feedbackService, FeedbackFormData } from '@/lib/feedback'
import { supabase } from '@/lib/supabase'

export default function FeedbackForm() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedbackLink, setFeedbackLink] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState<FeedbackFormData>({
    procedureId: '',
    nauseaVomito: '',
    cefaleia: '',
    dorLombar: '',
    anemiaTransfusao: ''
  })

  useEffect(() => {
    const validateToken = async () => {
      try {
        
        // Buscar o link diretamente
        const { data: linkData, error: linkError } = await supabase
          .from('feedback_links')
          .select()
          .eq('token', token)
          .single()
        
        
        if (linkError || !linkData) {
          console.error('Erro ao buscar link:', linkError)
          setError('Link inválido ou expirado.')
          return
        }
        
        // Verificar se já foi respondido
        if (linkData.responded_at) {
          console.log('Link já foi respondido em:', linkData.responded_at)
          setError('Este link já foi respondido.')
          return
        }
        
        // Verificar se expirou
        const expirationDate = new Date(linkData.expires_at)
        const now = new Date()
        
        if (expirationDate < now) {
          console.log('Link expirado. Expiração:', expirationDate, 'Agora:', now)
          setError('Este link expirou.')
          return
        }
        
        console.log('Link válido, configurando formulário')
        setFeedbackLink(linkData)
        setFormData(prev => ({ ...prev, procedureId: linkData.procedure_id }))
      } catch (error) {
        setError('Erro ao validar o link de feedback.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      validateToken()
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar se todas as perguntas foram respondidas
    if (!formData.nauseaVomito || !formData.cefaleia || !formData.dorLombar || !formData.anemiaTransfusao) {
      setError('Por favor, responda todas as perguntas.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Primeiro, validar o token novamente
      const { data: linkData, error: linkError } = await supabase
        .from('feedback_links')
        .select()
        .eq('token', token)
        .is('responded_at', null)
        .single()

      if (linkError || !linkData) {
        setError('Link inválido ou já respondido.')
        return
      }

      // Salvar as respostas
      const { error: responseError } = await supabase
        .from('feedback_responses')
        .insert({
          feedback_link_id: linkData.id,
          nausea_vomito: formData.nauseaVomito === 'Sim',
          cefaleia: formData.cefaleia === 'Sim',
          dor_lombar: formData.dorLombar === 'Sim',
          anemia_transfusao: formData.anemiaTransfusao === 'Sim'
        })

      if (responseError) {
        throw responseError
      }

      // Marcar o link como respondido
      const { error: updateError } = await supabase
        .from('feedback_links')
        .update({ responded_at: new Date().toISOString() })
        .eq('token', token)

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
    } catch (error) {
      setError('Erro ao salvar as respostas. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateFormData = (field: keyof FeedbackFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-teal-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Validando link...</p>
        </div>
      </div>
    )
  }

  if (error && !feedbackLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Link Inválido</CardTitle>
            <p className="text-gray-600 mt-2">{error}</p>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Feedback Enviado!</CardTitle>
            <p className="text-gray-600 mt-2">
              Obrigado por seu feedback. Suas respostas foram registradas com sucesso.
            </p>
            <div className="mt-6">
              <Button 
                onClick={() => window.close()}
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-teal-500 p-3 rounded-full">
              <Star className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Feedback Anestésico
          </h1>
          <p className="text-gray-600">
            Por favor, responda algumas perguntas sobre o procedimento anestésico
          </p>
        </div>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Questionário de Feedback
            </CardTitle>
          </CardHeader>
          
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pergunta 1 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  1. Náuseas ou vômitos?
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Sim"
                      checked={formData.nauseaVomito === 'Sim'}
                      onChange={(e) => updateFormData('nauseaVomito', e.target.value)}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Sim</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Não"
                      checked={formData.nauseaVomito === 'Não'}
                      onChange={(e) => updateFormData('nauseaVomito', e.target.value)}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Não</span>
                  </label>
                </div>
              </div>

              {/* Pergunta 2 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  2. Cefaleia?
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Sim"
                      checked={formData.cefaleia === 'Sim'}
                      onChange={(e) => updateFormData('cefaleia', e.target.value)}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Sim</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Não"
                      checked={formData.cefaleia === 'Não'}
                      onChange={(e) => updateFormData('cefaleia', e.target.value)}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Não</span>
                  </label>
                </div>
              </div>

              {/* Pergunta 3 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  3. Dor lombar?
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Sim"
                      checked={formData.dorLombar === 'Sim'}
                      onChange={(e) => updateFormData('dorLombar', e.target.value)}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Sim</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Não"
                      checked={formData.dorLombar === 'Não'}
                      onChange={(e) => updateFormData('dorLombar', e.target.value)}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Não</span>
                  </label>
                </div>
              </div>

              {/* Pergunta 4 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  4. Anemia com necessidade de transfusão?
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Sim"
                      checked={formData.anemiaTransfusao === 'Sim'}
                      onChange={(e) => updateFormData('anemiaTransfusao', e.target.value)}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Sim</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="Não"
                      checked={formData.anemiaTransfusao === 'Não'}
                      onChange={(e) => updateFormData('anemiaTransfusao', e.target.value)}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Não</span>
                  </label>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-8"
                >
                  {submitting ? 'Enviando...' : 'Enviar Feedback'}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Este formulário é confidencial e será usado apenas para fins médicos.</p>
        </div>
      </div>
    </div>
  )
}