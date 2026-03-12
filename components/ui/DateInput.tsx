import React, { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string
  error?: string
  helpText?: string
  value?: string // Formato ISO: YYYY-MM-DD
  onChange?: (value: string) => void // Retorna formato ISO: YYYY-MM-DD
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
 */
function isoToBrazilian(isoDate: string): string {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Converte data brasileira (DD/MM/YYYY) para formato ISO (YYYY-MM-DD)
 */
function brazilianToIso(brDate: string): string {
  if (!brDate) return ''
  // Remove caracteres não numéricos
  const cleaned = brDate.replace(/\D/g, '')
  
  if (cleaned.length === 0) return ''
  
  // Formata como DD/MM/YYYY
  let formatted = cleaned
  if (cleaned.length > 2) {
    formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2)
  }
  if (cleaned.length > 4) {
    formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8)
  }
  
  // Converte para ISO se tiver data completa
  if (cleaned.length === 8) {
    const day = cleaned.slice(0, 2)
    const month = cleaned.slice(2, 4)
    const year = cleaned.slice(4, 8)
    
    // Validação básica
    const dayNum = parseInt(day, 10)
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)
    
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
      return `${year}-${month}-${day}`
    }
  }
  
  return ''
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, label, error, helpText, value = '', onChange, required, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(isoToBrazilian(value))
    const [isFocused, setIsFocused] = useState(false)

    // Atualizar display quando value mudar externamente
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(isoToBrazilian(value))
      }
    }, [value, isFocused])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setDisplayValue(inputValue)
      
      // Converter para ISO e chamar onChange
      const isoValue = brazilianToIso(inputValue)
      if (onChange && isoValue) {
        onChange(isoValue)
      } else if (onChange && inputValue === '') {
        onChange('')
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      
      // Validar e formatar ao perder foco
      const isoValue = brazilianToIso(e.target.value)
      if (isoValue) {
        setDisplayValue(isoToBrazilian(isoValue))
        if (onChange) {
          onChange(isoValue)
        }
      } else if (e.target.value === '') {
        if (onChange) {
          onChange('')
        }
      } else {
        // Se inválido, restaurar valor anterior
        setDisplayValue(isoToBrazilian(value))
      }
    }

    const handleFocus = () => {
      setIsFocused(true)
    }

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {helpText && !error && (
          <p className="text-xs text-gray-500">{helpText}</p>
        )}
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="DD/MM/AAAA"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            maxLength={10}
            className={cn(
              'w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white pl-11 pr-4',
              error && 'border-red-300 focus:ring-red-500',
              className
            )}
            style={{ paddingLeft: '2.75rem' }}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {helpText && error && (
          <p className="text-xs text-gray-500">{helpText}</p>
        )}
      </div>
    )
  }
)

DateInput.displayName = 'DateInput'

