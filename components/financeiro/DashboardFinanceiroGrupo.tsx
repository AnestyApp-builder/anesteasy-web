'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Download, TrendingUp, Calendar } from 'lucide-react'
import ModuloAnual from './ModuloAnual'
import ModuloMensal from './ModuloMensal'
import { exportarRelatorioContador } from '@/lib/exportarRelatorioContador'
import type { DadosFinanceirosGrupo } from '@/lib/exportarRelatorioContador'

interface DashboardFinanceiroGrupoProps {
  dados: DadosFinanceirosGrupo | null
  loading: boolean
  erro: string | null
}

export default function DashboardFinanceiroGrupo({ dados, loading, erro }: DashboardFinanceiroGrupoProps) {
  const [modo, setModo] = useState<'anual' | 'mensal'>('anual')
  const [exportando, setExportando] = useState(false)

  // Persist toggle to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('anesteasy_fin_modo')
    if (saved === 'anual' || saved === 'mensal') setModo(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('anesteasy_fin_modo', modo)
  }, [modo])

  const handleExportar = useCallback(async () => {
    if (!dados) return
    setExportando(true)
    try {
      await exportarRelatorioContador(dados.grupo, dados.anual)
    } catch (e) {
      console.error('Erro ao exportar:', e)
    } finally {
      setExportando(false)
    }
  }, [dados])

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-stone-200 rounded-xl" />
          <div className="h-10 w-56 bg-stone-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-stone-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-[280px] bg-stone-100 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-stone-100 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (erro) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <p className="text-red-600 font-bold text-lg">Erro ao carregar dados financeiros</p>
        <p className="text-red-400 text-sm mt-1">{erro}</p>
      </div>
    )
  }

  // Empty state
  if (!dados) {
    return (
      <div className="bg-stone-50 border border-stone-200 border-dashed rounded-2xl p-12 text-center">
        <TrendingUp className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <p className="text-stone-500 font-bold text-lg">Sem registros neste período</p>
        <p className="text-stone-400 text-sm mt-1">Os dados financeiros aparecerão aqui conforme procedimentos forem lançados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header: Toggle + Exportar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
        {/* Toggle Anual/Mensal */}
        <div className="flex bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setModo('anual')}
            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              modo === 'anual'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Anual
          </button>
          <button
            onClick={() => setModo('mensal')}
            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              modo === 'mensal'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Mensal
          </button>
        </div>

        {/* Botão Exportar */}
        <button
          onClick={handleExportar}
          disabled={exportando}
          className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-teal-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {exportando ? 'Gerando...' : 'Exportar para o Contador'}
        </button>
      </div>

      {/* Módulo selecionado */}
      {modo === 'anual' ? (
        <ModuloAnual dados={dados.anual} />
      ) : (
        <ModuloMensal dados={dados.mensal} isQuotaGroup={dados.grupo.isQuotaGroup} />
      )}
    </div>
  )
}
