'use client'

import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

export type FinanceiroPieSlice = { name: string; value: number; color: string }

export type ProcedureChartRow = {
  status: string
  quantidade: number
  cor: string
  bgColor: string
  textColor: string
}

interface FinanceiroChartsProps {
  pieData: FinanceiroPieSlice[]
  monthlyRevenueData: { name: string; receita: number }[]
  procedureChartData: ProcedureChartRow[]
  formatCurrency: (value: number) => string
}

export default function FinanceiroCharts({
  pieData,
  monthlyRevenueData,
  procedureChartData,
  formatCurrency,
}: FinanceiroChartsProps) {
  const router = useRouter()

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Distribuição de Receitas</CardTitle>
            <CardDescription>Status dos pagamentos dos procedimentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: { name?: string; percent?: number }) =>
                      `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Valor']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Evolução da Receita</CardTitle>
            <CardDescription>Últimos 6 meses de receitas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quantidade de Procedimentos</CardTitle>
            <CardDescription>Distribuição dos procedimentos por status de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={procedureChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="status" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow:
                        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      fontSize: '14px',
                    }}
                    formatter={(value: number, _name: unknown, props: { payload?: { cor?: string } }) => [
                      value,
                      'Procedimentos',
                      { color: props.payload?.cor },
                    ]}
                    labelStyle={{
                      color: '#374151',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                    itemStyle={{
                      color: '#374151',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                    {procedureChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {procedureChartData.map((item, index) => (
                <div
                  key={index}
                  className={`text-center p-4 rounded-lg border ${item.bgColor} border-opacity-20 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105`}
                  onClick={() => {
                    let filterParam = ''
                    switch (item.status) {
                      case 'Total':
                        filterParam = 'all'
                        break
                      case 'Pago':
                        filterParam = 'paid'
                        break
                      case 'Pendente':
                        filterParam = 'pending'
                        break
                      case 'Não Lançado':
                        filterParam = 'cancelled'
                        break
                      default:
                        filterParam = 'all'
                    }
                    router.push(`/procedimentos?status=${filterParam}`)
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full mx-auto mb-3 shadow-sm"
                    style={{ backgroundColor: item.cor }}
                  />
                  <div className={`text-3xl font-bold ${item.textColor} mb-1`}>{item.quantidade}</div>
                  <div className={`text-sm font-medium ${item.textColor} opacity-80`}>{item.status}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
