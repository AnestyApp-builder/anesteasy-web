'use client'

import { useEffect, useState, useMemo } from 'react'
import { Calendar, CheckCircle2, FileText, FileSpreadsheet, TrendingUp, Hospital, Activity, DollarSign as DollarIcon, Loader2, Users, Clock } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { reportService, ReportData } from '@/lib/reports'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
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
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('particular')
  
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
        dateRange.end,
        selectedGroupId === 'particular' ? undefined : selectedGroupId
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
    const fetchGroups = async () => {
      if (!user?.id) return
      const { data } = await supabase
        .from('groups')
        .select('id, name, color')
        .eq('is_active', true)
      
      if (data) {
        setGroups(data)
      }
    }

    fetchGroups()
  }, [user?.id])

  useEffect(() => {
    loadReportData()
  }, [user?.id, dateRange.start, dateRange.end, selectedGroupId])

  const handleExportCSV = async () => {
    if (!reportData) return
    reportService.exportToCSV(reportData)
  }

  const handleExportPDF = async () => {
    if (!reportData) return
    reportService.exportToPDF(reportData)
  }

  const comparisonAndStats = useMemo(() => {
    if (!reportData || !reportData.monthlyStats || reportData.monthlyStats.length === 0) {
      return { averageRevenue: 0, diffPercent: 0, lastMonthName: '', prevMonthName: '', hasComparison: false }
    }

    const mStats = reportData.monthlyStats
    
    // Calcular média mensal de receita
    const totalRev = mStats.reduce((sum, m) => sum + m.totalValue, 0)
    const averageRevenue = totalRev / mStats.length

    if (mStats.length < 2) {
      return { averageRevenue, diffPercent: 0, lastMonthName: '', prevMonthName: '', hasComparison: false }
    }

    // Último mês e penúltimo mês
    const lastMonth = mStats[mStats.length - 1]
    const prevMonth = mStats[mStats.length - 2]

    const diffPercent = prevMonth.totalValue > 0
      ? ((lastMonth.totalValue - prevMonth.totalValue) / prevMonth.totalValue) * 100
      : 0

    // Formatar nome do mês (ex: 2026-05 -> Mai/26)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const parseMonthName = (monthKey: string) => {
      try {
        const [year, monthStr] = monthKey.split('-')
        const monthIdx = parseInt(monthStr, 10) - 1
        return `${monthNames[monthIdx]}/${year.slice(-2)}`
      } catch (e) {
        return monthKey
      }
    }

    return {
      averageRevenue,
      diffPercent,
      lastMonthName: parseMonthName(lastMonth.month),
      prevMonthName: parseMonthName(prevMonth.month),
      hasComparison: true
    }
  }, [reportData])

  const kpis = useMemo(() => {
    if (!reportData) return null
    const { stats, isFinancialHidden } = reportData
    
    return [
      { 
        label: 'Total de Casos', 
        value: stats.total, 
        icon: Activity, 
        color: 'text-teal-600',
        subtitle: 'Casos e plantões lançados'
      },
      { 
        label: 'Receita Estimada', 
        value: isFinancialHidden ? '---' : formatCurrency(stats.totalValue), 
        icon: DollarIcon, 
        color: 'text-emerald-600',
        subtitle: 'Valor total cadastrado'
      },
      { 
        label: 'Receita Recebida', 
        value: isFinancialHidden ? '---' : formatCurrency(stats.completedValue), 
        icon: CheckCircle2, 
        color: 'text-blue-600',
        subtitle: `${Math.round((stats.completed / (stats.total || 1)) * 100)}% de casos pagos`
      },
      { 
        label: 'A Receber (Em Aberto)', 
        value: isFinancialHidden ? '---' : formatCurrency(stats.pendingValue), 
        icon: Clock, 
        color: 'text-amber-600',
        subtitle: `${stats.pending} pendências`
      },
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
          <div className="p-4 flex flex-col md:flex-row items-stretch md:items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Agenda</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="particular">Minha Agenda (Particular)</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
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
              className="text-teal-700 hover:bg-teal-100 h-10 w-full md:w-auto"
            >
              {fetchingData ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
              Atualizar
            </Button>
          </div>
        </Card>

        {reportData?.isFinancialHidden && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3">
            <div className="p-1 bg-amber-100 rounded-full">
              <DollarIcon className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Privacidade Financeira Ativada</h3>
              <p className="text-xs text-amber-700 mt-1">
                Este grupo não compartilha informações financeiras com membros. Apenas o criador e administradores podem ver os valores e gráficos de receita.
              </p>
            </div>
          </div>
        )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {kpis?.map((kpi, idx) => (
                <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="p-4 flex items-center space-x-4">
                    <div className={`p-3 rounded-2xl bg-slate-50 ${kpi.color}`}>
                      <kpi.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate" title={kpi.label}>{kpi.label}</p>
                      <p className="text-lg sm:text-2xl font-black text-slate-800 mt-0.5" title={String(kpi.value)}>{kpi.value}</p>
                      {kpi.subtitle && (
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate" title={kpi.subtitle}>{kpi.subtitle}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Destaques do Período */}
            <div className="space-y-4 pt-2">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                Destaques do Período
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cirurgião Destaque */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-between hover:shadow-slate-300/40 hover:border-slate-200/60 transition-all group">
                  <div className="space-y-2">
                    <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                      Cirurgião Mais Ativo
                    </span>
                    <h3 className="text-lg font-black text-slate-800 pt-1 truncate" title={reportData.surgeonStats[0]?.surgeon || 'Nenhum cirurgião'}>
                      {reportData.surgeonStats[0]?.surgeon || 'Nenhum lançamento'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Profissional que mais realizou cirurgias no período filtrado.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Total de cirurgias:</span>
                    <span className="font-extrabold text-teal-600 text-sm">
                      {reportData.surgeonStats[0]?.count || 0}
                    </span>
                  </div>
                </div>

                {/* Procedimento Destaque */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-between hover:shadow-slate-300/40 hover:border-slate-200/60 transition-all group">
                  <div className="space-y-2">
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                      Procedimento Mais Executado
                    </span>
                    <h3 className="text-lg font-black text-slate-800 pt-1 truncate" title={reportData.procedureTypeStats[0]?.type || 'Nenhum procedimento'}>
                      {reportData.procedureTypeStats[0]?.type || 'Nenhum lançamento'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      O tipo de procedimento mais recorrente no período selecionado.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Total de casos:</span>
                    <span className="font-extrabold text-blue-600 text-sm">
                      {reportData.procedureTypeStats[0]?.count || 0}
                    </span>
                  </div>
                </div>

                {/* Comparação Mensal */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-between hover:shadow-slate-300/40 hover:border-slate-200/60 transition-all group">
                  <div className="space-y-2">
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                      Comparação Mensal
                    </span>
                    <div className="pt-1 flex items-baseline gap-2">
                      <h3 className="text-lg font-black text-slate-800">
                        {comparisonAndStats.hasComparison 
                          ? `${comparisonAndStats.diffPercent >= 0 ? '+' : ''}${comparisonAndStats.diffPercent.toFixed(1)}%`
                          : 'Sem dados suficientes'}
                      </h3>
                      {comparisonAndStats.hasComparison && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          ({comparisonAndStats.lastMonthName} vs {comparisonAndStats.prevMonthName})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      Comparação de faturamento com o mês anterior.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Média mensal de receita:</span>
                    <span className="font-extrabold text-purple-600 text-sm">
                      {reportData.isFinancialHidden ? '---' : formatCurrency(comparisonAndStats.averageRevenue)}
                    </span>
                  </div>
                </div>
              </div>
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
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

              {/* Por Cirurgião */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    <CardTitle className="text-lg">Volume por Cirurgião</CardTitle>
                  </div>
                </CardHeader>
                <div className="h-[300px] p-4">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={reportData.surgeonStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="surgeon" 
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
                      <Bar dataKey="count" fill="#0f766e" radius={[0, 4, 4, 0]} barSize={20} />
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
                <div className="h-[380px] p-4">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                        cy="45%"
                        innerRadius="45%"
                        outerRadius="75%"
                        paddingAngle={5}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          // Só mostra o número se a fatia tiver pelo menos 5% do total, para não sobrepor
                          if (percent < 0.05) return null;
                          return (
                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
                              {value}
                            </text>
                          );
                        }}
                      >
                        {reportData.procedureTypeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                         formatter={(value: any, name: any) => [`${value} procedimentos`, name]}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} 
                        formatter={(value, entry: any) => (
                          <span className="text-slate-700 font-medium">
                            {value} ({entry.payload?.value || entry.payload?.count || 0})
                          </span>
                        )}
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
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
