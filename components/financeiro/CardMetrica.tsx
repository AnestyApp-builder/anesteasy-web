'use client'

import React from 'react'

interface CardMetricaProps {
  label: string
  valor: string | number
  sublabel?: string
  sublabelColor?: 'green' | 'red' | 'default'
  destaque?: 'azul' | 'vermelho' | 'default'
  tamanho?: 'grande' | 'pequeno'
}

const formatarMoeda = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)

export default function CardMetrica({
  label,
  valor,
  sublabel,
  sublabelColor = 'default',
  destaque = 'default',
  tamanho = 'grande'
}: CardMetricaProps) {
  const bgClass = destaque === 'azul'
    ? 'bg-sky-50 border border-sky-100'
    : destaque === 'vermelho'
      ? 'bg-red-50 border border-red-100'
      : 'bg-stone-100 border border-stone-200/60'

  const valorClass = destaque === 'azul'
    ? 'text-sky-700'
    : destaque === 'vermelho'
      ? 'text-red-600'
      : 'text-stone-900'

  const sublabelClass = sublabelColor === 'green'
    ? 'text-green-600'
    : sublabelColor === 'red'
      ? 'text-red-600'
      : 'text-stone-400'

  const valorDisplay = typeof valor === 'number' ? formatarMoeda(valor) : valor

  return (
    <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${bgClass} transition-all hover:shadow-sm`}>
      <p className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className={`${tamanho === 'grande' ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl'} font-bold ${valorClass} leading-tight`}>
        {valorDisplay}
      </p>
      {sublabel && (
        <p className={`text-[10px] sm:text-xs font-semibold mt-1 ${sublabelClass}`}>{sublabel}</p>
      )}
    </div>
  )
}
