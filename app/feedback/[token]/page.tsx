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
    anemiaTransfusao: '',
    satisfacao: 5,
    comentarios: ''
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
          anemia_transfusao: formData.anemiaTransfusao === 'Sim',
          satisfacao: formData.satisfacao,
          comentarios: formData.comentarios
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
              {/* Avaliação Geral */}
              <div className="space-y-4 pb-6 border-b">
                <label className="block text-base font-semibold text-gray-800 text-center">
                  Como você avalia nossa assistência anestésica hoje?
                </label>
                <div className="flex justify-center items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, satisfacao: star }))}
                      className="focus:outline-none transition-transform active:scale-90"
                    >
                      <Star 
                        className={`w-10 h-10 ${
                          (formData.satisfacao || 0) >= star 
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-gray-300'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm font-medium text-gray-500">
                  {formData.satisfacao === 5 && 'Excelente! ⭐⭐⭐⭐⭐'}
                  {formData.satisfacao === 4 && 'Muito bom! ⭐⭐⭐⭐'}
                  {formData.satisfacao === 3 && 'Bom ⭐⭐⭐'}
                  {formData.satisfacao === 2 && 'Regular ⭐⭐'}
                  {formData.satisfacao === 1 && 'Pode melhorar ⭐'}
                </p>
              </div>

              {/* Pergunta 1 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Houve intercorrência de náuseas ou vômitos no pós-operatório imediato?
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="Sim"
                      checked={formData.nauseaVomito === 'Sim'}
                      onChange={(e) => updateFormData('nauseaVomito', e.target.value)}
                      className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">Sim</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="Não"
                      checked={formData.nauseaVomito === 'Não'}
                      onChange={(e) => updateFormData('nauseaVomito', e.target.value)}
                      className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">Não</span>
                  </label>
                </div>
              </div>

              {/* Pergunta 2 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  O paciente apresentou queixa de cefaleia?
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="Sim"
                      checked={formData.cefaleia === 'Sim'}
                      onChange={(e) => updateFormData('cefaleia', e.target.value)}
                      className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">Sim</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="Não"
                      checked={formData.cefaleia === 'Não'}
                      onChange={(e) => updateFormData('cefaleia', e.target.value)}
                      className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">Não</span>
                  </label>
                </div>
              </div>

              {/* Pergunta 3 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Ocorreu relato de dor lombar importante?
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="Sim"
                      checked={formData.dorLombar === 'Sim'}
                      onChange={(e) => updateFormData('dorLombar', e.target.value)}
                      className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">Sim</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="Não"
                      checked={formData.dorLombar === 'Não'}
                      onChange={(e) => updateFormData('dorLombar', e.target.value)}
                      className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">Não</span>
                  </label>
                </div>
              </div>

              {/* Pergunta 4 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Houve necessidade de transfusão sanguínea?
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="Sim"
                      checked={formData.anemiaTransfusao === 'Sim'}
                      onChange={(e) => updateFormData('anemiaTransfusao', e.target.value)}
                      className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">Sim</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="radio"
                      value="Não"
                      checked={formData.anemiaTransfusao === 'Não'}
                      onChange={(e) => updateFormData('anemiaTransfusao', e.target.value)}
                      className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">Não</span>
                  </label>
                </div>
              </div>

              {/* Comentários */}
              <div className="space-y-3 pt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Gostaria de deixar algum comentário ou sugestão? (Opcional)
                </label>
                <textarea
                  value={formData.comentarios}
                  onChange={(e) => setFormData(prev => ({ ...prev, comentarios: e.target.value }))}
                  placeholder="Seu feedback ajuda a melhorar nossa assistência..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[100px] text-sm"
                />
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
                  className="px-10 py-6 text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-100"
                >
                  {submitting ? 'Enviando...' : 'Finalizar e Enviar'}
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