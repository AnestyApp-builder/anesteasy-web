import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed touch-manipulation -webkit-tap-highlight-color-transparent active:scale-95 cursor-pointer'
    
    const variants = {
      primary: 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-sm hover:shadow-md focus:ring-primary-500',
      secondary: 'bg-secondary-500 hover:bg-secondary-600 active:bg-secondary-700 text-white shadow-sm hover:shadow-md focus:ring-secondary-500',
      outline: 'border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-900 shadow-sm hover:shadow-md focus:ring-primary-500',
      ghost: 'hover:bg-gray-100 active:bg-gray-200 text-gray-900 focus:ring-primary-500',
      destructive: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-sm hover:shadow-md focus:ring-red-500'
    }
    
    // Tamanhos otimizados para mobile - mínimo 44px de altura (padrão Apple/Google)
    const sizes = {
      sm: 'px-4 py-2.5 text-sm rounded-md min-h-[44px]',
      md: 'px-6 py-3.5 text-base rounded-lg min-h-[48px]',
      lg: 'px-8 py-4 text-lg rounded-lg min-h-[52px]'
    }
    
    return (
      <button
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
        style={{
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          ...props.style
        }}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
