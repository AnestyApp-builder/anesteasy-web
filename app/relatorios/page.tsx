'use client'

import { useState } from 'react'
import { Calendar, CheckCircle2, FileText, FileSpreadsheet } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { reportService } from '@/lib/reports'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

function RelatoriosContent() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const { user } = useAuth()

  const handleExportCSV = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const reportData = await reportService.generateReportData(
        user.id,
        dateRange.start,
        dateRange.end,
      )

      if ((!reportData.procedures || reportData.procedures.length === 0) && 
          (!reportData.shifts || reportData.shifts.length === 0)) {
        addToast({
          title: 'Nenhum registro encontrado',
          description: 'Não há procedimentos ou plantões no período selecionado para exportar.',
          variant: 'warning'
        })
        return
      }

      reportService.exportToCSV(reportData)
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      addToast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar o relatório. Tente novamente.',
        variant: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const reportData = await reportService.generateReportData(
        user.id,
        dateRange.start,
        dateRange.end,
      )

      if ((!reportData.procedures || reportData.procedures.length === 0) && 
          (!reportData.shifts || reportData.shifts.length === 0)) {
        addToast({
          title: 'Nenhum registro encontrado',
          description: 'Não há procedimentos ou plantões no período selecionado para exportar.',
          variant: 'warning'
        })
        return
      }

      reportService.exportToPDF(reportData)
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      addToast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar o relatório. Tente novamente.',
        variant: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header enxuto */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-gray-600 mt-1">
              Selecione o período e gere o relatório consolidado do seu mês.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={loading}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={handleExportPDF} disabled={loading}>
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </div>
        </div>

        {/* Mini fluxo explicando como o relatório é gerado */}
        <Card>
          <CardHeader>
            <CardTitle>Como o relatório é gerado</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-start space-x-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <span className="text-sm font-semibold">1</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    <p className="text-sm font-semibold text-gray-900">Ajuste as datas</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Defina a data inicial e final do período que deseja analisar.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    <p className="text-sm font-semibold text-gray-900">Escolha o formato</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Clique em <strong>Gerar PDF</strong> para o relatório visual ou em{' '}
                    <strong>Exportar CSV</strong> para usar os dados em planilhas.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <span className="text-sm font-semibold">3</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    <p className="text-sm font-semibold text-gray-900">Arquivo gerado</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    O arquivo é aberto em nova aba (PDF) ou baixado para o seu dispositivo (CSV),
                    pronto para ser compartilhado ou arquivado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Filtro de período */}
        <Card>
          <CardHeader>
            <CardTitle>Período do relatório</CardTitle>
          </CardHeader>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Data Inicial"
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
              />
              <Input
                label="Data Final"
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
              />
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
