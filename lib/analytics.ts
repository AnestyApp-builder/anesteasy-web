'use client';

/**
 * AnestEasy Analytics Helper
 * Concentra as funções de rastreamento do Meta Pixel e outras ferramentas.
 */

declare global {
  interface Window {
    fbq: any;
  }
}

/**
 * Rastreia o evento 'Lead' quando um usuário demonstra interesse real 
 * (ex: clica em botões de cadastro/começar grátis)
 */
export const trackLead = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    console.log('[Analytics] Rastreando Lead...');
    window.fbq('track', 'Lead');
  } else {
    console.warn('[Analytics] Meta Pixel não encontrado ou não inicializado.');
  }
};
