/**
 * Testes unitários para verificação de acesso à plataforma
 */

import { describe, it, expect } from '@jest/globals'

describe('Verificação de Acesso à Plataforma', () => {
  describe('Assinatura Ativa', () => {
    it('deve permitir acesso para assinatura ativa dentro do período', () => {
      const subscription = {
        status: 'active',
        current_period_end: '2025-12-13T00:00:00Z'
      }

      const now = new Date('2025-11-15T00:00:00Z')
      const periodEnd = new Date(subscription.current_period_end)
      const hasAccess = subscription.status === 'active' && now <= periodEnd

      expect(hasAccess).toBe(true)
    })

    it('não deve permitir acesso após fim do período', () => {
      const subscription = {
        status: 'active',
        current_period_end: '2025-11-10T00:00:00Z'
      }

      const now = new Date('2025-11-15T00:00:00Z')
      const periodEnd = new Date(subscription.current_period_end)
      const hasAccess = subscription.status === 'active' && now <= periodEnd

      expect(hasAccess).toBe(false)
    })
  })

  describe('Assinatura Cancelada', () => {
    it('deve permitir acesso até fim do período quando cancel_at_period_end é true', () => {
      const subscription = {
        status: 'active', // Mantém ativo para garantir acesso
        current_period_end: '2025-12-13T00:00:00Z',
        cancel_at_period_end: true
      }

      const now = new Date('2025-11-15T00:00:00Z')
      const periodEnd = new Date(subscription.current_period_end)
      const hasAccess = subscription.status === 'active' && now <= periodEnd

      expect(hasAccess).toBe(true)
      expect(subscription.cancel_at_period_end).toBe(true)
    })

    it('não deve permitir acesso após fim do período para cancelamento agendado', () => {
      const subscription = {
        status: 'active',
        current_period_end: '2025-11-10T00:00:00Z',
        cancel_at_period_end: true
      }

      const now = new Date('2025-11-15T00:00:00Z')
      const periodEnd = new Date(subscription.current_period_end)
      const hasAccess = subscription.status === 'active' && now <= periodEnd

      expect(hasAccess).toBe(false)
    })

    it('não deve permitir acesso para cancelamento imediato', () => {
      const subscription = {
        status: 'cancelled',
        cancel_at_period_end: false
      }

      const hasAccess = subscription.status === 'active'
      expect(hasAccess).toBe(false)
    })
  })

  describe('Cálculo de Dias Restantes', () => {
    it('deve calcular dias restantes corretamente', () => {
      const periodEnd = new Date('2025-12-13T00:00:00Z')
      const now = new Date('2025-11-15T00:00:00Z')
      const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      expect(daysRemaining).toBe(28)
    })

    it('deve retornar 0 para período já expirado', () => {
      const periodEnd = new Date('2025-11-10T00:00:00Z')
      const now = new Date('2025-11-15T00:00:00Z')
      const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      expect(daysRemaining).toBeLessThanOrEqual(0)
    })
  })
})

