import React from 'react';
import { motion } from 'framer-motion';

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({ 
  children, 
  className = "",
  onClick,
  hover = true
}) => {
  const baseClasses = "bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl shadow-lg border border-gray-200/50 p-4 lg:p-6";
  const hoverClasses = hover ? "hover:shadow-xl transition-all duration-300" : "";
  const clickClasses = onClick ? "cursor-pointer" : "";

  const cardContent = (
    <div className={`${baseClasses} ${hoverClasses} ${clickClasses} ${className}`}>
      {children}
    </div>
  );

  if (onClick) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className="touch-manipulation"
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
};
