// components/library-mosaic.tsx
//
// The mark — a shelf, two books and one leaning — built from 3 px squares of
// real colours taken from the newest sites in the library, hue running left
// to right. The same material as the Pro card, at the size of a logo. It
// sweeps in once (about 0.7 s), then stops drawing: no idle animation.
'use client'

import { useEffect, useRef } from 'react'

const PITCH = 4, TILE = 3, SCALE = 2.2
const W = Math.round(64 * SCALE), H = Math.round(62 * SCALE)

// The mark's geometry, from public/icon.svg (64-unit box).
function drawMark(g: CanvasRenderingContext2D) {
  g.scale(SCALE, SCALE)
  const rect = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill() }
  rect(6, 54, 52, 4, 2)
  rect(9, 12, 11, 42, 1.6)
  rect(26, 6, 11, 48, 1.6)
  g.save(); g.translate(54, 54); g.rotate((15 * Math.PI) / 180); g.translate(-54, -54); rect(43, 10, 11, 44, 1.6); g.restore()
}

function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  if (!d) return [0, 0, l]
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l]
}

/**
 * One coherent band of hues — wherever the newest colours cluster — rather
 * than the whole spectrum, which reads as a rainbow. Same rule as the Pro card.
 */
function pickBand(colors: string[]): string[] {
  if (colors.length < 6) return colors.sort((a, b) => hsl(a)[0] - hsl(b)[0])
  const dist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
  let best = 0, bestCount = -1
  for (let center = 0; center < 360; center += 10) {
    const n = colors.filter(c => dist(hsl(c)[0], center) <= 50).length
    if (n > bestCount) { bestCount = n; best = center }
  }
  const rel = (c: string) => ((hsl(c)[0] - best + 540) % 360) - 180
  return colors.filter(c => dist(hsl(c)[0], best) <= 50).sort((a, b) => rel(a) - rel(b))
}

export function LibraryMosaic({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = W * dpr; cv.height = H * dpr
    const g = cv.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)

    const mask = document.createElement('canvas'); mask.width = W; mask.height = H
    const mg = mask.getContext('2d')!; mg.fillStyle = '#000'; drawMark(mg)
    const px = mg.getImageData(0, 0, W, H).data
    const tiles: { x: number; y: number }[] = []
    for (let y = PITCH / 2; y < H; y += PITCH) for (let x = PITCH / 2; x < W; x += PITCH)
      if (px[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 110) tiles.push({ x: x - TILE / 2, y: y - TILE / 2 })

    let raf = 0, cancelled = false
    const ink = getComputedStyle(cv).color
    const paint = (colors: string[], t: number) => {
      g.clearRect(0, 0, W, H)
      for (const tile of tiles) {
        const k = tile.x / W
        const a = Math.max(0, Math.min(1, (t - k * 0.45) / 0.25))
        // The mark is there from the first frame as a faint ink grid; colour
        // sweeps over it once the newest palettes arrive.
        if (a < 1) { g.globalAlpha = 0.14; g.fillStyle = ink; g.fillRect(tile.x, tile.y, TILE, TILE) }
        if (a <= 0) continue
        g.globalAlpha = a
        g.fillStyle = colors.length ? colors[Math.min(colors.length - 1, Math.floor(k * colors.length))] : ink
        g.fillRect(tile.x, tile.y - (1 - a) * 3, TILE, TILE)
      }
      g.globalAlpha = 1
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    paint([], 0)
    fetch('/api/design/filter-advanced?limit=24&sortBy=recent')
      .then(r => r.json())
      .then((body: { designs?: { colors?: string[] }[] }) =>
        [...new Set((body.designs ?? []).flatMap(d => d.colors ?? []))]
          .filter(c => /^#[0-9a-f]{6}$/i.test(c))
          .filter(c => { const [, s, l] = hsl(c); return s > 0.35 && l > 0.3 && l < 0.75 }))
      .then(pickBand)
      .catch(() => [] as string[])
      .then(colors => {
        if (cancelled) return
        if (reduce) return paint(colors, 1)
        const start = performance.now()
        const frame = (now: number) => {
          const t = (now - start) / 700
          paint(colors, t)
          if (t < 1 && !cancelled) raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
      })
    return () => { cancelled = true; cancelAnimationFrame(raf) }
  }, [])

  return <canvas ref={ref} aria-hidden style={{ width: W, height: H }} className={'text-ink ' + className} />
}
