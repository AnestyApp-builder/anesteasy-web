'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Componente para adicionar transições suaves entre páginas
 * Inspirado em Linear e Superhuman
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          duration: 0.2,
          ease: [0.22, 1, 0.36, 1] // ease-out-cubic
        }}
        className="min-h-full w-full overflow-x-hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

