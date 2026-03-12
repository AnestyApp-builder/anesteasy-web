'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Shield, FileText, Users, Scale, Heart, Stethoscope } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function Responsabilidade() {
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
                <AlertTriangle className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Responsabilidade e Limitações</h1>
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
                  <Heart className="w-5 h-5 mr-2" />
                  Introdução
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  A <strong>AnestEasy</strong> é uma plataforma de gestão profissional desenvolvida 
                  especificamente para anestesiologistas. Esta página esclarece as responsabilidades 
                  e limitações relacionadas ao uso de nossa plataforma.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  É fundamental compreender que nossa plataforma é uma ferramenta de apoio à gestão 
                  profissional e não substitui o julgamento clínico, a experiência médica ou as 
                  responsabilidades profissionais do usuário.
                </p>
              </CardContent>
            </Card>

            {/* Natureza da Plataforma */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Stethoscope className="w-5 h-5 mr-2" />
                  Natureza da Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  O AnestEasy é uma ferramenta de gestão administrativa e organizacional que oferece:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Gestão de Procedimentos:</strong> Registro e acompanhamento de procedimentos realizados</li>
                  <li><strong>Controle Financeiro:</strong> Acompanhamento de receitas e metas profissionais</li>
                  <li><strong>Agenda Profissional:</strong> Organização de turnos e escalas de trabalho</li>
                  <li><strong>Relatórios:</strong> Geração de relatórios estatísticos e de performance</li>
                  <li><strong>Feedback:</strong> Sistema de avaliação pós-procedimento</li>
                </ul>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>⚠️ Importante:</strong> Esta plataforma NÃO oferece consultoria médica, 
                    diagnóstico, tratamento ou qualquer tipo de orientação clínica.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Responsabilidades do Usuário */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Users className="w-5 h-5 mr-2" />
                  Responsabilidades do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Como usuário da plataforma, você é integralmente responsável por:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Decisões Clínicas:</strong> Todas as decisões médicas e de tratamento</li>
                  <li><strong>Conformidade Profissional:</strong> Cumprimento das normas do CRM e regulamentações</li>
                  <li><strong>Precisão dos Dados:</strong> Veracidade e atualização das informações inseridas</li>
                  <li><strong>Segurança da Conta:</strong> Proteção de credenciais e acesso à plataforma</li>
                  <li><strong>Confidencialidade:</strong> Manutenção da privacidade dos dados dos pacientes</li>
                  <li><strong>Backup de Dados:</strong> Manutenção de cópias de segurança importantes</li>
                  <li><strong>Uso Adequado:</strong> Utilização da plataforma apenas para fins profissionais legítimos</li>
                </ul>
              </CardContent>
            </Card>

            {/* Limitações da Plataforma */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Limitações da Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  A AnestEasy não se responsabiliza por:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Decisões Médicas:</strong> Qualquer decisão clínica baseada em dados da plataforma</li>
                  <li><strong>Resultados de Tratamento:</strong> Eficácia ou resultados de procedimentos médicos</li>
                  <li><strong>Conformidade Regulatória:</strong> Cumprimento de normas específicas de cada instituição</li>
                  <li><strong>Dados de Terceiros:</strong> Informações fornecidas por outros usuários ou sistemas</li>
                  <li><strong>Interrupções de Serviço:</strong> Perdas decorrentes de indisponibilidade temporária</li>
                  <li><strong>Uso Indevido:</strong> Consequências do uso inadequado da plataforma</li>
                </ul>
              </CardContent>
            </Card>

            {/* Limitação de Responsabilidade */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Scale className="w-5 h-5 mr-2" />
                  Limitação de Responsabilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Nossa responsabilidade é limitada conforme segue:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Valor Máximo:</strong> Limitada ao valor pago pelos serviços nos últimos 12 meses</li>
                  <li><strong>Danos Indiretos:</strong> Não nos responsabilizamos por danos indiretos ou consequenciais</li>
                  <li><strong>Lucros Cessantes:</strong> Não cobrimos perda de lucros ou oportunidades</li>
                  <li><strong>Dados Perdidos:</strong> Responsabilidade limitada à restauração de dados quando possível</li>
                  <li><strong>Força Maior:</strong> Isentos de responsabilidade em casos de força maior</li>
                </ul>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg mt-4">
                  <p className="text-red-800 text-sm">
                    <strong>🚨 Exclusão:</strong> Não nos responsabilizamos por danos relacionados a 
                    decisões médicas, tratamento de pacientes ou consequências clínicas.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Disponibilidade do Serviço */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Shield className="w-5 h-5 mr-2" />
                  Disponibilidade do Serviço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Embora nos esforcemos para manter a plataforma sempre disponível:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Manutenção Programada:</strong> Podem ocorrer interrupções para atualizações</li>
                  <li><strong>Problemas Técnicos:</strong> Falhas técnicas podem causar indisponibilidade temporária</li>
                  <li><strong>Força Maior:</strong> Eventos fora de nosso controle podem afetar o serviço</li>
                  <li><strong>Atualizações:</strong> Melhorias podem requerer reinicializações</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Recomendamos sempre manter cópias de segurança de informações críticas.
                </p>
              </CardContent>
            </Card>

            {/* Segurança e Privacidade */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Shield className="w-5 h-5 mr-2" />
                  Segurança e Privacidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Implementamos medidas de segurança robustas, mas:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Nenhum Sistema é 100% Seguro:</strong> Risco de violação sempre existe</li>
                  <li><strong>Responsabilidade Compartilhada:</strong> Usuário deve proteger suas credenciais</li>
                  <li><strong>Notificação de Violações:</strong> Informaremos sobre incidentes de segurança</li>
                  <li><strong>Medidas de Mitigação:</strong> Implementaremos ações para minimizar riscos</li>
                </ul>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
                  <p className="text-blue-800 text-sm">
                    <strong>💡 Dica:</strong> Use senhas fortes, ative autenticação de dois fatores 
                    quando disponível e mantenha seus dados de login seguros.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Conformidade Regulatória */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <FileText className="w-5 h-5 mr-2" />
                  Conformidade Regulatória
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  É responsabilidade do usuário garantir:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Regulamentações do CRM:</strong> Cumprimento das normas do Conselho Regional de Medicina</li>
                  <li><strong>Normas Institucionais:</strong> Conformidade com políticas de hospitais e clínicas</li>
                  <li><strong>Leis Aplicáveis:</strong> Observância de todas as leis e regulamentos pertinentes</li>
                  <li><strong>Documentação Médica:</strong> Manutenção adequada de prontuários e registros</li>
                  <li><strong>Consentimento Informado:</strong> Obtenção de autorizações necessárias</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  A plataforma não garante conformidade automática com todas as regulamentações.
                </p>
              </CardContent>
            </Card>

            {/* Backup e Recuperação */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Shield className="w-5 h-5 mr-2" />
                  Backup e Recuperação de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Embora mantenhamos backups regulares:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Responsabilidade Compartilhada:</strong> Usuário deve manter cópias importantes</li>
                  <li><strong>Limitação de Recuperação:</strong> Nem todos os dados podem ser recuperados</li>
                  <li><strong>Tempo de Recuperação:</strong> Processo pode levar tempo considerável</li>
                  <li><strong>Dados Excluídos:</strong> Informações deletadas podem não ser recuperáveis</li>
                </ul>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg mt-4">
                  <p className="text-green-800 text-sm">
                    <strong>✅ Recomendação:</strong> Mantenha sempre cópias de segurança de 
                    informações críticas em sistemas externos.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Modificações e Atualizações */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Modificações e Atualizações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Reservamo-nos o direito de:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Atualizar Funcionalidades:</strong> Modificar ou remover recursos</li>
                  <li><strong>Alterar Interface:</strong> Mudar layout e design da plataforma</li>
                  <li><strong>Atualizar Termos:</strong> Modificar estes termos de responsabilidade</li>
                  <li><strong>Descontinuar Serviços:</strong> Encerrar funcionalidades específicas</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Usuários serão notificados sobre mudanças significativas com antecedência.
                </p>
              </CardContent>
            </Card>

            {/* Contato */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Users className="w-5 h-5 mr-2" />
                  Contato e Suporte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Para questões sobre responsabilidades, limitações ou suporte técnico:
                </p>
                <div className="bg-primary-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> contato@anesteasyapp.com.br<br />
                    <strong>Telefone:</strong> (34) 99212-3878<br />
                    <strong>Horário de atendimento:</strong> Segunda a sexta, 8h às 18h
                  </p>
                </div>
                <p className="text-gray-700 leading-relaxed text-sm">
                  Para questões médicas ou clínicas, consulte sempre um profissional 
                  de saúde qualificado.
                </p>
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
                <Link href="/termos" className="text-primary-600 hover:text-primary-700 text-sm">
                  Termos de Uso
                </Link>
                <Link href="/politica-privacidade" className="text-primary-600 hover:text-primary-700 text-sm">
                  Política de Privacidade
                </Link>
              </div>
            </div>
          </div>
        </div>
    </PublicLayout>
  )
}
