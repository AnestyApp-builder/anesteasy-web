/**
 * Constantes Globais do AnestEasy
 * Centraliza regras de negócio para facilitar manutenção e consistência.
 */

export const BUSINESS_RULES = {
  // Prazos Financeiros
  LATE_PAYMENT_THRESHOLD_DAYS: 90, // Prazo para um procedimento ser considerado "Atraso Grave"
  NEAR_PAYMENT_DAYS: 5,           // Janela para considerar recebimento como "Próximo"
  
  // Assinaturas e Trial
  TRIAL_DAYS: 7,                  // Período de teste gratuito
  PRICES: {
    MONTHLY: 7900,                // R$ 79,00 em centavos
    QUARTERLY: 22500,             // R$ 225,00 em centavos
    ANNUAL: 85000,                // R$ 850,00 em centavos
  },

  // Validação de Procedimentos
  MAX_FUTURE_DAYS: 90,           // Limite de dias no futuro para agendamento
  MAX_PAST_YEARS: 10,            // Limite de anos no passado para registros
  
  // Segurança e Cache
  AUTH_CACHE_TTL_MS: 15 * 60 * 1000, // 15 minutos de cache de autenticação
};

export const UI_CONSTANTS = {
  ANIMATION_DURATION: 0.2,
  MAX_UPLOAD_SIZE_MB: 100,
  MAX_FILES_COUNT: 10,
};

export const TECHNICAL_LIMITS = {
  TIMEOUT_SESSION_MS: 15000,
  TIMEOUT_INSERT_MS: 45000,
  TIMEOUT_UPLOAD_MS: 30000,
};
