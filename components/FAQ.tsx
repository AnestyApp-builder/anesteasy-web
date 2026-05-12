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
    question: 'Como funciona o cadastro de procedimento via WhatsApp?',
    answer: 'É muito simples! Você envia uma foto da ficha anestésica para o nosso bot no WhatsApp. Nossa Inteligência Artificial lê os dados (paciente, hospital, convênio, etc) e te envia um resumo para confirmação. Uma vez confirmado, o dado cai direto no seu dashboard financeiro. Zero digitação.'
  },
  {
    question: 'Os dados dos meus pacientes estão seguros?',
    answer: 'Totalmente. Seguimos rigorosamente a LGPD. Todos os dados sensíveis são criptografados com padrão bancário (AES-256). Além disso, o processamento via WhatsApp é protegido por criptografia de ponta a ponta e os dados são anonimizados em nossos servidores de análise.'
  },
  {
    question: 'Como funciona a integração com minha secretária?',
    answer: 'Você pode convidar sua secretária para a plataforma. Ela terá um acesso específico onde poderá ver apenas o necessário para realizar as cobranças e conciliações, sem acesso aos seus dados privados. É o fim das planilhas compartilhadas e mensagens perdidas.'
  },
  {
    question: 'O trial gratuito exige cartão de crédito?',
    answer: 'Não. Você pode testar todas as funcionalidades, inclusive o cadastro via WhatsApp, por 7 dias sem cadastrar nenhum cartão. Queremos que você sinta a facilidade no seu dia a dia antes de qualquer compromisso.'
  },
  {
    question: 'E se eu esquecer de cobrar algum procedimento?',
    answer: 'O AnestEasy te alerta automaticamente. No seu dashboard, mostramos uma seção de "Atrasos Graves" para itens com mais de 90 dias sem recebimento, garantindo que você nunca mais perca dinheiro por esquecimento.'
  },
  {
    question: 'Consigo exportar os dados para meu contador?',
    answer: 'Com certeza. Com um clique você gera relatórios completos em Excel ou PDF com todos os procedimentos realizados, valores recebidos e pendências por convênio ou período.'
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

