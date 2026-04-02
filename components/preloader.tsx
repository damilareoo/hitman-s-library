'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

export function Preloader() {
  const [count, setCount] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [done, setDone] = useState(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    // Only show on gallery page, once per session
    if (
      window.location.pathname !== '/' ||
      sessionStorage.getItem('preloader_shown')
    ) {
      setDone(true)
      return
    }
    sessionStorage.setItem('preloader_shown', '1')

    const duration = 1400
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // Ease out expo — fast start, tense finish
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setCount(Math.floor(eased * 100))

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setCount(100)
        setTimeout(() => {
          setExiting(true)
          setTimeout(() => setDone(true), 550)
        }, 180)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  if (done) return null

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center pointer-events-none"
      animate={exiting ? { y: '-100%' } : { y: 0 }}
      transition={
        exiting
          ? { duration: 0.52, ease: [0.76, 0, 0.24, 1] }
          : { duration: 0 }
      }
    >
      <div className="flex flex-col items-center gap-3">
        <span
          className="font-mono tabular-nums text-foreground select-none"
          style={{ fontSize: '11px', letterSpacing: '0.12em' }}
        >
          {String(count).padStart(3, '0')}
        </span>

        <div
          className="relative overflow-hidden bg-border/30"
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
