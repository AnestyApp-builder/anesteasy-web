'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

interface FAQItem {
  question: string
  answer: string
}

const faqItems: FAQItem[] = [
  {
    question: 'Como funciona a integração com secretária?',
    answer: 'Você convida sua secretária por email. Ela cria uma conta gratuita (secretárias não pagam) e pode visualizar, cadastrar e confirmar procedimentos. Você recebe notificações de todas as alterações que ela fizer. Tudo fica registrado e rastreável.'
  },
  {
    question: 'Posso ter múltiplas secretárias ou trabalhar em vários hospitais?',
    answer: 'Sim! Você pode vincular quantas secretárias precisar e organizar procedimentos por hospital, convênio ou qualquer critério que faça sentido para você. Não há limite de procedimentos ou hospitais.'
  },
  {
    question: 'Como funciona o trial gratuito? Preciso cadastrar cartão?',
    answer: 'O trial é 100% gratuito por 7 dias. NÃO precisa cadastrar cartão de crédito. Você testa tudo sem compromisso. Só pedimos pagamento se decidir continuar após o trial.'
  },
  {
    question: 'Posso exportar meus dados? E se eu quiser cancelar?',
    answer: 'Sim! Você pode exportar todos os seus dados em Excel ou PDF a qualquer momento. Se cancelar, seus dados ficam disponíveis por 90 dias para download. Não há multa ou taxa de cancelamento.'
  },
  {
    question: 'Os dados são seguros? Tem LGPD?',
    answer: 'Sim! Temos criptografia de nível bancário, backup automático diário e estamos 100% em conformidade com a LGPD. Dados de pacientes são anonimizados e você tem controle total sobre quem acessa o quê.'
  },
  {
    question: 'Tem app mobile ou só funciona no computador?',
    answer: 'Atualmente funciona perfeitamente no navegador mobile (responsivo). App nativo para iOS e Android está no roadmap para os próximos meses. Você pode adicionar à tela inicial do celular e usar como app.'
  },
  {
    question: 'Quanto tempo leva para cadastrar um procedimento?',
    answer: 'Menos de 30 segundos. Campos principais: paciente (iniciais), hospital, convênio, valor e data. Depois você pode adicionar mais detalhes se quiser. O sistema aprende seus padrões e sugere valores automaticamente.'
  }
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-xl text-slate-600">
            Respostas para as dúvidas mais comuns de anestesiologistas
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <Card 
              key={index} 
              className="border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer"
              onClick={() => toggleFAQ(index)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-900 flex-1 flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{item.question}</span>
                  </h3>
                  <button 
                    className="flex-shrink-0 text-emerald-600 hover:text-emerald-700 transition-colors"
                    aria-label={openIndex === index ? 'Fechar resposta' : 'Abrir resposta'}
                  >
                    {openIndex === index ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {openIndex === index && (
                  <p className="text-slate-700 mt-4 leading-relaxed">
                    {item.answer}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA após FAQ */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">
            Ainda tem dúvidas?
          </p>
          <a 
            href="mailto:contato@anesteasy.com" 
            className="text-emerald-600 hover:text-emerald-700 font-semibold underline"
          >
            Entre em contato conosco
          </a>
        </div>
      </div>
    </section>
  )
}

