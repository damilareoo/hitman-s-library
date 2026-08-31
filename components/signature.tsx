'use client'

import { useEffect, useRef, useState } from 'react'
import { SIGNATURES, type SignatureShape } from '@/data/signatures'

interface SignatureProps {
  /** Whose hand. */
  name: keyof typeof SIGNATURES
  /** Accessible name — the signature is an image of a name, so it needs one. */
  label: string
  /** Seconds to wait after entering view, so a pair signs one after the other. */
  delay?: number
  className?: string
}

const DRAW_SECONDS = 1.4

/**
 * A signature that writes itself once, when it is looked at.
 *
 * The path is a single centreline, so `stroke-dashoffset` walks a real pen
 * along it rather than wiping a finished shape into view. `pathLength={1}`
 * normalises the maths: whatever the artwork actually measures, the dash is
 * one unit long and the offset runs one to zero — which means a traced
 * signature can be dropped in later without retuning anything here.
 */
export function Signature({ name, label, delay = 0, className = '' }: SignatureProps) {
  const shape: SignatureShape = SIGNATURES[name]
  const ref = useRef<SVGSVGElement>(null)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Anyone who has asked for less motion gets the finished signature, not
    // a withheld one — the content is the name, and the drawing is decoration.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDrawn(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setDrawn(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <svg
      ref={ref}
      viewBox={shape.viewBox}
      role="img"
      aria-label={`${label}, signed`}
      className={`w-full h-auto overflow-visible ${className}`}
    >
      <path
        d={shape.d}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: 1,
          strokeDashoffset: drawn ? 0 : 1,
          transition: `stroke-dashoffset ${DRAW_SECONDS}s cubic-bezier(0.65, 0, 0.35, 1) ${delay}s`,
        }}
      />
    </svg>
  )
}
