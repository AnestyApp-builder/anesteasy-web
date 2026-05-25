'use client'

import React from 'react'
import CardMetrica from './CardMetrica'
import GraficoBarras from './GraficoBarras'
import type { DadosFinanceirosGrupo } from '@/lib/exportarRelatorioContador'

interface ModuloMensalProps {
  dados: DadosFinanceirosGrupo['mensal']
  isQuotaGroup?: boolean
}

const formatarMoeda = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)

export default function ModuloMensal({ dados, isQuotaGroup }: ModuloMensalProps) {
  const totalRecebimentos = dados.recebimentosPorMeio.reduce((s, r) => s + r.valor, 0)
  const despesasGrupo = dados.despesasGrupoMes
  const receitaCnpjGrupo = dados.receitaCnpjGrupoMes
  const liquidoDistribuivel = dados.faturamento - despesasGrupo

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

      {/* Detalhamento por Membro */}
      <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
          <h4 className="text-sm font-bold text-stone-700 uppercase tracking-wider">
            Detalhamento por Membro
          </h4>
        </div>

        {/* Faixa de cálculo — só para grupos com cotas */}
        {isQuotaGroup && (
          <div className="px-4 py-3 bg-indigo-50/60 border-b border-indigo-100">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-stone-600">
                <span className="font-semibold text-stone-800">{formatarMoeda(dados.faturamento)}</span>
                <span className="text-stone-400 ml-1">faturamento</span>
              </span>
              {despesasGrupo > 0 && (
                <>
                  <span className="text-stone-300 font-bold">−</span>
                  <span className="text-stone-600">
                    <span className="font-semibold text-red-600">{formatarMoeda(despesasGrupo)}</span>
                    <span className="text-stone-400 ml-1">despesas do grupo</span>
                  </span>
                </>
              )}
              {receitaCnpjGrupo > 0 && (
                <span className="text-[11px] text-indigo-500 font-medium">
                  ({formatarMoeda(receitaCnpjGrupo)} via CNPJ do grupo)
                </span>
              )}
              <span className="text-stone-300 font-bold">=</span>
              <span className="text-stone-600">
                <span className="font-bold text-teal-700">{formatarMoeda(liquidoDistribuivel)}</span>
                <span className="text-stone-400 ml-1">líquido a distribuir</span>
              </span>
            </div>
          </div>
        )}

        <div className="divide-y divide-stone-100">
          {(!dados.detalhamentoMembros || dados.detalhamentoMembros.length === 0) ? (
            <p className="px-4 py-8 text-center text-stone-400 font-medium italic">
              Nenhum membro encontrado.
            </p>
          ) : (
            dados.detalhamentoMembros.map((m, i) => (
              <div key={i} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-stone-50/40 transition-colors">
                {/* Nome + badge de cota */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-teal-700">
                      {m.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 truncate text-sm">{m.nome}</p>
                    {isQuotaGroup && (
                      <span className="inline-block text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-0.5">
                        {m.cotaPercentual}% da cota
                      </span>
                    )}
                  </div>
                </div>

                {/* Valores */}
                <div className="flex items-center gap-3 sm:gap-5 justify-between sm:justify-end pl-10 sm:pl-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-stone-400 uppercase leading-none mb-0.5">
                      {isQuotaGroup ? 'Cota' : 'Produção'}
                    </p>
                    <p className="text-sm font-bold text-stone-700">
                      {formatarMoeda(m.producaoOuCota)}
                    </p>
                    {isQuotaGroup && (
                      <p className="text-[10px] text-stone-400 leading-none mt-0.5">
                        {m.cotaPercentual}% de {formatarMoeda(liquidoDistribuivel)}
                      </p>
                    )}
                  </div>

                  {m.despesas > 0 && (
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-bold text-stone-400 uppercase leading-none mb-0.5">Deduções</p>
                      <p className="text-sm font-bold text-red-500">− {formatarMoeda(m.despesas)}</p>
                    </div>
                  )}

                  <div className="text-right border-l border-stone-100 pl-3 sm:pl-5">
                    <p className="text-[10px] font-bold text-stone-400 uppercase leading-none mb-0.5">A Receber</p>
                    <p className="text-base font-black text-teal-700">{formatarMoeda(m.aReceber)}</p>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Linha Geral — só quando não for cota (para grupos de produção) ou quando há receita CNPJ sem cotas */}
          {!isQuotaGroup && (dados.despesasGrupoMes > 0 || dados.receitaCnpjGrupoMes > 0) && (
            <div className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-stone-50/70 border-t-2 border-stone-200">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-stone-600">G</span>
                </div>
                <div>
                  <p className="font-bold text-stone-800 text-sm">Geral</p>
                  <p className="text-[10px] text-stone-400">Lançamentos do grupo</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-5 justify-between sm:justify-end pl-10 sm:pl-0">
                {dados.despesasGrupoMes > 0 && (
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-stone-400 uppercase leading-none mb-0.5">Despesas do Grupo</p>
                    <p className="text-sm font-bold text-red-500">− {formatarMoeda(dados.despesasGrupoMes)}</p>
                  </div>
                )}
                {dados.receitaCnpjGrupoMes > 0 && (
                  <div className="text-right border-l border-stone-200 pl-3 sm:pl-5">
                    <p className="text-[10px] font-bold text-stone-400 uppercase leading-none mb-0.5">Entrou no Grupo</p>
                    <p className="text-base font-black text-indigo-700">{formatarMoeda(dados.receitaCnpjGrupoMes)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
