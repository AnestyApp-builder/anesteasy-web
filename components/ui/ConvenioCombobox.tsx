'use client'

import React, { useState, useRef, useEffect } from 'react'
import { CreditCard, ChevronDown, X } from 'lucide-react'
import { filtrarConvenios, NOMES_CONVENIOS } from '@/lib/convenios'

interface Props {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  className?: string
}

export function ConvenioCombobox({ value, onChange, label = 'Convênio / Particular', required, className }: Props) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtrados, setFiltrados] = useState<string[]>(NOMES_CONVENIOS)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        fechar()
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const fechar = () => {
    setOpen(false)
    setBusca('')
    setFiltrados(NOMES_CONVENIOS)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value
    setBusca(texto)
    onChange(texto)
    setFiltrados(filtrarConvenios(texto))
    setOpen(true)
  }

  const handleFocus = () => {
    setBusca(value)
    setFiltrados(filtrarConvenios(value))
    setOpen(true)
  }

  const handleSelect = (nome: string) => {
    onChange(nome)
    fechar()
    inputRef.current?.blur()
  }

  const handleClear = () => {
    onChange('')
    setBusca('')
    setFiltrados(NOMES_CONVENIOS)
    inputRef.current?.focus()
  }

  const displayValue = open ? busca : value

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <CreditCard className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Selecione ou digite o convênio..."
          className="w-full pl-10 pr-16 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sm"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => open ? fechar() : setOpen(true)}
            className="p-1 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {filtrados.length > 0 ? (
            filtrados.map(nome => (
              <button
                key={nome}
                type="button"
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-teal-50 border-b border-gray-50 last:border-0 transition-colors ${
                  value === nome ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-800'
                }`}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(nome) }}
                onTouchEnd={(e) => { e.preventDefault(); handleSelect(nome) }}
              >
                {nome}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 italic">
              Nenhum convênio encontrado — o valor digitado será salvo como está.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
