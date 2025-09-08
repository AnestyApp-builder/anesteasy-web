import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface SmartNavigationProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  isActive?: boolean;
}

export const SmartNavigation: React.FC<SmartNavigationProps> = ({ 
  to, 
  children, 
  className = "",
  activeClassName = "",
  isActive = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const isCurrentPage = location.pathname === to;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Se já estamos na página, não fazer nada
    if (isCurrentPage) return;
    
    setIsNavigating(true);
    
    // Navegação instantânea sem delay
    navigate(to);
    
    // Reset do estado após um pequeno delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 100);
  };

  const getClassName = () => {
    if (isCurrentPage) {
      return `${className} ${activeClassName}`.trim();
    }
    return className;
  };

  return (
    <motion.a
      href={to}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={getClassName()}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {children}
      {isNavigating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/20 rounded-xl"
        />
      )}
    </motion.a>
  );
};
