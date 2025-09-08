import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  className = "flex items-center space-x-3 w-full px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group",
  children 
}) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    console.log('Logout iniciado...');
    logout();
  };

  return (
    <button
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
      {children || <span className="font-medium">Sair da Conta</span>}
    </button>
  );
};
