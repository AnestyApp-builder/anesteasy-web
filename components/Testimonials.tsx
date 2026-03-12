'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Star } from 'lucide-react'

interface Testimonial {
  id: string
  name: string
  city: string
  role: string
  result: string
  resultValue: string
  quote: string
  initials?: string
  useInitials?: boolean
}

// ⚠️ ATENÇÃO: Estes são exemplos de ESTRUTURA
// Substituir por depoimentos REAIS antes de ativar na página
const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Dr. [Nome Real]',
    city: '[Cidade]',
    role: 'Anestesiologista',
    result: 'R$ 4.200',
    resultValue: 'recuperados no 1º mês',
    quote: '[Depoimento real do usuário sobre como identificou procedimentos não cobrados]',
    useInitials: true,
    initials: 'DR'
  },
  {
    id: '2',
    name: 'Dra. [Nome Real]',
    city: '[Cidade]',
    role: 'Anestesiologista',
    result: '8 horas/mês',
    resultValue: 'economizadas',
    quote: '[Depoimento real sobre economia de tempo com planilhas]',
    useInitials: true,
    initials: 'DR'
  },
  {
    id: '3',
    name: 'Dr. [Nome Real]',
    city: '[Cidade]',
    role: 'Anestesiologista',
    result: '3 hospitais',
    resultValue: 'gerenciados',
    quote: '[Depoimento real sobre gestão de múltiplos hospitais]',
    useInitials: true,
    initials: 'DR'
  }
]

interface TestimonialsProps {
  /** Se false, não renderiza nada (use enquanto não tiver depoimentos reais) */
  enabled?: boolean
}

export function Testimonials({ enabled = false }: TestimonialsProps) {
  // Não renderizar até ter depoimentos reais
  if (!enabled) {
    return null
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            O Que Anestesiologistas Estão Dizendo
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Médicos que já usam o AnesteAsy compartilham como a plataforma transformou 
            a gestão dos seus procedimentos
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial) => (
            <Card 
              key={testimonial.id}
              className="border-2 border-emerald-100 hover:border-emerald-300 transition-all hover:shadow-xl"
            >
              <CardContent className="p-6">
                {/* Header com Avatar e Info */}
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg flex-shrink-0">
                    {testimonial.initials || testimonial.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <div className="font-semibold text-slate-900">
                      {testimonial.useInitials 
                        ? `${testimonial.initials || 'Dr.'} - ${testimonial.city}`
                        : testimonial.name
                      }
                    </div>
                    <div className="text-sm text-slate-600">{testimonial.role}</div>
                  </div>
                </div>

                {/* Avaliação */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Resultado Destaque */}
                <div className="mb-3">
                  <span className="text-2xl font-bold text-emerald-600">
                    {testimonial.result}
                  </span>
                  <span className="text-slate-600 text-sm ml-2">
                    {testimonial.resultValue}
                  </span>
                </div>

                {/* Depoimento */}
                <p className="text-slate-700 italic leading-relaxed">
                  "{testimonial.quote}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Badge de Credibilidade */}
        <div className="text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-8 bg-slate-50 px-8 py-6 rounded-2xl">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">[XX]+</div>
              <div className="text-sm text-slate-600">Anestesiologistas ativos</div>
            </div>
            <div className="h-12 w-px bg-slate-300 hidden sm:block"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">R$ [X]M+</div>
              <div className="text-sm text-slate-600">Gerenciados na plataforma</div>
            </div>
            <div className="h-12 w-px bg-slate-300 hidden sm:block"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">4.8/5</div>
              <div className="text-sm text-slate-600">Avaliação média</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link href="/register">
            <Button 
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 text-lg font-semibold shadow-lg"
            >
              Junte-se a Eles - Teste Grátis por 7 Dias
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// INSTRUÇÕES PARA USO:
// ============================================================================
// 
// 1. COLETAR DEPOIMENTOS REAIS:
//    - Enviar email para usuários ativos (template em PROXIMAS_ACOES_CONVERSAO.md)
//    - Pedir: nome (ou iniciais), cidade, resultado específico, depoimento
//    - Oferecer 1 mês grátis em troca
//
// 2. ATUALIZAR O ARRAY testimonials:
//    - Substituir os placeholders [Nome Real], [Cidade], etc.
//    - Usar depoimentos verdadeiros palavra por palavra
//    - Pedir permissão explícita para publicar
//
// 3. ATIVAR NA PÁGINA:
//    import { Testimonials } from '@/components/Testimonials'
//    
//    // Adicionar DEPOIS da seção de Preços, ANTES da Tabela Comparativa
//    <Testimonials enabled={true} />
//
// 4. NUNCA:
//    - Inventar depoimentos
//    - Usar nomes fictícios
//    - Exagerar resultados
//    - Publicar sem permissão
//
// ============================================================================

