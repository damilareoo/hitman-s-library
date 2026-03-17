'use client'
import { MotionConfig } from 'motion/react'

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      reducedMotion="user"
    >
      {children}
    </MotionConfig>
  )
}
