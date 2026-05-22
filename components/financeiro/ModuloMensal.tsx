'use client'

import React from 'react'
import CardMetrica from './CardMetrica'
import GraficoBarras from './GraficoBarras'
import type { DadosFinanceirosGrupo } from '@/lib/exportarRelatorioContador'

interface ModuloMensalProps {
  dados: DadosFinanceirosGrupo['mensal']
}

const formatarMoeda = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)

export default function ModuloMensal({ dados }: ModuloMensalProps) {
  const totalRecebimentos = dados.recebimentosPorMeio.reduce((s, r) => s + r.valor, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <CardMetrica
          label="Faturamento do Mês"
          valor={dados.faturamento}
          sublabel={`${dados.variacaoPct >= 0 ? '▲' : '▼'} ${Math.abs(dados.variacaoPct).toFixed(1)}% vs. mês anterior`}
          sublabelColor={dados.variacaoPct >= 0 ? 'green' : 'red'}
          tamanho="grande"
        />
        <CardMetrica
          label="A Receber"
          valor={dados.aReceber}
          destaque={dados.aReceber > 0 ? 'vermelho' : 'default'}
          sublabel="Pendente de pagamento"
          tamanho="grande"
        />
        <CardMetrica
          label="Procedimentos"
          valor={String(dados.procedimentos)}
          sublabel="realizados neste mês"
          tamanho="grande"
        />
      </div>

      {/* Gráfico últimos 6 meses */}
      <div>
        <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">
          Últimos 6 Meses
        </h4>
        <GraficoBarras
          dados={dados.ultimos6Meses}
          corPadrao="#5eead4"
          corDestaque="#0F6E56"
          indiceBarra={dados.ultimos6Meses.length - 1}
        />
      </div>

      {/* Recebimentos por Meio */}
      <div className="bg-white rounded-2xl border border-stone-200/60 p-5 space-y-4">
        <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
          Recebimentos por Meio de Pagamento
        </h4>
        {dados.recebimentosPorMeio.length === 0 ? (
          <p className="text-sm text-stone-400 italic">Sem registros neste período.</p>
        ) : (
          <div className="space-y-3">
            {dados.recebimentosPorMeio.map((item, i) => {
              const pct = totalRecebimentos > 0 ? (item.valor / totalRecebimentos) * 100 : 0
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-stone-700">{item.meio}</span>
                    <span className="font-bold text-stone-900">{formatarMoeda(item.valor)}</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cards de Glosa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardMetrica
          label="Glosado no Mês"
          valor={dados.glosado}
          destaque={dados.glosado > 0 ? 'vermelho' : 'default'}
          tamanho="pequeno"
        />
        <CardMetrica
          label="Glosa em Aberto"
          valor={dados.glosaEmAberto}
          destaque={dados.glosaEmAberto > 0 ? 'vermelho' : 'default'}
          tamanho="pequeno"
        />
      </div>
    </div>
  )
}
