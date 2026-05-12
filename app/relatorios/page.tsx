'use client'

import { useEffect, useState, useMemo } from 'react'
import { Calendar, CheckCircle2, FileText, FileSpreadsheet, TrendingUp, Hospital, Activity, DollarSign as DollarIcon, Loader2 } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { reportService, ReportData } from '@/lib/reports'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency } from '@/lib/utils'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts'

const COLORS = ['#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#2dd4bf']

function RelatoriosContent() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  const loadReportData = async () => {
    if (!user?.id) return
    setFetchingData(true)
    try {
      const data = await reportService.generateReportData(
        user.id,
        dateRange.start,
        dateRange.end
      )
      setReportData(data)
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error)
      addToast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as estatísticas.',
        variant: 'error'
      })
    } finally {
      setFetchingData(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [user?.id, dateRange.start, dateRange.end])

  const handleExportCSV = async () => {
    if (!reportData) return
    reportService.exportToCSV(reportData)
  }

  const handleExportPDF = async () => {
    if (!reportData) return
    reportService.exportToPDF(reportData)
  }

  const kpis = useMemo(() => {
    if (!reportData) return null
    const { stats } = reportData
    return [
      { label: 'Total de Casos', value: stats.total, icon: Activity, color: 'text-teal-600' },
      { label: 'Receita Estimada', value: formatCurrency(stats.totalValue), icon: DollarIcon, color: 'text-emerald-600' },
      { label: 'Concluídos', value: `${Math.round((stats.completed / (stats.total || 1)) * 100)}%`, icon: CheckCircle2, color: 'text-blue-600' },
      { label: 'Ticket Médio', value: formatCurrency(stats.totalValue / (stats.total || 1)), icon: TrendingUp, color: 'text-purple-600' },
    ]
  }, [reportData])

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Relatórios e Analytics</h1>
            <p className="text-gray-500 mt-1">
              Análise profunda do seu desempenho e exportação profissional.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={fetchingData || !reportData}
              className="hidden sm:flex"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button 
              onClick={handleExportPDF} 
              disabled={fetchingData || !reportData}
              className="bg-teal-600 hover:bg-teal-700 shadow-md"
            >
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF Premium
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="border-none shadow-sm bg-teal-50/50">
          <div className="p-4 flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <Input
                label="De"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="bg-white"
              />
            </div>
            <div className="flex-1 w-full">
              <Input
                label="Até"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="bg-white"
              />
            </div>
            <Button 
              variant="ghost" 
              onClick={loadReportData} 
              disabled={fetchingData}
              className="text-teal-700 hover:bg-teal-100"
            >
              {fetchingData ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
              Atualizar
            </Button>
          </div>
        </Card>

        {fetchingData ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
              <p className="text-teal-800 font-medium animate-pulse">Processando estatísticas...</p>
            </div>
          </div>
        ) : reportData ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpis?.map((kpi, idx) => (
                <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-gray-50 ${kpi.color}`}>
                      <kpi.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 break-all">{kpi.value}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Por Hospital */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <Hospital className="w-4 h-4 text-teal-600" />
                    <CardTitle className="text-lg">Volume por Hospital</CardTitle>
                  </div>
                </CardHeader>
                <div className="h-[300px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.hospitalStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="hospital" 
                        type="category" 
                        width={120} 
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any) => [value, 'Casos']}
                      />
                      <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Mix de Procedimentos */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    <CardTitle className="text-lg">Mix de Procedimentos</CardTitle>
                  </div>
                </CardHeader>
                <div className="h-[350px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const stats = [...reportData.procedureTypeStats]
                          if (stats.length <= 6) return stats
                          
                          const top5 = stats.slice(0, 5)
                          const others = stats.slice(5).reduce((acc, curr) => ({
                            type: 'Outros',
                            count: acc.count + curr.count,
                            totalValue: acc.totalValue + curr.totalValue
                          }), { type: 'Outros', count: 0, totalValue: 0 })
                          
                          return [...top5, others]
                        })()}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="40%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                      >
                        {reportData.procedureTypeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Evolução Mensal */}
              <Card className="border-none shadow-sm lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    <CardTitle className="text-lg">Evolução Mensal (Receita vs Volume)</CardTitle>
                  </div>
                </CardHeader>
                <div className="h-[300px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.monthlyStats}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `R$ ${value >= 1000 ? value/1000 + 'k' : value}`}
                      />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="totalValue" 
                        name="Receita"
                        stroke="#14b8a6" 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        strokeWidth={3}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        name="Volume"
                        stroke="#0f766e" 
                        fill="transparent" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <Card className="p-12 text-center border-dashed border-2">
            <p className="text-gray-500">Nenhum dado encontrado para o período selecionado.</p>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default function Relatorios() {
  return (
    <ProtectedRoute>
      <RelatoriosContent />
    </ProtectedRoute>
  )
}
