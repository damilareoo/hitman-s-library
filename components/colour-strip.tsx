// components/colour-strip.tsx
//
// A band of 3 px squares in real library colours across the top of a card.
// With `ids`, the colours come from those sites (your hearts); without, from
// the newest sites. One coherent band of hues — never a rainbow — sweeping in
// once, then still. The library card's signature, shared by the sign-in sheet
// and the account card.
'use client'

import { useEffect, useRef } from 'react'

const PITCH = 4, TILE = 3, ROWS = 6

function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  if (!d) return [0, 0, l]
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l]
}

/** The densest 60° band of hues, ordered across it; light at the top of each column. */
function band(colors: string[]): string[] {
  const usable = colors.filter(c => { const [, s, l] = hsl(c); return s > 0.3 && l > 0.28 && l < 0.78 })
  if (usable.length < 4) return usable
  const dist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
  const W = 30
  let best = 0, most = -1
  for (let c = 0; c < 360; c += 10) {
    const n = usable.filter(x => dist(hsl(x)[0], c) <= W).length
    if (n > most) { most = n; best = c }
  }
  const rel = (c: string) => ((hsl(c)[0] - best + 540) % 360) - 180
  return usable.filter(c => dist(hsl(c)[0], best) <= W).sort((a, b) => rel(a) - rel(b))
}

export function ColourStrip({ ids, className = '' }: { ids?: number[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = ids?.slice(0, 40).join(',') ?? ''

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const W = Math.round(cv.getBoundingClientRect().width) || 360
    const H = ROWS * PITCH
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = W * dpr; cv.height = H * dpr
    const g = cv.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cols = Math.floor(W / PITCH)
    const ink = getComputedStyle(cv).color
    let raf = 0, cancelled = false

    const paint = (colors: string[], t: number) => {
      g.clearRect(0, 0, W, H)
      for (let c = 0; c < cols; c++) {
        const k = c / cols
        const a = Math.max(0, Math.min(1, (t - k * 0.5) / 0.25))
        // Each column is one stretch of the band, its rows stepping light to dark.
        const slice = colors.length ? colors.slice(Math.floor(k * colors.length), Math.floor(k * colors.length) + ROWS) : []
        const sorted = [...slice].sort((x, y) => hsl(y)[2] - hsl(x)[2])
        for (let r = 0; r < ROWS; r++) {
          const x = c * PITCH, y = r * PITCH
          if (a < 1) { g.globalAlpha = 0.06; g.fillStyle = ink; g.fillRect(x, y, TILE, TILE) }
          if (a <= 0 || !sorted.length) continue
          g.globalAlpha = a
          g.fillStyle = sorted[r % sorted.length]
          g.fillRect(x, y, TILE, TILE)
        }
      }
      g.globalAlpha = 1
    }
    paint([], 0)

    const load = (url: string) => fetch(url)
      .then(r => r.json())
      .then((body: { designs?: { colors?: string[] }[] }) =>
        band([...new Set((body.designs ?? []).flatMap(d => d.colors ?? []))].filter(c => /^#[0-9a-f]{6}$/i.test(c))))
      .catch(() => [] as string[])
    const recent = '/api/design/filter-advanced?limit=24&sortBy=recent'
    // A few hearts can be too few colours for a band; the newest sites fill in.
    ;(ids && ids.length
      ? load(`/api/design/filter-advanced?ids=${ids.slice(0, 40).join(',')}`).then(c => c.length >= 6 ? c : load(recent))
      : load(recent))
      .then(colors => {
        if (cancelled || !colors.length) return
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return paint(colors, 2)
        const start = performance.now()
        const frame = (now: number) => {
          const t = (now - start) / 650
          paint(colors, t)
          if (t < 1.5 && !cancelled) raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
      })
    return () => { cancelled = true; cancelAnimationFrame(raf) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return <canvas ref={ref} aria-hidden className={'block w-full text-ink ' + className} style={{ height: ROWS * PITCH }} />
}
