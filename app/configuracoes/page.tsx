"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  User,
  Shield,
  Palette,
  Database,
  Check,
  AlertCircle,
  Users,
  Plus,
  X,
  Mail,
  Phone,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  RefreshCw,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";

function ConfiguracoesContent() {
  const { user, updateUser, deleteAccount, isLoading, isAuthenticated } =
    useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    crm: "",
    specialty: "",
    phone: "",
    gender: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Estados para gerenciamento de assinatura
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundEligibility, setRefundEligibility] = useState<{
    eligible: boolean;
    daysUsed: number;
    reason?: string;
  } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelImmediately, setCancelImmediately] = useState(false);

  // Estados para Link da Secretária
  const [secretaryLink, setSecretaryLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkLoading, setLinkLoading] = useState(true);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [activeLinkInfo, setActiveLinkInfo] = useState<{ id: string; expires_at: string; token?: string } | null>(null);
  const [isLinkVisible, setIsLinkVisible] = useState(false);

  // Verificar autenticação e redirecionar se necessário
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

  }, [isLoading, isAuthenticated, router]);

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        crm: user.crm || "",
        specialty: user.specialty || "",
        phone: user.phone || "",
        gender: user.gender || "",
      });
    }
  }, [user]);

  // Carregar assinatura do usuário
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) {
        setSubscriptionLoading(false);
        return;
      }

      try {
        setSubscriptionLoading(true);
        const { supabase } = await import("@/lib/supabase");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setSubscriptionLoading(false);
          return;
        }

        const response = await fetch("/api/stripe/subscription", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);

          // Verificar elegibilidade para reembolso se tiver assinatura
          if (data.subscription && data.subscription.id) {
            const { checkRefundEligibility } =
              await import("@/lib/subscription-access");
            const eligibility = await checkRefundEligibility(
              data.subscription.id,
            );
            setRefundEligibility(eligibility);
          }
        } else if (response.status === 404) {
          setSubscription(null);
        }
      } catch (error) {
      } finally {
        setSubscriptionLoading(false);
      }
    };

    loadSubscription();
  }, [user]);

  // Carregar link da secretária
  useEffect(() => {
    const loadSecretaryLink = async () => {
      if (!user) return;
      try {
        setLinkLoading(true);
        const response = await fetch('/api/secretary/link');
        const data = await response.json();
        if (data.activeLink) {
          setActiveLinkInfo({ 
            id: data.id, 
            expires_at: data.expires_at,
            token: data.token 
          });
          // Se tiver token, já podemos montar o link
          if (data.token) {
            const origin = window.location.origin;
            setSecretaryLink(`${origin}/secretaria/${data.token}`);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar link da secretária:', err);
      } finally {
        setLinkLoading(false);
      }
    };
    loadSecretaryLink();
  }, [user]);

  const handleGenerateLink = async () => {
    if (!confirm('Deseja gerar um novo link? O link anterior (se existir) será invalidado imediatamente.')) {
      return;
    }

    setIsGeneratingLink(true);
    try {
      const response = await fetch('/api/secretary/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          permissions: { can_update_status: true, view_values: true } 
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSecretaryLink(data.url);
        setFeedbackMessage({ type: 'success', message: 'Novo link gerado com sucesso!' });
      } else {
        throw new Error(data.error || 'Erro ao gerar link');
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', message: err.message });
    } finally {
      setIsGeneratingLink(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 3000);
  };


  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Não renderizar se não estiver autenticado (será redirecionado)
  if (!isAuthenticated) {
    return null;
  }

  // Função para atualizar campo
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Função para salvar alterações
  const saveProfile = async () => {
    if (!user) {
      setFeedbackMessage({
        type: "error",
        message: "Erro: Usuário não encontrado. Faça login novamente.",
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      const success = await updateUser(formData);

      if (success) {
        setFeedbackMessage({
          type: "success",
          message: "Perfil atualizado com sucesso!",
        });
        setTimeout(() => setFeedbackMessage(null), 3000);
      } else {
        setFeedbackMessage({
          type: "error",
          message:
            "Erro ao atualizar perfil. Verifique o console para mais detalhes.",
        });
        setTimeout(() => setFeedbackMessage(null), 5000);
      }
    } catch (error) {
      setFeedbackMessage({
        type: "error",
        message: `Erro ao salvar alterações: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };


  // Função para alterar senha
  const handleChangePassword = async () => {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setFeedbackMessage({
        type: "error",
        message: "Preencha todos os campos.",
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setFeedbackMessage({
        type: "error",
        message: "A nova senha deve ter pelo menos 6 caracteres.",
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFeedbackMessage({
        type: "error",
        message: "As senhas não coincidem.",
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    setIsUpdatingPassword(true);
    setFeedbackMessage(null);

    try {
      // Importar authService dinamicamente para evitar problemas de SSR
      const { authService } = await import("@/lib/auth");

      const result = await authService.updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );

      if (result.success) {
        setFeedbackMessage({
          type: "success",
          message: "Senha alterada com sucesso!",
        });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPasswordModal(false);
        setTimeout(() => setFeedbackMessage(null), 3000);
      } else {
        setFeedbackMessage({
          type: "error",
          message: result.message || "Erro ao alterar senha.",
        });
        setTimeout(() => setFeedbackMessage(null), 5000);
      }
    } catch (error) {
      setFeedbackMessage({
        type: "error",
        message: `Erro interno ao alterar senha: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Funções de gerenciamento de assinatura
  const handleChangePlan = async (newPlanType: string) => {
    if (!subscription) return;

    try {
      setIsChangingPlan(true);
      setFeedbackMessage(null);

      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setFeedbackMessage({
          type: "error",
          message: "Sessão expirada. Por favor, faça login novamente.",
        });
        setTimeout(() => setFeedbackMessage(null), 3000);
        return;
      }

      const response = await fetch("/api/stripe/subscription/change-plan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription_id: subscription.stripe_subscription_id,
          new_plan_type: newPlanType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao agendar mudança de plano");
      }

      setFeedbackMessage({
        type: "success",
        message: data.message || "Mudança de plano agendada com sucesso!",
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
      setShowChangePlanModal(false);

      // Recarregar assinatura
      const reloadResponse = await fetch("/api/stripe/subscription", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json();
        setSubscription(reloadData.subscription);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        message: err.message || "Erro ao agendar mudança de plano",
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } finally {
      setIsChangingPlan(false);
    }
  };

  const handleRequestRefund = async () => {
    if (!subscription) return;

    if (!refundEligibility?.eligible) {
      setFeedbackMessage({
        type: "error",
        message:
          refundEligibility?.reason ||
          "Você não é elegível para reembolso (mínimo de 8 dias de uso)",
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
      return;
    }

    if (
      !confirm(
        `Tem certeza que deseja solicitar reembolso? Você utilizou a plataforma por ${refundEligibility.daysUsed} dias. O valor será reembolsado e sua assinatura será cancelada.`,
      )
    ) {
      return;
    }

    try {
      setIsProcessingRefund(true);
      setFeedbackMessage(null);

      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setFeedbackMessage({
          type: "error",
          message: "Sessão expirada. Por favor, faça login novamente.",
        });
        setTimeout(() => setFeedbackMessage(null), 3000);
        return;
      }

      const response = await fetch("/api/stripe/subscription/refund", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription_id: subscription.stripe_subscription_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar reembolso");
      }

      setFeedbackMessage({
        type: "success",
        message: data.message || "Reembolso processado com sucesso!",
      });
      setTimeout(() => setFeedbackMessage(null), 8000);
      setShowRefundModal(false);

      // Recarregar assinatura
      const reloadResponse = await fetch("/api/stripe/subscription", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json();
        setSubscription(reloadData.subscription);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        message: err.message || "Erro ao processar reembolso",
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const getAvailablePlansForChange = () => {
    if (!subscription) return [];

    const currentPlanIndex = ["monthly", "quarterly", "annual"].indexOf(
      subscription.plan_type,
    );
    const allPlans = ["monthly", "quarterly", "annual"];

    return allPlans.filter((plan, index) => index !== currentPlanIndex);
  };

  const PLAN_NAMES: Record<string, string> = {
    monthly: "Plano Mensal",
    quarterly: "Plano Trimestral",
    annual: "Plano Anual",
  };

  const PLAN_PRICES: Record<string, number> = {
    monthly: 79.0,
    quarterly: 225.0,
    annual: 850.0,
  };

  const handleCancelSubscription = async (immediately: boolean = false) => {
    if (!subscription) return;

    // Verificar se já está cancelada
    if (
      subscription.status === "cancelled" ||
      subscription.status === "expired"
    ) {
      setFeedbackMessage({
        type: "error",
        message: "Esta assinatura já foi cancelada.",
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    // Abrir modal de confirmação
    setCancelImmediately(immediately);
    setShowCancelModal(true);
  };

  const confirmCancelSubscription = async () => {
    if (!subscription) return;

    setShowCancelModal(false);

    try {
      setIsCancelling(true);
      setFeedbackMessage(null);

      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setFeedbackMessage({
          type: "error",
          message: "Sessão expirada. Por favor, faça login novamente.",
        });
        setTimeout(() => setFeedbackMessage(null), 3000);
        return;
      }

      const response = await fetch("/api/stripe/subscription/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription_id: subscription.stripe_subscription_id,
          cancel_immediately: cancelImmediately,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Verificar se o erro é porque já está cancelada
        const errorMessage = data.error || "Erro ao cancelar assinatura";
        if (
          errorMessage.toLowerCase().includes("canceled") ||
          errorMessage.toLowerCase().includes("cancelada")
        ) {
          // Assinatura já estava cancelada, apenas atualizar dados
          const reloadResponse = await fetch("/api/stripe/subscription", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          if (reloadResponse.ok) {
            const reloadData = await reloadResponse.json();
            setSubscription(reloadData.subscription);
          }
          setFeedbackMessage({
            type: "success",
            message: "Esta assinatura já estava cancelada.",
          });
          setTimeout(() => setFeedbackMessage(null), 5000);
          return;
        }
        throw new Error(errorMessage);
      }

      // Mostrar mensagem de sucesso
      if (data.success) {
        setFeedbackMessage({
          type: "success",
          message:
            data.message ||
            (cancelImmediately
              ? "Assinatura cancelada com sucesso. Você perdeu o acesso imediatamente."
              : "Assinatura será cancelada ao fim do período atual. Você manterá o acesso até então."),
        });
        setTimeout(() => setFeedbackMessage(null), 5000);
      }

      // Recarregar assinatura
      const reloadResponse = await fetch("/api/stripe/subscription", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json();
        setSubscription(reloadData.subscription);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Erro ao cancelar assinatura";
      // Verificar se o erro é porque já está cancelada
      if (
        errorMessage.toLowerCase().includes("canceled") ||
        errorMessage.toLowerCase().includes("cancelada")
      ) {
        setFeedbackMessage({
          type: "error",
          message: "Esta assinatura já está cancelada.",
        });
        // Recarregar para atualizar status
        const { supabase } = await import("@/lib/supabase");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          const reloadResponse = await fetch("/api/stripe/subscription", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          if (reloadResponse.ok) {
            const reloadData = await reloadResponse.json();
            setSubscription(reloadData.subscription);
          }
        }
      } else {
        setFeedbackMessage({
          type: "error",
          message: errorMessage,
        });
      }
      setTimeout(() => setFeedbackMessage(null), 5000);
    } finally {
      setIsCancelling(false);
    }
  };

  // Função para excluir conta
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "EXCLUIR") {
      setFeedbackMessage({
        type: "error",
        message: 'Digite "EXCLUIR" para confirmar a exclusão.',
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
      return;
    }

    setIsDeleting(true);
    setFeedbackMessage(null);

    try {
      const success = await deleteAccount();

      if (success) {
        setFeedbackMessage({
          type: "success",
          message:
            "Conta excluída com sucesso! Todos os dados foram removidos.",
        });
        setShowDeleteModal(false);
        setDeleteConfirmation("");

        // Aguardar um pouco antes de redirecionar para mostrar a mensagem
        setTimeout(() => {
          // O redirecionamento será feito automaticamente pelo contexto
        }, 2000);
      } else {
        setFeedbackMessage({
          type: "error",
          message:
            "Erro ao excluir conta. Verifique o console para mais detalhes.",
        });
        setTimeout(() => setFeedbackMessage(null), 8000);
      }
    } catch (error) {
      setFeedbackMessage({
        type: "error",
        message:
          "Erro interno ao excluir conta. Verifique o console para mais detalhes.",
      });
      setTimeout(() => setFeedbackMessage(null), 8000);
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-600 mt-1">
              Gerencie suas preferências e configurações
            </p>
          </div>
        </div>

        {/* Feedback Message */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-lg flex items-center ${
              feedbackMessage.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {feedbackMessage.type === "success" ? (
              <Check className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {feedbackMessage.message}
          </div>
        )}

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Perfil
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <Input
                label="Nome completo"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Digite seu nome completo"
              />
              <Input
                label="Email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                type="email"
                placeholder="Digite seu email"
              />
              <Input
                label="CRM"
                value={formData.crm}
                onChange={(e) => updateField("crm", e.target.value)}
                placeholder="Digite seu CRM"
              />
              <Input
                label="Especialidade"
                value={formData.specialty}
                onChange={(e) => updateField("specialty", e.target.value)}
                placeholder="Digite sua especialidade"
              />
              <Input
                label="Telefone"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Digite seu telefone"
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-600">
                  Sexo
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Selecione seu sexo</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Other">Outro</option>
                </select>
              </div>
              <Button
                onClick={saveProfile}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Segurança
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowPasswordModal(true)}
              >
                Alterar Senha
              </Button>
            </div>
          </Card>

          {/* Subscription/Plan Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Plano
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              {subscriptionLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Carregando informações da assinatura...
                  </p>
                </div>
              ) : !subscription ? (
                <div className="text-center py-6">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Nenhuma assinatura ativa
                  </p>
                  <p className="text-xs text-gray-600 mb-4">
                    Assine um plano para continuar usando todas as
                    funcionalidades.
                  </p>
                  <Button
                    onClick={() => router.push("/planos")}
                    className="w-full"
                  >
                    Ver Planos Disponíveis
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status e Plano */}
                  <div className="bg-gradient-to-r from-primary-50 to-white rounded-lg p-4 border border-primary-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          Plano Atual
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {subscription.plan_type === "monthly" &&
                            "Plano Mensal"}
                          {subscription.plan_type === "quarterly" &&
                            "Plano Trimestral"}
                          {subscription.plan_type === "annual" && "Plano Anual"}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          subscription.status === "active"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : subscription.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                              : subscription.status === "failed"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-gray-100 text-gray-800 border border-gray-200"
                        }`}
                      >
                        {subscription.status === "active" && "Ativa"}
                        {subscription.status === "pending" && "Pendente"}
                        {subscription.status === "failed" &&
                          "Falha no Pagamento"}
                        {subscription.status === "cancelled" && "Cancelada"}
                        {subscription.status === "expired" && "Expirada"}
                        {subscription.status === "suspended" && "Suspensa"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Valor</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(subscription.amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">
                          Próxima Renovação
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {subscription.current_period_end
                            ? new Date(
                                subscription.current_period_end,
                              ).toLocaleDateString("pt-BR")
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    {subscription.current_period_end &&
                      subscription.status === "active" && (
                        <div className="mt-3 pt-3 border-t border-primary-200">
                          <p className="text-xs text-primary-700">
                            {(() => {
                              const renewalDate = new Date(
                                subscription.current_period_end,
                              );
                              const today = new Date();
                              const daysUntilRenewal = Math.ceil(
                                (renewalDate.getTime() - today.getTime()) /
                                  (1000 * 60 * 60 * 24),
                              );
                              if (daysUntilRenewal > 0) {
                                return `Renovação automática em ${daysUntilRenewal} ${daysUntilRenewal === 1 ? "dia" : "dias"}`;
                              } else if (daysUntilRenewal === 0) {
                                return "Renovação automática hoje";
                              } else {
                                return "Período vencido";
                              }
                            })()}
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Informações sobre mudança de plano pendente */}
                  {subscription.pending_plan_type &&
                    subscription.pending_plan_change_at && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <Clock className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-800 mb-1">
                              Mudança de Plano Agendada
                            </p>
                            <p className="text-xs text-blue-700 mb-2">
                              Seu plano será alterado para{" "}
                              <strong>
                                {PLAN_NAMES[subscription.pending_plan_type]}
                              </strong>{" "}
                              em{" "}
                              {new Date(
                                subscription.pending_plan_change_at,
                              ).toLocaleDateString("pt-BR")}
                              . Você continuará com o plano atual até então.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Ações */}
                  {subscription.status === "active" && (
                    <div className="space-y-2">
                      <Button
                        onClick={() => setShowChangePlanModal(true)}
                        disabled={isChangingPlan}
                        className="w-full bg-primary-600 hover:bg-primary-700"
                      >
                        {isChangingPlan ? "Agendando..." : "Trocar Plano"}
                      </Button>
                      {refundEligibility?.eligible &&
                        !subscription.refund_processed_at && (
                          <Button
                            variant="outline"
                            onClick={() => setShowRefundModal(true)}
                            disabled={isProcessingRefund}
                            className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                          >
                            {isProcessingRefund
                              ? "Processando..."
                              : "Solicitar Reembolso"}
                          </Button>
                        )}
                      <Button
                        variant="outline"
                        onClick={() => handleCancelSubscription(false)}
                        disabled={
                          isCancelling ||
                          subscription.status === "cancelled" ||
                          subscription.status === "expired"
                        }
                        className="w-full border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCancelling ? "Cancelando..." : "Cancelar Assinatura"}
                      </Button>
                    </div>
                  )}

                  {(subscription.status === "cancelled" ||
                    subscription.status === "expired") && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Assinatura Cancelada
                      </p>
                      {subscription.cancelled_at && (
                        <p className="text-xs text-gray-600 mb-3">
                          Cancelada em{" "}
                          {new Date(
                            subscription.cancelled_at,
                          ).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      <Button
                        onClick={() => router.push("/planos")}
                        className="w-full bg-primary-600 hover:bg-primary-700"
                      >
                        Assinar Novo Plano
                      </Button>
                    </div>
                  )}

                  {subscription.status === "failed" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800 mb-1">
                            Falha no Pagamento
                          </p>
                          <p className="text-xs text-red-700 mb-3">
                            Houve um problema com o pagamento da sua assinatura.
                            Atualize seus dados de pagamento.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => router.push("/planos")}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Atualizar Pagamento
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Dados
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Conta
              </Button>
            </div>
          </Card>

          {/* Secretary Access Link */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Acesso da Secretária (Link Seguro)
              </CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-teal-600 shadow-sm border border-teal-100">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-teal-900 mb-1">Como funciona o link seguro?</h4>
                    <p className="text-xs text-teal-700 leading-relaxed">
                      Gere um link exclusivo para sua secretária. Ela poderá visualizar seus procedimentos pendentes e atualizar o status de pagamento (Enviado/Pago) sem precisar de uma conta ou senha. Você pode invalidar o link a qualquer momento clicando em "Regenerar".
                    </p>
                  </div>
                </div>
              </div>

              {secretaryLink ? (
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Seu Link de Acesso</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-xs text-gray-600 truncate flex items-center justify-between">
                        <span className="truncate">
                          {isLinkVisible ? secretaryLink : "••••••••••••••••••••••••••••••••••••••••"}
                        </span>
                        <button 
                          onClick={() => setIsLinkVisible(!isLinkVisible)}
                          className="ml-2 text-gray-400 hover:text-teal-600 transition-colors"
                          title={isLinkVisible ? "Ocultar link" : "Mostrar link"}
                        >
                          {isLinkVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button 
                        onClick={() => copyToClipboard(secretaryLink)}
                        variant="outline"
                        className="shrink-0 h-full py-4 rounded-xl"
                      >
                        {showCopySuccess ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    {showCopySuccess && <p className="text-[10px] text-green-600 mt-1 font-medium">Link copiado para a área de transferência!</p>}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => window.open(secretaryLink, '_blank')}
                      variant="outline"
                      className="flex-1 h-12 rounded-xl"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Testar Link
                    </Button>
                    <Button 
                      onClick={handleGenerateLink}
                      disabled={isGeneratingLink}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 h-12 rounded-xl"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isGeneratingLink ? 'animate-spin' : ''}`} />
                      Regenerar Link
                    </Button>
                  </div>
                </div>
              ) : activeLinkInfo ? (
                <div className="space-y-4 text-center">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3 text-left">
                    <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">Link Ativo Detectado</p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Você possui um link de acesso ativo que expira em {new Date(activeLinkInfo.expires_at).toLocaleDateString('pt-BR')}.
                        Caso não tenha salvo, você pode regenerar um novo abaixo ou aguardar o carregamento.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleGenerateLink}
                    disabled={isGeneratingLink}
                    className="w-full bg-teal-600 hover:bg-teal-700 h-12 rounded-xl font-bold shadow-lg shadow-teal-100"
                  >
                    {isGeneratingLink ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Gerando Novo Link...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Gerar Novo Link (Substituir Anterior)
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-6">Você ainda não gerou um link de acesso para sua secretária.</p>
                  <Button 
                    onClick={handleGenerateLink}
                    disabled={isGeneratingLink}
                    className="bg-teal-600 hover:bg-teal-700 h-12 px-8 rounded-xl font-bold shadow-lg shadow-teal-100"
                  >
                    {isGeneratingLink ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Gerando Link...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Gerar Link Seguro
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </Card>
          
          <div className="lg:col-span-2">
            <WhatsAppSettings />
          </div>
        </div>
      </div>

      {/* Modal de Troca de Plano */}
      {showChangePlanModal && subscription && (
        <Modal
          isOpen={showChangePlanModal}
          onClose={() => setShowChangePlanModal(false)}
          title="Trocar Plano"
        >
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Você continuará com seu plano atual até o fim do período (
              {subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString(
                    "pt-BR",
                  )
                : "fim do período"}
              ). A mudança será aplicada automaticamente na próxima renovação.
            </p>
            <div className="space-y-3">
              {getAvailablePlansForChange().map((planType) => (
                <button
                  key={planType}
                  onClick={() => handleChangePlan(planType)}
                  disabled={isChangingPlan}
                  className="w-full p-4 border-2 border-primary-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {PLAN_NAMES[planType]}
                      </p>
                      <p className="text-sm text-gray-600">
                        {planType === "monthly" && "Renovação mensal"}
                        {planType === "quarterly" && "Renovação trimestral"}
                        {planType === "annual" && "Renovação anual"}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-primary-600">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(PLAN_PRICES[planType] || 0)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Reembolso */}
      {showRefundModal && (
        <Modal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          title="Solicitar Reembolso"
        >
          <div className="space-y-4">
            {refundEligibility?.eligible ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>Você é elegível para reembolso!</strong>
                  </p>
                  <p className="text-xs text-green-700">
                    Você utilizou a plataforma por{" "}
                    <strong>{refundEligibility.daysUsed} dias</strong> (menos de
                    8 dias). O valor completo da assinatura será reembolsado.
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Atenção:</strong> Após o reembolso, sua
                    assinatura será cancelada e você perderá o acesso à
                    plataforma. O reembolso será processado em até 5 dias úteis.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowRefundModal(false)}
                    disabled={isProcessingRefund}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleRequestRefund}
                    disabled={isProcessingRefund}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    {isProcessingRefund
                      ? "Processando..."
                      : "Confirmar Reembolso"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 mb-2">
                    <strong>Reembolso não disponível</strong>
                  </p>
                  <p className="text-xs text-red-700">
                    {refundEligibility?.reason ||
                      "Você utilizou a plataforma por mais de 8 dias. Reembolsos são permitidos apenas para usuários com menos de 8 dias de uso."}
                  </p>
                </div>
                <Button
                  onClick={() => setShowRefundModal(false)}
                  className="w-full"
                >
                  Fechar
                </Button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de Alteração de Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Alterar Senha
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <Input
                label="Senha Atual"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                placeholder="Digite sua senha atual"
              />

              <Input
                label="Nova Senha"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                placeholder="Digite sua nova senha (mín. 6 caracteres)"
              />

              <Input
                label="Confirmar Nova Senha"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Confirme sua nova senha"
              />
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="flex-1"
                disabled={isUpdatingPassword}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={
                  isUpdatingPassword ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  !passwordForm.confirmPassword
                }
                className="flex-1"
              >
                {isUpdatingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Excluir Conta
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Esta ação é <strong>irreversível</strong>. Todos os seus dados
                serão permanentemente excluídos, incluindo:
              </p>
              <ul className="text-sm text-gray-600 text-left mb-4 space-y-1">
                <li>• Todos os procedimentos cadastrados</li>
                <li>• Dados financeiros e pagamentos</li>
                <li>• Relatórios e estatísticas</li>
                <li>• Configurações e preferências</li>
                <li>• Feedback de cirurgiões</li>
              </ul>
              <p className="text-sm text-gray-600 mb-4">
                Digite <strong>"EXCLUIR"</strong> para confirmar:
              </p>
            </div>

            <div className="mb-6">
              <Input
                label="Confirmação"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Digite EXCLUIR"
                className="text-center font-mono"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== "EXCLUIR"}
                className="flex-1"
              >
                {isDeleting ? "Excluindo..." : "Excluir Conta"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Cancelamento */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Confirmar Cancelamento"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {cancelImmediately
                ? "Cancelar Assinatura Imediatamente"
                : "Cancelar Assinatura"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {cancelImmediately
                ? "Tem certeza que deseja cancelar sua assinatura imediatamente? Você perderá o acesso imediatamente e não poderá mais usar o sistema."
                : "Tem certeza que deseja cancelar sua assinatura? Ela será cancelada ao fim do período atual e você manterá o acesso até então."}
            </p>
            {!cancelImmediately && subscription?.current_period_end && (
              <p className="text-xs text-gray-500 mb-4">
                Você manterá o acesso até{" "}
                {new Date(subscription.current_period_end).toLocaleDateString(
                  "pt-BR",
                )}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Não, manter assinatura
            </Button>
            <Button
              onClick={confirmCancelSubscription}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelando..." : "Sim, cancelar assinatura"}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

export default function Configuracoes() {
  return (
    <ProtectedRoute>
      <ConfiguracoesContent />
    </ProtectedRoute>
  );
}
