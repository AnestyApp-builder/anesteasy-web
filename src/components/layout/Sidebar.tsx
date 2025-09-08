import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Settings,
  Stethoscope,
  ChevronRight,
  Activity,
  TrendingUp,
  Users,
  Shield,
  Bell,
  HelpCircle,
  Star
} from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: Home, 
    description: 'Visão geral',
    badge: null
  },
  { 
    name: 'Procedimentos', 
    href: '/procedimentos', 
    icon: Stethoscope, 
    description: 'Gestão de procedimentos',
    badge: '12'
  },
  { 
    name: 'Financeiro', 
    href: '/financeiro', 
    icon: DollarSign, 
    description: 'Controle financeiro',
    badge: null
  },
  { 
    name: 'Relatórios', 
    href: '/relatorios', 
    icon: BarChart3, 
    description: 'Análises e insights',
    badge: null
  },
  { 
    name: 'Configurações', 
    href: '/configuracoes', 
    icon: Settings, 
    description: 'Preferências',
    badge: null
  },
];

const quickActions = [
  { name: 'Novo Procedimento', icon: Stethoscope, href: '/procedimentos/novo' },
  { name: 'Relatório Rápido', icon: FileText, href: '/relatorios' },
  { name: 'Configurações', icon: Settings, href: '/configuracoes' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-72'} bg-white border-r border-secondary-200 h-full transition-all duration-300`}>
      <div className="p-4">
        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">
            Ações Rápidas
          </h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <NavLink
                key={action.name}
                to={action.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-secondary-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              >
                <action.icon className="w-4 h-4" />
                {!collapsed && <span>{action.name}</span>}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Main Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">
            Navegação
          </h3>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 shadow-sm border border-primary-200'
                      : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                  )
                }
              >
                <div className="flex items-center space-x-3">
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    'group-hover:bg-primary-100 group-hover:text-primary-600'
                  )}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  {!collapsed && (
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-secondary-500">{item.description}</div>
                    </div>
                  )}
                </div>
                {!collapsed && item.badge && (
                  <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Collapse Button */}
        <div className="mt-8 pt-4 border-t border-secondary-200">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-secondary-600 hover:bg-secondary-50 transition-colors"
          >
            <ChevronRight className={clsx('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span className="ml-2">Recolher</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
