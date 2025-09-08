'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  Stethoscope,
  DollarSign,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingUp,
  Calendar,
  Bell,
  User,
  LogOut,
  Zap,
  Shield,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  premium?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Procedimentos',
    href: '/procedimentos',
    icon: Stethoscope,
    badge: '12',
    badgeVariant: 'secondary'
  },
  {
    title: 'Financeiro',
    href: '/financeiro',
    icon: DollarSign,
    badge: 'Novo',
    badgeVariant: 'default'
  },
  {
    title: 'Relatórios',
    href: '/relatorios',
    icon: FileText,
    premium: true
  },
  {
    title: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
  },
];

const quickActions = [
  {
    title: 'Novo Procedimento',
    href: '/procedimentos/novo',
    icon: Stethoscope,
    color: 'bg-primary-500 hover:bg-primary-600'
  },
  {
    title: 'Ver Relatórios',
    href: '/relatorios',
    icon: TrendingUp,
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    title: 'Agenda',
    href: '/agenda',
    icon: Calendar,
    color: 'bg-purple-500 hover:bg-purple-600'
  }
];

interface PremiumSidebarProps {
  className?: string;
}

export const PremiumSidebar: React.FC<PremiumSidebarProps> = ({ className }) => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className={cn(
      "flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">AnestEasy</h1>
              <p className="text-xs text-gray-500">Premium Dashboard</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* User Profile */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback className="bg-primary-100 text-primary-700">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'DR'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Dr. {user?.name?.split(' ')[0] || 'Anestesiologista'}
              </p>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300"
                >
                  <Star className="w-3 h-3 mr-1" />
                  {user?.subscription_plan || 'Premium'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                active 
                  ? "bg-primary-50 text-primary-700 border-r-2 border-primary-500" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn(
                "flex-shrink-0",
                collapsed ? "w-6 h-6" : "w-5 h-5",
                active ? "text-primary-600" : "text-gray-500 group-hover:text-gray-700"
              )} />
              
              {!collapsed && (
                <>
                  <span className="font-medium">{item.title}</span>
                  <div className="flex items-center space-x-1 ml-auto">
                    {item.premium && (
                      <Award className="w-3 h-3 text-yellow-500" />
                    )}
                    {item.badge && (
                      <Badge 
                        variant={item.badgeVariant || 'secondary'} 
                        className="text-xs px-1.5 py-0.5"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </Link>
          );
        })}

        {!collapsed && (
          <>
            <Separator className="my-4" />
            
            {/* Quick Actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
                Ações Rápidas
              </h3>
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-white transition-all duration-200 hover:shadow-md",
                    action.color
                  )}
                >
                  <action.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{action.title}</span>
                </Link>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Stats Summary */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                Resumo Rápido
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Este mês</span>
                  <span className="text-sm font-bold text-gray-900">R$ 67.500</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Procedimentos</span>
                  <span className="text-sm font-bold text-gray-900">42</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Taxa pagamento</span>
                  <span className="text-sm font-bold text-green-600">94.2%</span>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Segurança</span>
              <Shield className="w-4 h-4 text-green-500" />
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
