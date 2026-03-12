'use client'

import React from 'react'
import { useToast } from '@/contexts/ToastContext'
import { Toast } from './Toast'

export function Toaster() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-20 right-4 z-[10000] flex flex-col gap-3 max-w-md"
      aria-live="polite"
      aria-label="Notificações"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

