import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
  textColor?: 'white' | 'gray' | 'black'
}

export function Logo({ size = 'md', showText = true, className = '', textColor = 'white' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16', 
    lg: 'w-20 h-20'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  const textColorClasses = {
    white: 'text-white',
    gray: 'text-gray-900',
    black: 'text-black'
  }
  
  return (
    <div className={`flex items-center justify-center space-x-3 ${className}`}>
      {/* Ícone personalizado do AnestEasy */}
      <div 
        className={`${sizeClasses[size]} flex items-center justify-center`}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
          outline: 'none',
          border: 'none',
          pointerEvents: 'none'
        }}
      >
        <img 
          src="/icon.svg" 
          alt="AnestEasy Logo"
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            userSelect: 'none', 
            WebkitUserSelect: 'none',
            pointerEvents: 'none'
          }}
        />
      </div>
      
      {showText && (
        <span className={`font-bold ${textColorClasses[textColor]} ${textSizeClasses[size]}`}>
          AnestEasy
        </span>
      )}
    </div>
  )
}
