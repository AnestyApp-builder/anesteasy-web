'use client'

import React from 'react'
import CardMetrica from './CardMetrica'
import GraficoBarras from './GraficoBarras'
import type { DadosFinanceirosGrupo } from '@/lib/exportarRelatorioContador'

interface ModuloAnualProps {
  dados: DadosFinanceirosGrupo['anual']
}

const formatarMoeda = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)

export default function ModuloAnual({ dados }: ModuloAnualProps) {
  const totalDistribuicao = dados.distribuicao.cnpj + dados.distribuicao.cpf
  const pctCnpj = totalDistribuicao > 0 ? (dados.distribuicao.cnpj / totalDistribuicao) * 100 : 50
  const pctCpf = totalDistribuicao > 0 ? (dados.distribuicao.cpf / totalDistribuicao) * 100 : 50

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <CardMetrica
          label="Faturamento Bruto"
          valor={dados.faturamentoBruto}
          sublabel={`${dados.ano}`}
          tamanho="grande"
        />
        <CardMetrica
          label="Líquido Distribuível"
          valor={dados.liquidoDistribuivel}
          sublabel={`Após despesas de ${formatarMoeda(dados.despesas)}`}
          tamanho="grande"
        />
        <CardMetrica
          label="A Receber"
          valor={dados.aReceber}
          destaque={dados.aReceber > 0 ? 'vermelho' : 'default'}
          sublabel="Pendente de pagamento"
          tamanho="grande"
        />
      </div>

      {/* Gráfico de Barras - Faturamento Mensal */}
      <div>
        <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">
          Faturamento Mensal — {dados.ano}
        </h4>
        <GraficoBarras dados={dados.faturamentoMensal} />
      </div>

      {/* Cards Menores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <CardMetrica label="Despesas" valor={dados.despesas} tamanho="pequeno" />
        <CardMetrica label="Procedimentos" valor={String(dados.procedimentos)} tamanho="pequeno" />
        <CardMetrica label="Ticket Médio" valor={dados.ticketMedio} tamanho="pequeno" />
        <CardMetrica
          label="Glosa em Aberto"
          valor={dados.glosaEmAberto}
          destaque="vermelho"
          tamanho="pequeno"
        />
      </div>

      {/* Barra Horizontal CNPJ vs CPF */}
      <div className="bg-white rounded-2xl border border-stone-200/60 p-5 space-y-3">
        <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
          Distribuição por Titularidade
        </h4>
        <div className="flex w-full h-8 rounded-full overflow-hidden">
          <div
            className="bg-teal-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
            style={{ width: `${pctCnpj}%` }}
          >
            {pctCnpj >= 10 ? `CNPJ ${Math.round(pctCnpj)}%` : ''}
          </div>
          <div
            className="bg-sky-400 flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
            style={{ width: `${pctCpf}%` }}
          >
            {pctCpf >= 10 ? `CPF ${Math.round(pctCpf)}%` : ''}
          </div>
        </div>
        <div className="flex justify-between text-xs font-semibold text-stone-500">
          <span>CNPJ: {formatarMoeda(dados.distribuicao.cnpj)}</span>
          <span>CPF: {formatarMoeda(dados.distribuicao.cpf)}</span>
        </div>
      </div>

      {/* Tabela de Cotistas */}
      {dados.cotistas.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
          <div className="p-4 border-b border-stone-100">
            <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
              Cotistas do Grupo
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="text-left px-4 py-3 text-xs font-bold text-stone-400 uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-stone-400 uppercase">CRM</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-stone-400 uppercase">Cota</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-teal-600 uppercase">Valor da Cota</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-stone-400 uppercase">Produzido CNPJ</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-stone-400 uppercase">Produzido CPF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {dados.cotistas.map((c, i) => (
                  <tr key={i} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-stone-800">{c.nome}</td>
                    <td className="px-4 py-3 text-stone-500">{c.crm}</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-700">{c.cota}%</td>
                    <td className="px-4 py-3 text-right font-bold text-teal-700">{formatarMoeda(c.valorCota || 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-600">{formatarMoeda(c.recebidoCnpj)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-600">{formatarMoeda(c.recebidoCpf)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 border-t border-stone-200">
                  <td colSpan={2} className="px-4 py-3 font-bold text-stone-800">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-stone-700">
                    {dados.cotistas.reduce((s, c) => s + c.cota, 0)}%
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-teal-700">
                    {formatarMoeda(dados.cotistas.reduce((s, c) => s + (c.valorCota || 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-stone-600">
                    {formatarMoeda(dados.cotistas.reduce((s, c) => s + c.recebidoCnpj, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-stone-600">
                    {formatarMoeda(dados.cotistas.reduce((s, c) => s + c.recebidoCpf, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
