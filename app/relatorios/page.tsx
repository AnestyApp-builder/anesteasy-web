'use client'

import { useState } from 'react'
import { 
  FileText, 
  Download, 
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Filter,
  FileSpreadsheet,
  FileImage
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { reportService, ReportData } from '@/lib/reports'
import { useAuth } from '@/contexts/AuthContext'

function RelatoriosContent() {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const { user } = useAuth()

  const handleExportCSV = async (customStartDate?: string, customEndDate?: string) => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      // Usar datas customizadas se fornecidas, senão usar o dateRange do estado
      const startDate = customStartDate || dateRange.start
      const endDate = customEndDate || dateRange.end
      
      const reportData = await reportService.generateReportData(
        user.id, 
        startDate, 
        endDate
      )
      
      // Validar se há dados antes de exportar
      if (!reportData.procedures || reportData.procedures.length === 0) {
        alert('Nenhum procedimento encontrado no período selecionado.')
        setLoading(false)
        return
      }
      
      reportService.exportToCSV(reportData)
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      alert('Erro ao exportar relatório. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async (customStartDate?: string, customEndDate?: string) => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      // Usar datas customizadas se fornecidas, senão usar o dateRange do estado
      const startDate = customStartDate || dateRange.start
      const endDate = customEndDate || dateRange.end
      
      const reportData = await reportService.generateReportData(
        user.id, 
        startDate, 
        endDate
      )
      
      // Validar se há dados antes de exportar
      if (!reportData.procedures || reportData.procedures.length === 0) {
        alert('Nenhum procedimento encontrado no período selecionado.')
        setLoading(false)
        return
      }
      
      reportService.exportToPDF(reportData)
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('Erro ao exportar relatório. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateMonthlyReport = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const currentDate = new Date()
      const reportData = await reportService.generateMonthlyReport(
        user.id,
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      )
      reportService.exportToPDF(reportData)
    } catch (error) {
      
      alert('Erro ao gerar relatório mensal. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const reports = [
    {
      title: 'Relatório Mensal',
      description: 'Resumo completo das atividades do mês',
      type: 'Mensal',
      lastGenerated: '2024-01-15',
      action: handleGenerateMonthlyReport,
      icon: BarChart3
    },
    {
      title: 'Relatório de Procedimentos',
      description: 'Detalhamento de todos os procedimentos realizados',
      type: 'Procedimentos',
      lastGenerated: '2024-01-14',
      action: () => handleExportPDF(dateRange.start, dateRange.end),
      icon: FileText
    },
    {
      title: 'Relatório Financeiro',
      description: 'Análise completa da situação financeira',
      type: 'Financeiro',
      lastGenerated: '2024-01-13',
      action: () => handleExportCSV(dateRange.start, dateRange.end),
      icon: TrendingUp
    },
    {
      title: 'Relatório de Pacientes',
      description: 'Estatísticas e dados dos pacientes atendidos',
      type: 'Pacientes',
      lastGenerated: '2024-01-12',
      action: () => handleExportPDF(dateRange.start, dateRange.end),
      icon: PieChart
    }
  ]

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-gray-600 mt-1">Gere e visualize relatórios detalhados</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleExportCSV(dateRange.start, dateRange.end)} 
              disabled={loading}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button 
              onClick={() => handleExportPDF(dateRange.start, dateRange.end)} 
              disabled={loading}
            >
              <FileImage className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros de Período</CardTitle>
          </CardHeader>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Data Inicial"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <Input
                label="Data Final"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reports.map((report, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={report.action}
            >
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <report.icon className="w-8 h-8 text-primary-600" />
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <p className="text-sm text-gray-600">{report.description}</p>
                <div className="mt-4">
                  <Button 
                    size="sm" 
                    className="w-full"
                    disabled={loading}
                    onClick={(e) => {
                      e.stopPropagation()
                      report.action()
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Gerar
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios Disponíveis</CardTitle>
          </CardHeader>
          <div className="p-6">
            <div className="space-y-4">
              {reports.map((report, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <report.icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{report.title}</p>
                      <p className="text-sm text-gray-600">{report.description}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                          {report.type}
                        </span>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          Última geração: {report.lastGenerated}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={report.action}
                      disabled={loading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Gerar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
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
