'use client'

import dynamic from 'next/dynamic'

/** Carrega após a primeira pintura — evita bloquear TTI em mobile */
export const DeferredVersionInfo = dynamic(
  () => import('@/components/VersionInfo').then((m) => ({ default: m.VersionInfo })),
  { ssr: false }
)
