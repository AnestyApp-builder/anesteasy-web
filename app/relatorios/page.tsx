'use client'

import { 
  FileText, 
  Download, 
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Filter
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function Relatorios() {
  const reports = [
    {
      title: 'Relatório Mensal',
      description: 'Resumo completo das atividades do mês',
      type: 'Mensal',
      lastGenerated: '2024-01-15'
    },
    {
      title: 'Relatório de Procedimentos',
      description: 'Detalhamento de todos os procedimentos realizados',
      type: 'Procedimentos',
      lastGenerated: '2024-01-14'
    },
    {
      title: 'Relatório Financeiro',
      description: 'Análise completa da situação financeira',
      type: 'Financeiro',
      lastGenerated: '2024-01-13'
    },
    {
      title: 'Relatório de Pacientes',
      description: 'Estatísticas e dados dos pacientes atendidos',
      type: 'Pacientes',
      lastGenerated: '2024-01-12'
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
          <div className="mt-4 sm:mt-0">
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </div>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary-600" />
              </div>
              <CardTitle className="text-lg">Relatório Mensal</CardTitle>
              <p className="text-sm text-gray-600">Resumo completo do mês</p>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <PieChart className="w-8 h-8 text-secondary-600" />
              </div>
              <CardTitle className="text-lg">Relatório Financeiro</CardTitle>
              <p className="text-sm text-gray-600">Análise financeira detalhada</p>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-lg">Relatório de Procedimentos</CardTitle>
              <p className="text-sm text-gray-600">Estatísticas de procedimentos</p>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Relatório de Pacientes</CardTitle>
              <p className="text-sm text-gray-600">Dados dos pacientes</p>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios Recentes</CardTitle>
          </CardHeader>
          <div className="p-6">
            <div className="space-y-4">
              {reports.map((report, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary-600" />
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
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Filter className="w-4 h-4" />
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
