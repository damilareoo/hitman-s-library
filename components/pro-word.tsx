// components/pro-word.tsx
//
// The Pro mark at header size: the same word as the Pro card and the welcome
// email, built from small squares of real library colours (2px pitch, 1.6px
// squares, 14px tall). The squares sweep in once, left to right, when the
// header first paints, then rest. Hover only firms the label; nothing moves
// on something seen this often. Reduced motion draws it finished.
'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAccount } from '@/lib/account-client'
import { hueWindow, centreOf, sortForSlots, fill, type Swatch } from '@/lib/pro/palette'

const H = 14, PITCH = 2, TILE = 1.6, SWEEP = 420, FADE = 160
const FONT = (fs: number) => `760 ${fs}px "BDO Grotesk", "Helvetica Neue", system-ui, sans-serif`
// Amber, the Pro colour, for the moment before library colours arrive.
const FALLBACK: Swatch[] = ['#e8a04a', '#d9822b', '#c96a1c', '#f0b36a', '#e07b39', '#d4952f'].map(c => [c, ''] as Swatch)

export function ProWord({ colors }: { colors: string[] }) {
  // Members see the same mark, as their badge; it opens Manage.
  const pro = Boolean(useAccount().pro)
  const ref = useRef<HTMLCanvasElement>(null)
  const drawn = useRef(false)
  const key = colors.slice(0, 60).join(',')

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    let raf = 0, cancelled = false
    const draw = () => {
      const dark = document.documentElement.classList.contains('dark')
      const all = colors.filter(c => /^#[0-9a-f]{6}$/i.test(c)).map(c => [c.toLowerCase(), ''] as Swatch)
      const pool = all.length ? hueWindow(all, all, dark) : FALLBACK
      const centre = centreOf(pool)
      const DPR = Math.min(2, window.devicePixelRatio || 1)

      // The word's shape, sampled at 8x so each square reads its true coverage.
      const fs = H / 0.72
      const g = document.createElement('canvas').getContext('2d')!
      g.font = FONT(fs); g.letterSpacing = `${-fs * 0.03}px`
      const m = g.measureText('Pro')
      const W = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + 2
      const HH = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 2
      const S = 8, mc = document.createElement('canvas'); mc.width = W * S; mc.height = HH * S
      const mg = mc.getContext('2d')!; mg.scale(S, S); mg.font = g.font; mg.letterSpacing = g.letterSpacing
      mg.fillText('Pro', m.actualBoundingBoxLeft + 1, m.actualBoundingBoxAscent + 1)
      const md = mg.getImageData(0, 0, W * S, HH * S).data
      const slots: [number, number][] = []
      for (let y = 0; y + TILE <= HH; y += PITCH) for (let x = 0; x + TILE <= W; x += PITCH) {
        let on = 0, n = 0
        for (let a = 0; a < TILE * S; a += 2) for (let c = 0; c < TILE * S; c += 2) {
          n++; if (md[(Math.floor(y * S + a) * W * S + Math.floor(x * S + c)) * 4 + 3] > 128) on++
        }
        if (on / n > 0.45) slots.push([x, y])
      }
      const cols = sortForSlots(slots, fill(pool, slots.length, 7), centre)

      cv.width = W * DPR; cv.height = HH * DPR
      cv.style.width = `${W}px`; cv.style.height = `${HH}px`
      const ctx = cv.getContext('2d')!
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      const paint = (t: number) => {
        ctx.clearRect(0, 0, W, HH)
        slots.forEach(([x, y], i) => {
          const a = Math.max(0, Math.min(1, (t - (x / W) * SWEEP) / FADE))
          if (!a) return
          ctx.globalAlpha = a; ctx.fillStyle = cols[i][0]; ctx.fillRect(x, y, TILE, TILE)
        })
        ctx.globalAlpha = 1
      }
      // The sweep plays once per page view; redraws (theme, colours) are instant.
      if (drawn.current || matchMedia('(prefers-reduced-motion: reduce)').matches) { paint(1e9); return }
      drawn.current = true
      const t0 = performance.now()
      const tick = (now: number) => {
        if (cancelled) return
        const t = now - t0
        paint(t)
        if (t < SWEEP + FADE) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    const start = () => { if (!cancelled) draw() }
    // The word is set in BDO Grotesk; wait for it so the shape is the real one.
    document.fonts?.load(FONT(20)).then(start, start)
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); start() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => { cancelled = true; cancelAnimationFrame(raf); mo.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <Link
      href="/pro"
      aria-label={pro ? 'Your Pro membership' : 'Hitman’s Library Pro'}
      title={pro ? 'Your Pro membership' : 'Pro: unlimited kits and search by palette'}
      className="relative inline-flex items-center h-8 px-1.5 mr-0.5 rounded-[10px] hover:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A04A] after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
    >
      <canvas ref={ref} aria-hidden="true" className="block" width={30} height={16} />
    </Link>
  )
}
