'use client'
import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      reducedMotion="user"
    >
      {children}
    </MotionConfig>
  )
}
