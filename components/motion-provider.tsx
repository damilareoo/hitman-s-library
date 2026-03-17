'use client'
import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      reducedMotion="user"
    >
      {children}
    </MotionConfig>
  )
}
