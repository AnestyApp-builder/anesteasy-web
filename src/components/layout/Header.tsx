import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { 
  User, 
  LogOut, 
  Bell, 
  Search, 
  Settings, 
  Menu,
  ChevronDown,
  Stethoscope,
  Moon,
  Sun,
  HelpCircle,
  MessageSquare
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-white border-b border-secondary-200 px-6 py-4 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-secondary-900">AnestEasy</h1>
              <p className="text-xs text-secondary-500">Gestão Financeira</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-1">
            <Button variant="ghost" size="sm" className="text-secondary-600 hover:text-primary-600">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 text-xs">
              3
            </Badge>
          </Button>
          
          <Button variant="ghost" size="sm">
            <MessageSquare className="w-5 h-5" />
          </Button>
          
          <Button variant="ghost" size="sm">
            <HelpCircle className="w-5 h-5" />
          </Button>
          
          <div className="h-6 w-px bg-secondary-200"></div>
          
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary-50 transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-secondary-900">{user?.name}</p>
                <p className="text-xs text-secondary-500">{user?.specialty}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              <ChevronDown className="w-4 h-4 text-secondary-400" />
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-secondary-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-secondary-100">
                  <p className="text-sm font-medium text-secondary-900">{user?.name}</p>
                  <p className="text-xs text-secondary-500">{user?.email}</p>
                </div>
                <div className="py-2">
                  <button className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Meu Perfil</span>
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Configurações</span>
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>Ajuda</span>
                  </button>
                </div>
                <div className="border-t border-secondary-100 py-2">
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
