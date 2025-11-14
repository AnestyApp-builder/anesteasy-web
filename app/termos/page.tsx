'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Shield, Users, AlertTriangle, Scale } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function TermosUso() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Link>
            
            <div className="flex items-center mb-4">
              <div className="p-3 bg-primary-100 rounded-lg mr-4">
                <FileText className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Termos de Uso</h1>
                <p className="text-gray-600 mt-1">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="space-y-6">
            {/* Introdução */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Scale className="w-5 h-5 mr-2" />
                  Introdução
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Bem-vindo ao <strong>AnestEasy</strong>, uma plataforma digital desenvolvida para profissionais 
                  da área de anestesiologia gerenciarem seus procedimentos, agenda e dados financeiros de forma 
                  eficiente e segura.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Estes Termos de Uso ("Termos") regem o uso da plataforma AnestEasy ("Plataforma", "Serviço") 
                  operada por nossa empresa. Ao acessar ou usar nossa plataforma, você concorda em cumprir 
                  estes termos.
                </p>
              </CardContent>
            </Card>

            {/* Aceitação dos Termos */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Shield className="w-5 h-5 mr-2" />
                  Aceitação dos Termos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Ao criar uma conta ou usar nossos serviços, você confirma que:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Leu e compreendeu estes Termos de Uso</li>
                  <li>Concorda em cumprir todas as disposições aqui estabelecidas</li>
                  <li>Possui capacidade legal para celebrar este acordo</li>
                  <li>É um profissional da área de saúde devidamente credenciado</li>
                </ul>
              </CardContent>
            </Card>

            {/* Descrição do Serviço */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Users className="w-5 h-5 mr-2" />
                  Descrição do Serviço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  O AnestEasy oferece as seguintes funcionalidades:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Gestão de Procedimentos:</strong> Cadastro e acompanhamento de procedimentos anestésicos</li>
                  <li><strong>Agenda Profissional:</strong> Organização de turnos e escalas de trabalho</li>
                  <li><strong>Controle Financeiro:</strong> Acompanhamento de receitas e metas financeiras</li>
                  <li><strong>Relatórios:</strong> Geração de relatórios e análises de performance</li>
                  <li><strong>Feedback de Pacientes:</strong> Sistema de avaliação pós-procedimento</li>
                </ul>
              </CardContent>
            </Card>

            {/* Responsabilidades do Usuário */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Responsabilidades do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Como usuário da plataforma, você se compromete a:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Fornecer informações verdadeiras e atualizadas</li>
                  <li>Manter a confidencialidade de sua senha e conta</li>
                  <li>Usar a plataforma apenas para fins profissionais legítimos</li>
                  <li>Respeitar a privacidade e confidencialidade dos dados dos pacientes</li>
                  <li>Não compartilhar sua conta com terceiros</li>
                  <li>Reportar qualquer uso indevido ou violação de segurança</li>
                </ul>
              </CardContent>
            </Card>

            {/* Uso Aceitável */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Shield className="w-5 h-5 mr-2" />
                  Uso Aceitável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  É expressamente proibido:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Usar a plataforma para atividades ilegais ou não autorizadas</li>
                  <li>Tentar acessar contas de outros usuários</li>
                  <li>Interferir no funcionamento da plataforma</li>
                  <li>Distribuir malware ou código malicioso</li>
                  <li>Violar direitos de propriedade intelectual</li>
                  <li>Usar a plataforma para spam ou comunicações não solicitadas</li>
                </ul>
              </CardContent>
            </Card>

            {/* Privacidade e Dados */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Shield className="w-5 h-5 mr-2" />
                  Privacidade e Proteção de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  A proteção de seus dados é nossa prioridade. Consulte nossa 
                  <Link href="/politica-privacidade" className="text-primary-600 hover:text-primary-700 underline ml-1">
                    Política de Privacidade
                  </Link> para informações detalhadas sobre como coletamos, 
                  usamos e protegemos suas informações.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Todos os dados são criptografados e armazenados em servidores seguros, 
                  seguindo as melhores práticas de segurança da informação.
                </p>
              </CardContent>
            </Card>

            {/* Limitação de Responsabilidade */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Limitação de Responsabilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  O AnestEasy é fornecido "como está" e não garantimos que:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>O serviço será ininterrupto ou livre de erros</li>
                  <li>Os resultados obtidos serão precisos ou confiáveis</li>
                  <li>Defeitos serão corrigidos</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Nossa responsabilidade é limitada ao valor pago pelos serviços nos últimos 12 meses.
                </p>
              </CardContent>
            </Card>

            {/* Modificações */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <FileText className="w-5 h-5 mr-2" />
                  Modificações dos Termos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Reservamo-nos o direito de modificar estes termos a qualquer momento. 
                  As alterações entrarão em vigor imediatamente após a publicação na plataforma.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  O uso continuado da plataforma após as modificações constitui aceitação 
                  dos novos termos.
                </p>
              </CardContent>
            </Card>

            {/* Rescisão */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Rescisão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Você pode encerrar sua conta a qualquer momento através das configurações 
                  da plataforma. Podemos suspender ou encerrar sua conta em caso de 
                  violação destes termos.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Após o encerramento, seus dados serão mantidos por 30 dias para fins 
                  de backup, sendo posteriormente excluídos permanentemente.
                </p>
              </CardContent>
            </Card>

            {/* Contato */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Users className="w-5 h-5 mr-2" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Para dúvidas sobre estes Termos de Uso, entre em contato conosco:
                </p>
                <div className="bg-primary-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> contato@anesteasy.com.br<br />
                    <strong>Telefone:</strong> (11) 99999-9999<br />
                    <strong>Horário de atendimento:</strong> Segunda a sexta, 8h às 18h
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} AnestEasy. Todos os direitos reservados.
              </p>
              <div className="flex space-x-4 mt-4 sm:mt-0">
                <Link href="/politica-privacidade" className="text-primary-600 hover:text-primary-700 text-sm">
                  Política de Privacidade
                </Link>
                <Link href="/responsabilidade" className="text-primary-600 hover:text-primary-700 text-sm">
                  Responsabilidade
                </Link>
              </div>
            </div>
          </div>
        </div>
    </PublicLayout>
  )
}
