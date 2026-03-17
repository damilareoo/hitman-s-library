// components/theme-transition-overlay.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface ThemeTransitionOverlayProps {
  newTheme: 'dark' | 'light'
  origin: { x: number; y: number }
  onComplete: () => void
}

export function ThemeTransitionOverlay({ newTheme, origin, onComplete }: ThemeTransitionOverlayProps) {
  const [animating, setAnimating] = useState(false)
  const doneRef = useRef(false)

  function complete() {
    if (doneRef.current) return
    doneRef.current = true
    onComplete()
  }

  useEffect(() => {
    const t = setTimeout(() => setAnimating(true), 0)
    const safety = setTimeout(complete, 650)
    return () => {
      clearTimeout(t)
      clearTimeout(safety)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={newTheme === 'dark' ? 'dark' : ''}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'var(--background)',
        clipPath: animating
          ? `circle(150% at ${origin.x}px ${origin.y}px)`
          : `circle(0% at ${origin.x}px ${origin.y}px)`,
        transition: 'clip-path 600ms ease-in-out',
      }}
      onTransitionEnd={complete}
    />
  )
}
