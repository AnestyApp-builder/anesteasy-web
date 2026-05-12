'use client'

import dynamic from 'next/dynamic'
import type { ModalProps } from './ModalInner'

const ModalInner = dynamic<ModalProps>(() => import('./ModalInner'), { ssr: false })

export type { ModalProps }

export function Modal(props: ModalProps) {
  return <ModalInner {...props} />
}
