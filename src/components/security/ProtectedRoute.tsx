import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { validateUserAccess } from '../../utils/security';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPlan?: 'standard' | 'premium' | 'enterprise';
  fallbackPath?: string;
}

/**
 * Componente para proteger rotas que requerem autenticação
 * Garante que apenas usuários autenticados possam acessar
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPlan,
  fallbackPath = '/login'
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Se não há usuário autenticado, redirecionar para login
  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Se há um plano requerido, verificar se o usuário tem permissão
  if (requiredPlan) {
    const planHierarchy = {
      standard: 1,
      premium: 2,
      enterprise: 3
    };

    const userPlanLevel = planHierarchy[user.subscription_plan as keyof typeof planHierarchy] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan];

    if (userPlanLevel < requiredPlanLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Acesso Restrito
            </h2>
            <p className="text-gray-600 mb-6">
              Esta funcionalidade requer o plano <strong>{requiredPlan}</strong>.
              Seu plano atual é <strong>{user.subscription_plan}</strong>.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.history.back()}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => window.location.href = '/pricing'}
                className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Ver Planos
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

/**
 * Hook para verificar se o usuário tem acesso a uma funcionalidade
 */
export const useAccessControl = () => {
  const { user } = useAuth();

  const hasAccess = (requiredPlan?: 'standard' | 'premium' | 'enterprise'): boolean => {
    if (!user) return false;

    if (!requiredPlan) return true;

    const planHierarchy = {
      standard: 1,
      premium: 2,
      enterprise: 3
    };

    const userPlanLevel = planHierarchy[user.subscription_plan as keyof typeof planHierarchy] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan];

    return userPlanLevel >= requiredPlanLevel;
  };

  const canAccess = (resourceUserId: string): boolean => {
    if (!user) return false;
    return user.id === resourceUserId;
  };

  return {
    hasAccess,
    canAccess,
    user
  };
};
