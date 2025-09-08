import React from 'react';
import { useLocation } from 'react-router-dom';
import { ResponsiveSidebar } from './ResponsiveSidebar';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Responsive Sidebar */}
      <ResponsiveSidebar currentPath={location.pathname} />
      
      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Mobile Header Spacer */}
        <div className="h-20 lg:hidden" />
        
        {/* Content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};
