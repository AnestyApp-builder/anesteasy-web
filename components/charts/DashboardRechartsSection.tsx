'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { SkeletonChart } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export type DashboardPieSlice = { name: string; value: number; color: string }

interface DashboardRechartsSectionProps {
  loading: boolean
  monthlyRevenue: { name: string; value: number }[]
  pieData: DashboardPieSlice[]
}

export default function DashboardRechartsSection({
  loading,
  monthlyRevenue,
  pieData,
}: DashboardRechartsSectionProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
      {loading ? (
        <SkeletonChart />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                Receita dos Últimos 6 Meses
              </CardTitle>
            </CardHeader>
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="h-48 sm:h-56 lg:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" strokeOpacity={0.6} />
                    <XAxis
                      dataKey="name"
                      fontSize={12}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      fontSize={12}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) {
                          return `R$ ${(value / 1000000).toFixed(1)}M`
                        }
                        if (value >= 1000) {
                          return `R$ ${(value / 1000).toFixed(0)}k`
                        }
                        return `R$ ${value.toFixed(0)}`
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), 'Receita Recebida']}
                      labelFormatter={(label) => `Mês: ${label}`}
                      contentStyle={{
                        fontSize: '12px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: 'white',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#14b8a6"
                      strokeWidth={3}
                      dot={{
                        fill: '#14b8a6',
                        strokeWidth: 2,
                        r: 5,
                        stroke: '#ffffff',
                      }}
                      activeDot={{
                        r: 7,
                        stroke: '#14b8a6',
                        strokeWidth: 3,
                        fill: '#ffffff',
                      }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {loading ? (
        <SkeletonChart />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="h-48 sm:h-56 lg:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: { percent?: number; name?: string }) => {
                        if (props.percent === 0) return null
                        return `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                      }}
                      outerRadius={60}
                      innerRadius={20}
                      fill="#8884d8"
                      dataKey="value"
                      fontSize={11}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      contentStyle={{
                        fontSize: '12px',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-3 sm:hidden">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-gray-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
