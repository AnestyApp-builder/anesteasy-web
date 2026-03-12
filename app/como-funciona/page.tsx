'use client'

import Link from 'next/link'
import { 
  AlertTriangle,
  Clock,
  FileText,
  DollarSign,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header alinhado com a home */}
      <header className="backdrop-blur-lg border-b border-white/30 sticky top-0 z-50 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Logo size="sm" showText={false} />
            <span className="font-semibold text-white text-sm sm:text-base">
              AnestEasy
            </span>
          </Link>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-white hover:text-emerald-300 hover:bg-white/20 border border-white/40 min-h-[40px] px-3 sm:px-4 text-xs sm:text-sm font-medium"
              >
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="text-xs sm:text-sm px-3 sm:px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-xl shadow-emerald-600/30 min-h-[40px] font-semibold"
              >
                Começar agora
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero / Introdução */}
        <section className="py-16 sm:py-20 bg-gradient-to-b from-emerald-50 via-white to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs sm:text-sm font-medium mb-4">
                Pensado para a rotina do anestesiologista
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
                Como o AnestEasy funciona na sua rotina
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-4">
                Uma plataforma leve para organizar procedimentos, recebimentos e resultados,
                sem transformar a sua rotina em mais uma tarefa burocrática.
              </p>
              <p className="text-sm sm:text-base text-emerald-700 font-medium">
                Você continua trabalhando do seu jeito. O AnestEasy apenas ajuda a deixar
                as informações no lugar certo.
              </p>
            </div>
          </div>
        </section>

        {/* Bloco 1: Problema */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                O cenário típico da gestão do anestesiologista
              </h2>
              <p className="text-slate-600 max-w-3xl mx-auto">
                Muitos procedimentos, vários convênios, hospitais diferentes e pouco
                tempo para acompanhar tudo com calma. O AnestEasy nasce justamente para
                simplificar esse dia a dia.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md bg-white">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg mb-2">
                    Dificuldade em acompanhar todos os recebimentos
                  </CardTitle>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Com tantas fontes de receita, é natural ficar inseguro se tudo foi
                    devidamente registrado e recebido. Falta uma visão única do mês.
                  </p>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-md bg-white">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg mb-2">
                    Muito tempo em planilhas e conferências
                  </CardTitle>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Planilhas, anotações e mensagens tomam tempo. Frequentemente, a
                    gestão acaba ficando para depois ou feita às pressas.
                  </p>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-md bg-white">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg mb-2">
                    Visão fragmentada dos resultados
                  </CardTitle>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Sem tudo no mesmo lugar, fica mais difícil enxergar o desempenho do
                    mês, dos convênios e da própria atuação.
                  </p>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Bloco 2: Solução */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                Uma solução leve de gestão, pensada para anestesiologistas
              </h2>
              <p className="text-slate-600 max-w-3xl mx-auto">
                O AnestEasy reúne em um único lugar as informações que você e sua equipe
                já usam no dia a dia, deixando a gestão mais organizada e fácil de
                acompanhar.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md bg-slate-50">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg mb-2">
                    Todos os procedimentos organizados
                  </CardTitle>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Registre seus procedimentos de forma simples, com valores, convênios,
                    hospitais e status de recebimento.
                  </p>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-md bg-slate-50">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg mb-2">
                    Controle financeiro de verdade
                  </CardTitle>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Visualize quanto entrou, o que ainda está pendente e quais convênios
                    estão atrasando mais seus recebimentos.
                  </p>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-md bg-slate-50">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg mb-2">
                    Relatórios para decisões melhores
                  </CardTitle>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Gere relatórios financeiros e de qualidade profissional que mostram
                    seu mês de forma clara, com linguagem feita para o anestesista.
                  </p>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Bloco 3: Como funciona (passo a passo) */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-slate-900">
                Como o AnestEasy entra na sua rotina
              </h2>
              <p className="text-slate-600 max-w-3xl mx-auto">
                Em poucos passos, o sistema se encaixa na sua rotina para trazer mais
                organização e previsibilidade, sem mudar a forma como você trabalha.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold mr-3">
                    1
                  </span>
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                    Cadastre seus procedimentos
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Você ou sua secretária registram os procedimentos com poucos campos,
                  incluindo valores, convênios e datas.
                </p>
              </div>

              <div className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold mr-3">
                    2
                  </span>
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                    Acompanhe recebimentos e pendências
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Veja o que já foi pago, o que está pendente e onde estão os principais
                  gargalos de pagamento.
                </p>
              </div>

              <div className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold mr-3">
                    3
                  </span>
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                    Gere relatórios mensais completos
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Em poucos cliques, você gera relatórios financeiros e de feedback
                  profissional para entender seu mês em detalhes.
                </p>
              </div>

              <div className="relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold mr-3">
                    4
                  </span>
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                    Use os dados para ter mais tranquilidade
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Com os números organizados, fica mais fácil decidir, negociar e planejar
                  os próximos passos com segurança.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bloco 4: Benefícios */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                Benefícios para o anestesiologista
              </h2>
              <p className="text-slate-600 max-w-3xl mx-auto">
                O objetivo é simples: que você se sinta no controle da sua rotina, com
                mais tranquilidade e clareza sobre o seu trabalho.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md bg-slate-50">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg mb-2">
                    Mais previsibilidade financeira
                  </CardTitle>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Acompanhe quanto entrou e o que ainda está em aberto, tendo uma visão
                    mais clara do seu mês como anestesista.
                  </p>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-md bg-slate-50">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg mb-2">
                    Menos tempo com burocracia
                  </CardTitle>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Simplifique a conferência do seu movimento. O sistema ajuda na parte
                    repetitiva e você ganha tempo para o que é mais importante.
                  </p>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-md bg-slate-50">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg mb-2">
                    Mais segurança sobre seus procedimentos
                  </CardTitle>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Ao registrar tudo em um só lugar, você acompanha com mais segurança o
                    caminho de cada procedimento até o recebimento.
                  </p>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20 bg-gradient-to-r from-emerald-50 via-white to-emerald-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-slate-900">
              Quer testar uma forma mais organizada de cuidar da sua anestesia?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-700 mb-8 max-w-3xl mx-auto">
              Você pode experimentar o AnestEasy e perceber, no seu ritmo, como é ter
              seus procedimentos e recebimentos mais organizados e fáceis de acompanhar.
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold px-10 py-5 text-base sm:text-lg rounded-xl inline-flex items-center shadow-lg shadow-emerald-500/30"
              >
                Começar agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}


