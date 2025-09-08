import React from 'react';
import { PremiumSidebar } from '../navigation/PremiumSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex">
      <PremiumSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
