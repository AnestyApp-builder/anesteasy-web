import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, type AuthUser } from '../services/authService';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, specialty?: string, crm?: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar sessão inicial
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session:', session?.user?.id);
        if (session?.user) {
          // Sempre criar usuário mock com dados da sessão para garantir funcionamento
          const mockUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            specialty: session.user.user_metadata?.specialty || 'Anestesiologia',
            crm: session.user.user_metadata?.crm || '',
            phone: session.user.user_metadata?.phone || '',
            subscription_plan: session.user.user_metadata?.subscription_plan || 'standard'
          };
          console.log('Setting initial mock user:', mockUser);
          setUser(mockUser);
          
          // Tentar buscar dados reais em background (opcional)
          try {
            const currentUser = await authService.getCurrentUser();
            if (currentUser) {
              console.log('Updating with real initial user data:', currentUser);
              setUser(currentUser);
            }
          } catch (error) {
            console.log('Could not fetch real initial user data, using mock:', error);
          }
        } else {
          console.log('No initial session, setting user to null');
          setUser(null);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão inicial:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkInitialSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id, 'isLoggingOut:', isLoggingOut);
      
      // Se estamos fazendo logout, ignorar TODOS os eventos
      if (isLoggingOut) {
        console.log('Ignorando evento durante logout:', event);
        return;
      }
      
      // Se for evento de SIGNED_OUT, limpar usuário e não fazer mais nada
      if (event === 'SIGNED_OUT') {
        console.log('SIGNED_OUT event - clearing user and setting loading to false');
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // Se for evento de TOKEN_REFRESHED, não fazer nada (não é mudança de estado)
      if (event === 'TOKEN_REFRESHED') {
        console.log('TOKEN_REFRESHED event - ignoring');
        return;
      }
      
      if (session?.user) {
        // Sempre criar usuário mock com dados da sessão para garantir funcionamento
        const mockUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
          specialty: session.user.user_metadata?.specialty || 'Anestesiologia',
          crm: session.user.user_metadata?.crm || '',
          phone: session.user.user_metadata?.phone || '',
          subscription_plan: session.user.user_metadata?.subscription_plan || 'standard'
        };
        console.log('Setting mock user from session:', mockUser);
        setUser(mockUser);
        
        // Tentar buscar dados reais em background (opcional)
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            console.log('Updating with real user data:', currentUser);
            setUser(currentUser);
          }
        } catch (error) {
          console.log('Could not fetch real user data, using mock:', error);
        }
      } else {
        console.log('No session, setting user to null');
        setUser(null);
      }
      
      // Só definir loading como false se não estivermos no processo inicial
      if (event !== 'INITIAL_SESSION') {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isLoggingOut]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const { user: authUser, error } = await authService.login({ email, password });
      
      if (error) {
        return { success: false, error };
      }

      setUser(authUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao fazer login' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    name: string, 
    specialty?: string, 
    crm?: string, 
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const { user: authUser, error } = await authService.register({
        email,
        password,
        name,
        specialty,
        crm,
        phone,
      });
      
      if (error) {
        return { success: false, error };
      }

      setUser(authUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao criar conta' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    console.log('=== INICIANDO LOGOUT FORÇADO ===');
    
    // Limpar estado local IMEDIATAMENTE
    setUser(null);
    console.log('Usuário removido do estado local');
    
    // Limpar localStorage e sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    console.log('Storage limpo');
    
    // Redirecionar IMEDIATAMENTE
    navigate('/login', { replace: true });
    console.log('Redirecionado para página de login');
    
    // Forçar reload da página IMEDIATAMENTE
    setTimeout(() => {
      console.log('Recarregando página...');
      window.location.reload();
    }, 100);
    
    // Fazer logout no Supabase em background (não bloquear)
    authService.logout().then(({ error }) => {
      if (error) {
        console.error('Erro no logout do Supabase:', error);
      } else {
        console.log('Logout do Supabase concluído com sucesso');
      }
    }).catch((error) => {
      console.error('Erro no logout do Supabase:', error);
    });
    
    console.log('=== LOGOUT FORÇADO CONCLUÍDO ===');
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const { error } = await authService.resetPassword(email);
      
      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao enviar email de recuperação' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      setIsLoading(true);
      
      const { user: updatedUser, error } = await authService.updateProfile(user.id, updates);
      
      if (error) {
        return { success: false, error };
      }

      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao atualizar perfil' };
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    updateProfile,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};