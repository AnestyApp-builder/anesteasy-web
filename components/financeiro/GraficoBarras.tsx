'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DadosBarra {
  mes: string
  valor: number
}

interface GraficoBarrasProps {
  dados: DadosBarra[]
  corPadrao?: string
  corDestaque?: string
  indiceBarra?: number // index da barra que será destacada (-1 = nenhuma)
}

const formatarMoeda = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-lg">
        <p className="text-xs font-bold text-stone-600">{label}</p>
        <p className="text-sm font-bold text-stone-900">{formatarMoeda(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function GraficoBarras({
  dados,
  corPadrao = '#1D9E75',
  corDestaque = '#0F6E56',
  indiceBarra = -1
}: GraficoBarrasProps) {
  return (
    <div className="w-full h-[200px] sm:h-[280px] bg-white rounded-2xl border border-stone-200/60 p-3 sm:p-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => {
              if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
              if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
              return String(v)
            }}
            tick={{ fontSize: 10, fill: '#a8a29e' }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {dados.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === indiceBarra ? corDestaque : corPadrao}
                opacity={indiceBarra >= 0 && index !== indiceBarra ? 0.6 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
