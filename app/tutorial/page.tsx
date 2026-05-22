'use client';

import React from 'react';
import { 
  MessageSquare, 
  Link as LinkIcon, 
  Star, 
  PlusCircle, 
  Camera, 
  ShieldCheck, 
  Smartphone,
  BookOpen,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/layout/Layout';

const TutorialPage = () => {
  const sections = [
    {
      id: 'whatsapp-link',
      title: 'Vincular WhatsApp',
      icon: <Smartphone className="w-5 h-5" />,
      description: 'Conecte seu número pessoal ao robô inteligente da AnestEasy.',
      steps: [
        'Acesse as Configurações no menu lateral.',
        'Clique na aba "WhatsApp".',
        'Gere seu código de vinculação exclusivo (6 dígitos).',
        'Mande esse código para o número oficial da AnestEasy.',
        'Receba a confirmação e pronto! Você já pode enviar fotos.'
      ]
    },
    {
      id: 'whatsapp-ocr',
      title: 'Criar via WhatsApp',
      icon: <Camera className="w-5 h-5" />,
      description: 'Registre procedimentos em segundos usando apenas a câmera.',
      steps: [
        'Tire uma foto nítida da ficha anestésica ou etiqueta do paciente.',
        'Envie para o bot da AnestEasy.',
        'Aguarde a leitura automática (IA).',
        'Confirme os dados (Paciente, Técnica e Cirurgia) via botões no WhatsApp.',
        'O registro aparecerá instantaneamente no seu painel web.'
      ]
    },
    {
      id: 'secretary-link',
      title: 'Link para Secretária',
      icon: <LinkIcon className="w-5 h-5" />,
      description: 'Compartilhe dados financeiros sem dar acesso à sua conta pessoal.',
      steps: [
        'Vá em "Secretária" no menu lateral.',
        'Crie um nome para o link (ex: Secretária Clínica X).',
        'Copie o link seguro gerado.',
        'Envie para sua secretária via WhatsApp.',
        'Ela verá apenas os dados necessários para cobrança e faturamento.'
      ]
    },
    {
      id: 'surgeon-feedback',
      title: 'Feedback do Cirurgião',
      icon: <Star className="w-5 h-5" />,
      description: 'Aumente seu marketing pessoal coletando avaliações de satisfação.',
      steps: [
        'No detalhe de qualquer procedimento, clique em "Solicitar Feedback".',
        'O sistema gera um link curto de satisfação.',
        'Envie para o cirurgião após o caso.',
        'Ele poderá dar notas (1-5 estrelas) e deixar comentários.',
        'As notas aparecem no seu dashboard para análise de qualidade.'
      ]
    },
    {
      id: 'manual-entry',
      title: 'Procedimento Manual',
      icon: <PlusCircle className="w-5 h-5" />,
      description: 'Cadastre casos detalhados quando não tiver a ficha em mãos.',
      steps: [
        'Clique no botão "+" ou "Novo Procedimento" no topo do painel.',
        'Preencha os campos obrigatórios (Nome, Data, Técnica).',
        'Você pode adicionar parcelas e formas de pagamento.',
        'Anexe fotos ou PDFs diretamente pelo computador.',
        'Clique em "Salvar" para finalizar o registro.'
      ]
    }
  ];

  return (
    <Layout>
      <div className="bg-slate-50 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          {/* Header Minimalista */}
          <div className="mb-12 md:mb-16 text-left border-b border-slate-200 pb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black mb-4 uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Documentação
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
              Central de <span className="text-teal-600">Ajuda</span>
            </h1>
            <p className="text-slate-500 text-base md:text-lg max-w-2xl">
              Guia prático para dominar as funcionalidades do AnestEasy e automatizar sua rotina.
            </p>
          </div>

          {/* Lista de Explicações Diretas */}
          <div className="space-y-16 md:space-y-24">
            {sections.map((section, idx) => (
              <section key={section.id} id={section.id} className="relative">
                {/* Título da Seção */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black shadow-lg shadow-teal-600/20">
                    {idx + 1}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <span className="text-teal-600/50">{section.icon}</span>
                    {section.title}
                  </h2>
                </div>

                {/* Descrição e Passos */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm">
                  <p className="text-slate-800 font-semibold mb-8 text-lg border-l-4 border-teal-500 pl-4">
                    {section.description}
                  </p>
                  
                  <div className="space-y-6">
                    {section.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex gap-5 items-start group">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-black mt-0.5 group-hover:bg-teal-600 group-hover:text-white transition-all">
                          {sIdx + 1}
                        </div>
                        <p className="text-slate-600 text-base md:text-lg leading-relaxed pt-px">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Dica Contextual */}
                  <div className="mt-10 pt-8 border-t border-slate-100">
                    <div className="flex items-start gap-3 text-emerald-700 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                      <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm leading-relaxed">
                        <span className="font-bold">Dica:</span> Esta funcionalidade foi desenhada para economizar até 5 minutos por procedimento registrado.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Footer de Suporte Direto */}
          <div className="mt-24 p-8 md:p-12 bg-white rounded-3xl border-2 border-slate-900 text-center shadow-xl">
            <div className="inline-flex p-3 rounded-2xl bg-teal-50 mb-6">
              <MessageSquare className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Precisa de ajuda personalizada?</h3>
            <p className="text-slate-500 mb-8 text-sm md:text-base">
              Nossa equipe técnica está disponível para te auxiliar em qualquer configuração.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white h-12 px-10 font-bold rounded-xl shadow-lg shadow-teal-900/20">
                Chamar no WhatsApp
              </Button>
              <Link href="/dashboard" className="w-full sm:w-auto text-slate-500 font-bold text-sm hover:text-slate-900 transition-colors">
                Voltar ao Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TutorialPage;
