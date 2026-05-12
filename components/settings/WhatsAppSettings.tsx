"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Phone, Check, RefreshCw, AlertCircle, Loader2, Link, Unlink, Send } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

interface LinkStatus {
  linked: boolean;
  phone_number?: string;
  pending_verification?: boolean;
}

interface LinkCodeResponse {
  code: string;
  expires_in_minutes: number;
  bot_number: string;
  doctor_name: string;
}

export function WhatsAppSettings() {
  const [linkStatus, setLinkStatus] = useState<LinkStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeData, setCodeData] = useState<LinkCodeResponse | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Buscar token de autenticação
  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Carregar status da vinculação
  const loadLinkStatus = async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/whatsapp/link', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLinkStatus(data);
      }
    } catch (err) {
      console.error('Error loading WA status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLinkStatus();
  }, []);

  // Countdown timer para o código
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCodeData(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Polling para verificar vinculação após gerar código
  useEffect(() => {
    if (!codeData) return;
    
    const pollInterval = setInterval(async () => {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/whatsapp/link', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.linked) {
          setLinkStatus(data);
          setCodeData(null);
          setCountdown(0);
          setFeedback({ type: "success", message: "✅ WhatsApp vinculado com sucesso!" });
          clearInterval(pollInterval);
        }
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(pollInterval);
  }, [codeData]);

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    setFeedback(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const response = await fetch('/api/whatsapp/link', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar código');
      }

      setCodeData(data);
      setCountdown(data.expires_in_minutes * 60); // 10 minutos em segundos
      setFeedback({ type: "success", message: "Código gerado! Envie-o para o nosso WhatsApp." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Tem certeza que deseja desvincular seu WhatsApp? Você não poderá mais enviar fichas por lá.")) return;
    
    try {
      setIsUnlinking(true);
      const token = await getAuthToken();
      if (!token) throw new Error("Sessão expirada.");

      const response = await fetch('/api/whatsapp/link', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao desvincular');
      }

      setLinkStatus({ linked: false });
      setFeedback({ type: "success", message: "WhatsApp desvinculado com sucesso." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setIsUnlinking(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Formatar de 5511999999999 para +55 (11) 99999-9999
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0,2)} (${cleaned.slice(2,4)}) ${cleaned.slice(4,9)}-${cleaned.slice(9)}`;
    }
    return `+${cleaned}`;
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#25D366] mb-2" />
          <p className="text-sm text-gray-500">Carregando configurações de WhatsApp...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-[#25D366]" />
          Automação WhatsApp (IA)
        </CardTitle>
      </CardHeader>
      <div className="p-6">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#25D366] shadow-sm border border-green-100">
              <Link className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-green-900 mb-1">Capture procedimentos via WhatsApp</h4>
              <p className="text-xs text-green-700 leading-relaxed">
                Envie fotos de fichas anestésicas, guias ou recibos diretamente pelo WhatsApp. 
                Nossa IA extrai os dados automaticamente e você só precisa confirmar.
              </p>
            </div>
          </div>
        </div>

        {linkStatus?.linked ? (
          /* ═══ ESTADO: VINCULADO ═══ */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Conectado ao número</p>
                  <p className="text-sm font-semibold text-gray-900">{formatPhoneNumber(linkStatus.phone_number || '')}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUnlink}
                disabled={isUnlinking}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isUnlinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4 mr-1" />}
                Desvincular
              </Button>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs text-blue-700 leading-relaxed mb-4">
                <strong>Dica:</strong> Para registrar um procedimento, basta enviar a foto da ficha para o nosso bot no WhatsApp. 
                Você receberá uma mensagem de confirmação em instantes.
              </p>
              
              <Button 
                onClick={() => window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.replace(/\D/g, '') || ''}`, '_blank')}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg shadow-sm font-bold"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Abrir Conversa no WhatsApp
              </Button>
            </div>
          </div>
        ) : codeData ? (
          /* ═══ ESTADO: AGUARDANDO CÓDIGO ═══ */
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white border-2 border-dashed border-green-300 rounded-2xl p-6 text-center">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Seu código de vinculação</p>
              <div className="text-4xl font-black tracking-[0.2em] text-green-600 mb-4 font-mono">
                {codeData.code}
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Envie este código agora para o nosso assistente no WhatsApp:
              </p>
              
              <Button 
                onClick={() => window.open(`https://wa.me/${codeData.bot_number.replace(/\D/g, '')}?text=${codeData.code}`, '_blank')}
                className="w-full mb-4 bg-[#25D366] hover:bg-[#128C7E] text-white h-12 rounded-xl text-lg shadow-lg font-bold"
              >
                <Send className="w-5 h-5 mr-2" />
                Enviar Código pelo WhatsApp
              </Button>
              
              {countdown > 0 && (
                <div className="flex items-center justify-center gap-2 text-xs text-amber-600 mb-4">
                  <RefreshCw className="w-3 h-3" />
                  Expira em {formatCountdown(countdown)}
                </div>
              )}

              <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
                <p className="text-xs text-green-700">
                  <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                  Aguardando recebimento da mensagem... (a tela atualizará sozinha)
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => { setCodeData(null); setCountdown(0); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleGenerateCode}
                  disabled={isGeneratingCode}
                  className="text-green-600 hover:text-green-700"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isGeneratingCode ? 'animate-spin' : ''}`} />
                  Novo código
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ═══ ESTADO: NÃO VINCULADO ═══ */
          <div className="space-y-6">
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-6">
                Vincule seu número para começar a usar a automação por IA.
              </p>
              
              <Button 
                onClick={handleGenerateCode} 
                disabled={isGeneratingCode}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white px-8 h-12 rounded-xl font-bold"
              >
                {isGeneratingCode ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Phone className="w-5 h-5 mr-2" />}
                Vincular meu WhatsApp
              </Button>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold text-gray-900 uppercase">Como funciona?</h5>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold">1</div>
                  Clique em "Vincular meu WhatsApp" acima
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold">2</div>
                  Envie o código de 6 dígitos para o número do bot
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold">3</div>
                  Pronto! Suas fotos serão processadas automaticamente
                </div>
              </div>
            </div>
          </div>
        )}

        {feedback && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            feedback.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {feedback.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.message}
          </div>
        )}
      </div>
    </Card>
  );
}
