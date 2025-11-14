'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck, AlertCircle, FileText } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function PoliticaPrivacidade() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Link>
            
            <div className="flex items-center mb-4">
              <div className="p-3 bg-primary-100 rounded-lg mr-4">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Política de Privacidade</h1>
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
                  <Eye className="w-5 h-5 mr-2" />
                  Introdução
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  A <strong>AnestEasy</strong> está comprometida em proteger sua privacidade e dados pessoais. 
                  Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos 
                  suas informações quando você utiliza nossa plataforma.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD) 
                  e outras regulamentações aplicáveis de proteção de dados.
                </p>
              </CardContent>
            </Card>

            {/* Informações Coletadas */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Database className="w-5 h-5 mr-2" />
                  Informações que Coletamos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Dados Pessoais:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Nome completo</li>
                      <li>Endereço de e-mail</li>
                      <li>Número de CRM</li>
                      <li>Especialidade médica</li>
                      <li>Telefone de contato</li>
                      <li>Sexo (opcional)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Dados de Uso:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Logs de acesso e atividade</li>
                      <li>Informações do dispositivo e navegador</li>
                      <li>Endereço IP</li>
                      <li>Data e hora das sessões</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Dados Profissionais:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Informações sobre procedimentos realizados</li>
                      <li>Dados financeiros e de receita</li>
                      <li>Agenda e escalas de trabalho</li>
                      <li>Metas e objetivos profissionais</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Como Usamos as Informações */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Como Usamos suas Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Utilizamos suas informações para:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Prestação do Serviço:</strong> Fornecer funcionalidades da plataforma</li>
                  <li><strong>Autenticação:</strong> Verificar sua identidade e autorizar acesso</li>
                  <li><strong>Comunicação:</strong> Enviar notificações importantes sobre o serviço</li>
                  <li><strong>Melhorias:</strong> Analisar uso para melhorar a plataforma</li>
                  <li><strong>Suporte:</strong> Prestar assistência técnica quando necessário</li>
                  <li><strong>Segurança:</strong> Detectar e prevenir fraudes ou uso indevido</li>
                  <li><strong>Conformidade:</strong> Cumprir obrigações legais e regulamentares</li>
                </ul>
              </CardContent>
            </Card>

            {/* Base Legal */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <FileText className="w-5 h-5 mr-2" />
                  Base Legal para Processamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Processamos seus dados pessoais com base nas seguintes justificativas legais:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Execução de Contrato:</strong> Para fornecer os serviços contratados</li>
                  <li><strong>Interesse Legítimo:</strong> Para melhorar nossos serviços e segurança</li>
                  <li><strong>Consentimento:</strong> Quando você nos autoriza expressamente</li>
                  <li><strong>Obrigação Legal:</strong> Para cumprir requisitos legais aplicáveis</li>
                </ul>
              </CardContent>
            </Card>

            {/* Compartilhamento de Dados */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Compartilhamento de Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros, 
                  exceto nas seguintes situações:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Prestadores de Serviço:</strong> Empresas que nos auxiliam na operação da plataforma</li>
                  <li><strong>Obrigação Legal:</strong> Quando exigido por lei ou autoridades competentes</li>
                  <li><strong>Proteção de Direitos:</strong> Para proteger nossos direitos ou segurança</li>
                  <li><strong>Consentimento:</strong> Quando você autoriza expressamente</li>
                </ul>
                <div className="bg-primary-50 p-4 rounded-lg mt-4">
                  <p className="text-gray-700 text-sm">
                    <strong>Importante:</strong> Todos os prestadores de serviço são obrigados a manter 
                    a confidencialidade e segurança de seus dados.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Segurança dos Dados */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Lock className="w-5 h-5 mr-2" />
                  Segurança dos Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Criptografia:</strong> Dados criptografados em trânsito e em repouso</li>
                  <li><strong>Controle de Acesso:</strong> Acesso restrito apenas a pessoal autorizado</li>
                  <li><strong>Monitoramento:</strong> Sistemas de monitoramento 24/7</li>
                  <li><strong>Backup Seguro:</strong> Cópias de segurança regulares e seguras</li>
                  <li><strong>Atualizações:</strong> Manutenção regular de sistemas e softwares</li>
                  <li><strong>Treinamento:</strong> Capacitação contínua da equipe em segurança</li>
                </ul>
              </CardContent>
            </Card>

            {/* Seus Direitos */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Shield className="w-5 h-5 mr-2" />
                  Seus Direitos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  De acordo com a LGPD, você tem os seguintes direitos:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>Acesso:</strong> Solicitar informações sobre seus dados</li>
                  <li><strong>Correção:</strong> Corrigir dados incompletos ou incorretos</li>
                  <li><strong>Exclusão:</strong> Solicitar a exclusão de seus dados</li>
                  <li><strong>Portabilidade:</strong> Transferir seus dados para outro serviço</li>
                  <li><strong>Oposição:</strong> Opor-se ao processamento de seus dados</li>
                  <li><strong>Revogação:</strong> Revogar consentimento a qualquer momento</li>
                </ul>
                <div className="bg-primary-50 p-4 rounded-lg mt-4">
                  <p className="text-gray-700 text-sm">
                    <strong>Como exercer seus direitos:</strong> Entre em contato conosco através do 
                    e-mail contato@anesteasy.com.br ou através das configurações da plataforma.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Retenção de Dados */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Database className="w-5 h-5 mr-2" />
                  Retenção de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Mantemos seus dados pessoais apenas pelo tempo necessário para:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Fornecer os serviços contratados</li>
                  <li>Cumprir obrigações legais</li>
                  <li>Resolver disputas</li>
                  <li>Fazer cumprir nossos acordos</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Após o encerramento da conta, os dados são mantidos por 30 dias para fins 
                  de backup e posteriormente excluídos permanentemente.
                </p>
              </CardContent>
            </Card>

            {/* Cookies e Tecnologias Similares */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Eye className="w-5 h-5 mr-2" />
                  Cookies e Tecnologias Similares
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Utilizamos cookies e tecnologias similares para:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Manter sua sessão ativa</li>
                  <li>Lembrar suas preferências</li>
                  <li>Melhorar a experiência de uso</li>
                  <li>Analisar o uso da plataforma</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Você pode gerenciar as configurações de cookies através do seu navegador.
                </p>
              </CardContent>
            </Card>

            {/* Transferência Internacional */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Transferência Internacional de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Alguns de nossos prestadores de serviço podem estar localizados fora do Brasil. 
                  Quando isso ocorrer, garantimos que:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>O país de destino oferece nível adequado de proteção</li>
                  <li>Existem salvaguardas apropriadas em vigor</li>
                  <li>Você foi informado sobre a transferência</li>
                </ul>
              </CardContent>
            </Card>

            {/* Alterações na Política */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <FileText className="w-5 h-5 mr-2" />
                  Alterações nesta Política
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Podemos atualizar esta Política de Privacidade periodicamente. 
                  Quando isso ocorrer:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Publicaremos a versão atualizada na plataforma</li>
                  <li>Notificaremos sobre mudanças significativas</li>
                  <li>Manteremos versões anteriores disponíveis</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  O uso continuado da plataforma após as alterações constitui 
                  aceitação da nova política.
                </p>
              </CardContent>
            </Card>

            {/* Contato */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center text-primary-600">
                  <Shield className="w-5 h-5 mr-2" />
                  Contato e Dúvidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Para questões sobre esta Política de Privacidade ou para exercer seus direitos, 
                  entre em contato conosco:
                </p>
                <div className="bg-primary-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> contato@anesteasy.com.br<br />
                    <strong>Telefone:</strong> (11) 99999-9999<br />
                    <strong>Horário de atendimento:</strong> Segunda a sexta, 8h às 18h
                  </p>
                </div>
                <p className="text-gray-700 leading-relaxed text-sm">
                  Você também pode entrar em contato com a Autoridade Nacional de Proteção de Dados 
                  (ANPD) caso tenha dúvidas sobre o tratamento de seus dados pessoais.
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
                <Link href="/responsabilidade" className="text-primary-600 hover:text-primary-700 text-sm">
                  Responsabilidade
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
