// components/pro-mark.tsx
//
// "Pro", built from 3 px squares on a 4 px pitch, each one a real colour from
// the sites this member has hearted. The approved Pro language: the squares
// gather as noise, then sort in one left-to-right sweep (hue across, light to
// dark down each column), then stay still. Hover replays it. Canvas 2D, no
// libraries; reduced motion shows the sorted word.
'use client'

import { useEffect, useRef } from 'react'
import { hsl, loadBandColours, PITCH, TILE } from '@/components/colour-strip'

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const cl = (t: number) => Math.max(0, Math.min(1, t))
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** Grid slots covered by the word, left edge on x = 0. */
function wordSlots(width: number, height: number): [number, number][] {
  const c = document.createElement('canvas'); c.width = width; c.height = height
  const g = c.getContext('2d')!
  const font = (fs: number) => `760 ${fs}px "BDO Grotesk", "Helvetica Neue", system-ui, sans-serif`
  g.font = font(100)
  const m = g.measureText('Pro')
  const fs = Math.floor(100 * (height * 0.92) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent))
  g.font = font(fs)
  const m2 = g.measureText('Pro')
  g.fillStyle = '#000'
  g.fillText('Pro', m2.actualBoundingBoxLeft, m2.actualBoundingBoxAscent + 1)
  const d = g.getImageData(0, 0, width, height).data
  const out: [number, number][] = []
  for (let y = PITCH / 2; y < height; y += PITCH)
    for (let x = TILE / 2; x < width; x += PITCH)
      if (d[(Math.floor(y) * width + Math.floor(x)) * 4 + 3] > 110) out.push([x - TILE / 2, y - TILE / 2])
  return out
}

export function ProMark({ ids, height = 56, className = '' }: { ids?: number[]; height?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const replay = useRef<() => void>(() => {})
  const key = ids?.slice(0, 40).join(',') ?? ''

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    let raf = 0, cancelled = false
    const W = Math.round(cv.getBoundingClientRect().width) || 200, H = Math.ceil(height / PITCH) * PITCH
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = W * dpr; cv.height = H * dpr
    const g = cv.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)

    Promise.all([loadBandColours(ids), document.fonts?.ready]).then(([all]) => {
      if (cancelled || !all.length) return
      // Every square has to read against the card: no pale tints on light, no near-blacks on dark.
      const dark = document.documentElement.classList.contains('dark')
      const legible = all.filter(c => { const l = hsl(c)[2]; return dark ? l > 0.32 : l < 0.6 })
      const colors = legible.length >= 4 ? legible : all
      const slots = wordSlots(W, H)
      // Colours run across the word by hue; inside each column, light sits on top.
      const pool = Array.from({ length: slots.length }, (_, i) => colors[i % colors.length])
      const byCol = new Map<number, number[]>()
      slots.forEach((s, i) => (byCol.get(s[0]) ?? byCol.set(s[0], []).get(s[0])!).push(i))
      const ordered = [...pool].sort((a, b) => colors.indexOf(a) - colors.indexOf(b))
      const colour = new Array<string>(slots.length)
      let p = 0
      for (const x of [...byCol.keys()].sort((a, b) => a - b)) {
        const col = byCol.get(x)!.sort((a, b) => slots[a][1] - slots[b][1])
        const chunk = ordered.slice(p, p + col.length).sort((a, b) => hsl(b)[2] - hsl(a)[2]); p += col.length
        col.forEach((id, j) => { colour[id] = chunk[j] })
      }
      const perm = slots.map((_, i) => i).sort(() => Math.random() - 0.5)
      const tiles = slots.map((home, i) => ({ home, noise: slots[perm[i]], c: colour[i], d: Math.random() * 0.35, j: Math.random() }))

      const draw = (T: number) => {
        g.clearRect(0, 0, W, H)
        for (const t of tiles) {
          const k1 = ease(cl((T - t.d) / 0.5))
          const k2 = ease(cl((T - (0.75 + (t.home[0] / W) * 0.5 + t.j * 0.08)) / 0.35))
          const x = k2 > 0 ? mix(t.noise[0], t.home[0], k2) : t.noise[0]
          const y = (k2 > 0 ? mix(t.noise[1], t.home[1], k2) : t.noise[1]) - Math.sin(Math.PI * k2) * 3
          g.globalAlpha = cl(k1 * 2)
          g.fillStyle = t.c
          g.fillRect(x, y, TILE, TILE)
        }
        g.globalAlpha = 1
      }
      const play = () => {
        cancelAnimationFrame(raf)
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return draw(99)
        const start = performance.now()
        const frame = (now: number) => {
          const T = (now - start) / 1000
          draw(T)
          if (T < 1.8 && !cancelled) raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
      }
      replay.current = play
      play()
    })
    return () => { cancelled = true; cancelAnimationFrame(raf) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, height])

  return (
    <canvas
      ref={ref} aria-label="Pro" role="img"
      onMouseEnter={() => replay.current()}
      className={'block w-full ' + className}
      style={{ height: Math.ceil(height / PITCH) * PITCH }}
    />
  )
}
