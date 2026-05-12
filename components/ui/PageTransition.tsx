'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

const PageTransitionInner = dynamic(() => import('./PageTransitionInner'), { ssr: false })

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  return <PageTransitionInner>{children}</PageTransitionInner>
}
