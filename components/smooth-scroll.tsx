'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'
import { setLenis } from '@/lib/smooth-scroll'

/**
 * Window scrolling only. Panels, sidebars and the phone sheet roll their own
 * containers and are marked data-lenis-prevent, so this never takes the wheel
 * away from something that was already scrolling itself.
 *
 * Touch is deliberately native: smoothing a finger reads as lag, and iOS
 * momentum is better than anything we would simulate.
 */
export function SmoothScroll() {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    if (isAdmin) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
    })
    lenisRef.current = lenis
    setLenis(lenis)

    // The skip link is the only in-page anchor. The browser's own jump would
    // move focus to the target, so the replacement has to do that too.
    function onAnchorClick(e: MouseEvent) {
      const anchor = (e.target as Element | null)?.closest?.('a[href^="#"]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      const id = anchor.getAttribute('href')?.slice(1)
      if (!id) return
      const target = document.getElementById(id)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target, { offset: -64 })
      target.focus({ preventScroll: true })
    }
    document.addEventListener('click', onAnchorClick)

    return () => {
      document.removeEventListener('click', onAnchorClick)
      setLenis(null)
      lenisRef.current = null
      lenis.destroy()
    }
  }, [isAdmin])

  // The App Router resets the window itself; Lenis has to re-anchor or its
  // next gesture starts from the old offset.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true, force: true })
  }, [pathname])

  return null
}
