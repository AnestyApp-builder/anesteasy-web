'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, 
  BarChart3, 
  FileText, 
  DollarSign, 
  Activity, 
  Settings, 
  Menu, 
  X,
  ArrowUpRight
} from 'lucide-react';
import { LogoutButton } from '../auth/LogoutButton';
import { SmartNavigation } from '../navigation/SmartNavigation';

interface ResponsiveSidebarProps {
  currentPath: string;
}

export const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({ currentPath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fechar drawer ao clicar fora (mobile)
  useEffect(() => {
    if (isOpen && isMobile) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('.sidebar-drawer') && !target.closest('.menu-button')) {
          setIsOpen(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMobile]);

  // Fechar drawer ao navegar (mobile)
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [currentPath, isMobile]);

  const navigationItems = [
    { 
      path: '/dashboard', 
      icon: BarChart3, 
      label: 'Dashboard',
      isActive: currentPath === '/dashboard'
    },
    { 
      path: '/procedimentos', 
      icon: FileText, 
      label: 'Procedimentos',
      isActive: currentPath === '/procedimentos'
    },
    { 
      path: '/financeiro', 
      icon: DollarSign, 
      label: 'Financeiro',
      isActive: currentPath === '/financeiro'
    },
    { 
      path: '/relatorios', 
      icon: Activity, 
      label: 'Relatórios',
      isActive: currentPath === '/relatorios'
    },
    { 
      path: '/configuracoes', 
      icon: Settings, 
      label: 'Configurações',
      isActive: currentPath === '/configuracoes'
    }
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Logo Section */}
      <div className="p-4 lg:p-8 border-b border-gray-100">
        <div className="flex items-center space-x-3 lg:space-x-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Stethoscope className="w-5 h-5 lg:w-7 lg:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              AnestEasy
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 font-medium">Gestão Profissional</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 lg:p-6">
        <div className="space-y-2 lg:space-y-3">
          <div className="mb-4 lg:mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Menu Principal</p>
          </div>
          
          {navigationItems.map((item) => (
            <SmartNavigation
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 lg:space-x-4 px-3 lg:px-4 py-3 lg:py-3.5 rounded-xl transition-all duration-200 ${
                item.isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50 hover:translate-x-1'
              }`}
            >
              <item.icon className={`w-5 h-5 ${!item.isActive ? 'group-hover:scale-110 transition-transform' : ''}`} />
              <span className="text-sm lg:text-base">{item.label}</span>
              {item.isActive && (
                <div className="ml-auto w-2 h-2 bg-white/30 rounded-full"></div>
              )}
              {!item.isActive && (
                <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </SmartNavigation>
          ))}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 lg:p-6 border-t border-gray-100">
        <div className="flex items-center space-x-3 lg:space-x-4 mb-4 lg:mb-6">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center shadow-inner">
            <span className="text-emerald-600 font-bold text-sm lg:text-lg">D</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate text-sm lg:text-base">Dr. Usuário</p>
            <p className="text-xs lg:text-sm text-gray-500 truncate">Anestesiologista</p>
          </div>
        </div>
        
        <LogoutButton className="flex items-center space-x-2 lg:space-x-3 w-full px-3 lg:px-4 py-2 lg:py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group text-sm lg:text-base" />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="menu-button fixed top-4 left-4 z-50 lg:hidden w-12 h-12 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all duration-200"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Mobile Drawer Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="sidebar-drawer fixed left-0 top-0 h-full w-80 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl z-50 lg:hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              {sidebarContent}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <div className="hidden lg:block fixed left-0 top-0 h-full w-72 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl z-10">
      {sidebarContent}
    </div>
  );
};
