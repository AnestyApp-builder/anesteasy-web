import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  helpText?: string
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
 */
function isoToBrazilian(isoDate: string): string {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  if (year && month && day) {
    return `${day}/${month}/${year}`
  }
  return isoDate
}

/**
 * Formata string numérica para formato brasileiro (DD/MM/YYYY)
 */
function formatBrazilianDate(input: string): string {
  // Remove tudo que não é número
  const cleaned = input.replace(/\D/g, '')
  
  if (cleaned.length === 0) return ''
  if (cleaned.length <= 2) return cleaned
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`
}

/**
 * Converte data brasileira (DD/MM/YYYY) para formato ISO (YYYY-MM-DD)
 */
function brazilianToIso(brDate: string): string {
  if (!brDate) return ''
  // Remove caracteres não numéricos
  const cleaned = brDate.replace(/\D/g, '')
  
  if (cleaned.length === 0) return ''
  
  // Se já está no formato DD/MM/YYYY, converter para ISO
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

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, required, helpText, type, value, onChange, ...props }, ref) => {
    const isDateType = type === 'date'
    const [displayValue, setDisplayValue] = useState(isDateType && value ? isoToBrazilian(value as string) : (value as string || ''))
    const [isFocused, setIsFocused] = useState(false)

    // Atualizar display quando value mudar externamente (apenas para dates)
    useEffect(() => {
      if (isDateType) {
        if (!isFocused) {
          setDisplayValue(value ? isoToBrazilian(value as string) : '')
        }
      } else {
        const newValue = value as string || ''
        if (newValue !== displayValue) {
          setDisplayValue(newValue)
        }
      }
    }, [value, isDateType, isFocused]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isDateType) {
        const inputValue = e.target.value
        
        // Aplicar formatação automática com barras
        const formatted = formatBrazilianDate(inputValue)
        setDisplayValue(formatted)
        
        // Converter para ISO e chamar onChange apenas se tiver data completa
        const isoValue = brazilianToIso(formatted)
        if (onChange) {
          // Criar evento sintético com valor ISO (ou vazio se incompleto)
          const syntheticEvent = {
            ...e,
            target: {
              ...e.target,
              value: isoValue || ''
            }
          } as React.ChangeEvent<HTMLInputElement>
          onChange(syntheticEvent)
        }
      } else {
        if (onChange) {
          onChange(e)
        }
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isDateType) {
        setIsFocused(false)
        
        // Validar e formatar ao perder foco
        const isoValue = brazilianToIso(e.target.value)
        if (isoValue) {
          setDisplayValue(isoToBrazilian(isoValue))
        } else if (e.target.value === '') {
          setDisplayValue('')
        } else {
          // Se inválido, restaurar valor anterior
          setDisplayValue(value ? isoToBrazilian(value as string) : '')
        }
      }
    }

    const handleFocus = () => {
      if (isDateType) {
        setIsFocused(true)
      }
    }

    // Para campos de data, usar input type="text" com máscara brasileira
    const inputType = isDateType ? 'text' : type
    const inputValue = isDateType ? displayValue : value
    const inputPlaceholder = isDateType ? 'DD/MM/AAAA' : props.placeholder

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
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10 flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            type={inputType}
            inputMode={isDateType ? 'numeric' : undefined}
            maxLength={isDateType ? 10 : undefined}
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={inputPlaceholder}
            className={cn(
              'w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white',
              icon && 'pl-11 pr-4',
              !icon && 'px-4',
              error && 'border-red-300 focus:ring-red-500',
              className
            )}
            style={icon ? { paddingLeft: '2.75rem' } : undefined}
            ref={ref}
            {...(isDateType ? {} : props)}
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

Input.displayName = 'Input'
