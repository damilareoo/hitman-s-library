'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { EASE } from '@/lib/motion'

// Ceiling, not a target: the counter races the page and gets out of the way as
// soon as it can. It never renders on the server, so no route ships a blank
// full-screen overlay in its HTML.
const MAX_DURATION = 900

export function Preloader() {
  const [phase, setPhase] = useState<'idle' | 'running' | 'exiting'>('idle')
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    // Gallery only, once per session, and never for reduced-motion visitors.
    if (
      window.location.pathname !== '/' ||
      sessionStorage.getItem('preloader_shown') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    sessionStorage.setItem('preloader_shown', '1')
    setPhase('running')

    const start = performance.now()

    const finish = () => {
      cancelAnimationFrame(rafRef.current)
      setCount(100)
      setPhase('exiting')
      timerRef.current = setTimeout(() => setPhase('idle'), 520)
    }

    const tick = (now: number) => {
      const t = Math.min((now - start) / MAX_DURATION, 1)
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setCount(Math.floor(eased * 100))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else finish()
    }
    rafRef.current = requestAnimationFrame(tick)

    // Whichever comes first: the page being ready, or the ceiling above.
    if (document.readyState === 'complete') {
      timerRef.current = setTimeout(finish, 250)
    } else {
      window.addEventListener('load', finish, { once: true })
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timerRef.current)
      window.removeEventListener('load', finish)
    }
  }, [])

  if (phase === 'idle') return null

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center pointer-events-none"
      animate={phase === 'exiting' ? { y: '-100%' } : { y: 0 }}
      transition={phase === 'exiting' ? { duration: 0.5, ease: EASE } : { duration: 0 }}
    >
      <div className="flex flex-col items-center gap-3">
        <span
          className="font-mono tabular-nums text-foreground select-none"
          style={{ fontSize: '11px', letterSpacing: '0.12em' }}
        >
          {String(count).padStart(3, '0')}
        </span>

        <div
          className="relative overflow-hidden bg-edge-faint"
          style={{ width: 40, height: 1 }}
        >
          <div
            className="absolute inset-y-0 left-0 bg-foreground origin-left"
            style={{
              width: '100%',
              transform: `scaleX(${count / 100})`,
              transition: 'transform 16ms linear',
            }}
          />
        </div>
      </div>
    </motion.div>
  )
}
