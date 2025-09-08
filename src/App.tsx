import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/security/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProcedimentosPage } from './pages/ProcedimentosPage';
import { ProcedimentoFormPage } from './pages/ProcedimentoFormPage';
import { FinanceiroPage } from './pages/FinanceiroPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';

// Componente para rotas públicas (apenas para usuários não logados)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 bg-white rounded"></div>
          </div>
          <p className="text-secondary-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<HomePage />} />
      
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } 
      />
      
      <Route 
        path="/forgot-password" 
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        } 
      />

      {/* Rotas protegidas */}
      <Route 
        path="/dashboard" 
        element={<DashboardPage />}
      />
      
      <Route 
        path="/procedimentos" 
        element={<ProcedimentosPage />}
      />
      
      <Route 
        path="/procedimentos/novo" 
        element={
          <ProtectedRoute>
            <ProcedimentoFormPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/financeiro" 
        element={<FinanceiroPage />}
      />
      
      <Route 
        path="/relatorios" 
        element={<RelatoriosPage />}
      />
      
      <Route 
        path="/configuracoes" 
        element={<ConfiguracoesPage />}
      />

      {/* Rota padrão - redireciona para dashboard se logado, senão para home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
};

export default App;
