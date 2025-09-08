import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ 
  children, 
  cols = { mobile: 1, tablet: 2, desktop: 4 },
  gap = { mobile: 4, tablet: 6, desktop: 6 },
  className = ""
}) => {
  const getGridCols = () => {
    const mobileCols = cols.mobile || 1;
    const tabletCols = cols.tablet || 2;
    const desktopCols = cols.desktop || 4;
    
    return `grid-cols-${mobileCols} md:grid-cols-${tabletCols} lg:grid-cols-${desktopCols}`;
  };

  const getGap = () => {
    const mobileGap = gap.mobile || 4;
    const tabletGap = gap.tablet || 6;
    const desktopGap = gap.desktop || 6;
    
    return `gap-${mobileGap} md:gap-${tabletGap} lg:gap-${desktopGap}`;
  };

  return (
    <div className={`grid ${getGridCols()} ${getGap()} ${className}`}>
      {children}
    </div>
  );
};
