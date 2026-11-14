// components/pro-mark.tsx
//
// The Pro moment, as approved (extraction-v9): the word "Pro" built from 3px
// squares on a 4px pitch, each one a real colour from a real library site.
// The squares gather as noise, then sort in one left-to-right sweep (hue
// across, light to dark down each column), then stay still. Hover is a
// fisheye lens that names the square at its centre; drag a square out to
// copy its colour, and a near-hue colour from the library fills the gap.
// Replay on hover. Canvas 2D, no libraries; the frame loop only runs while
// something moves. Reduced motion shows the sorted word.
//
// One component everywhere Pro is shown: the Pro card, the member card.
'use client'

import { useEffect, useRef } from 'react'
import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { hsl, hueDist, hueWindow, centreOf, sortForSlots, fill, type Swatch } from '@/lib/pro/palette'

const PITCH = 4, TILE = 3
const FONT = (fs: number) => `760 ${fs}px "BDO Grotesk", "Helvetica Neue", system-ui, sans-serif`

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const out = (t: number) => 1 - Math.pow(1 - t, 3)
const cl = (t: number) => Math.max(0, Math.min(1, t))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const SORT_AT = 1.15, SORT_SWEEP = 0.62, SORT_DUR = 0.42, INTRO_END = SORT_AT + SORT_SWEEP + 0.1 + SORT_DUR + 0.05

// One fetch per set of hearts, shared: a menu that opens later finds the
// colours already here instead of opening on an empty canvas.
const swatchCache = new Map<string, Promise<Swatch[]>>()
/** Fetch the colours ahead of time (e.g. once a Pro member is signed in). */
export function warmProMark(ids?: number[]) { void loadSwatches(ids) }

/** Real colours with the site each came from: your hearts, topped up from the newest sites. */
function loadSwatches(ids?: number[]): Promise<Swatch[]> {
  const key = ids?.slice(0, 40).join(',') ?? ''
  let p = swatchCache.get(key)
  if (!p) { p = fetchSwatches(ids); swatchCache.set(key, p) }
  return p
}

async function fetchSwatches(ids?: number[]): Promise<Swatch[]> {
  const pull = async (url: string): Promise<Swatch[]> => {
    try {
      const body = await (await fetch(url)).json() as { designs?: { url?: string; colors?: string[] }[] }
      return (body.designs ?? []).flatMap(d => {
        let host = ''
        try { host = new URL(d.url ?? '').hostname.replace(/^www\./, '') } catch { /* no host */ }
        return (d.colors ?? []).filter(c => /^#[0-9a-f]{6}$/i.test(c)).map(c => [c.toLowerCase(), host] as Swatch)
      })
    } catch { return [] }
  }
  const mine = ids?.length ? await pull(`/api/design/filter-advanced?ids=${ids.slice(0, 40).join(',')}`) : []
  return mine.length >= 40 ? mine : [...mine, ...(await pull('/api/design/filter-advanced?limit=100&sortBy=recent'))]
}

interface Tile { c: string; site: string; home: [number, number]; noise: [number, number]; cx: number; cy: number; d1: number; j: number; gone: boolean; refill: number }

export function ProMark({ ids, pad = 16, className = '' }: { ids?: number[]; pad?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const replayRef = useRef<() => void>(() => {})
  const key = ids?.slice(0, 40).join(',') ?? ''

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const x = cv.getContext('2d')!
    const W = Math.round(cv.parentElement!.getBoundingClientRect().width) || 300
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
    let H = 120, raf = 0, cancelled = false, phase: 'idle' | 'intro' | 'live' = 'idle', t0 = 0
    let tiles: Tile[] = [], slots: [number, number][] = [], pool: Swatch[] = []
    const dark = () => document.documentElement.classList.contains('dark')
    const ink = () => (dark() ? '#f2f1ec' : '#161615'), muted = () => (dark() ? '#8b8983' : '#76746e')

    // Size the word to the content width; its ink sits on the same left edge as the text below.
    function wordSlots() {
      const g = document.createElement('canvas').getContext('2d')!
      g.font = FONT(100); (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-4px'
      const m = g.measureText('Pro'), inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
      const FS = Math.floor(100 * (W - 2 * pad) / inkW)
      g.font = FONT(FS); (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-FS * 0.04}px`
      const m2 = g.measureText('Pro'), asc = m2.actualBoundingBoxAscent, desc = m2.actualBoundingBoxDescent
      H = Math.ceil((pad + 4 + asc + desc + 14) / PITCH) * PITCH
      cv!.width = W * DPR; cv!.height = H * DPR; cv!.style.width = W + 'px'; cv!.style.height = H + 'px'
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const h = c.getContext('2d')!
      h.font = FONT(FS); (h as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-FS * 0.04}px`
      h.fillStyle = '#000'; h.fillText('Pro', pad + m2.actualBoundingBoxLeft, pad + 4 + asc)
      const d = h.getImageData(0, 0, W, H).data, o: [number, number][] = []
      for (let y = PITCH / 2; y < H; y += PITCH)
        for (let k = pad + TILE / 2; k < W; k += PITCH)
          if (d[(Math.floor(y) * W + Math.floor(k)) * 4 + 3] > 110) o.push([k - TILE / 2, y - TILE / 2])
      return o
    }
    function scatter(t: Tile, perm: number) {
      const a = Math.random() * 6.2832, r = Math.pow(Math.random(), 0.6)
      Object.assign(t, { noise: slots[perm], cx: W / 2 + Math.cos(a) * r * W * 0.42, cy: H / 2 + Math.sin(a) * r * H * 0.36, d1: 0.05 + Math.random() * 0.45, j: Math.random(), gone: false, refill: 0 })
    }
    function introPos(t: Tile, T: number): [number, number, number] {
      const k1 = ease(cl((T - t.d1) / 0.7))
      let px = mix(t.cx, t.noise[0], k1), py = mix(t.cy, t.noise[1], k1)
      const k2 = ease(cl((T - (SORT_AT + (t.home[0] / W) * SORT_SWEEP + t.j * 0.1)) / SORT_DUR))
      if (k2 > 0) { px = mix(t.noise[0], t.home[0], k2); py = mix(t.noise[1], t.home[1], k2) - Math.sin(Math.PI * k2) * 5 }
      return [px, py, cl(k1 * 3)]
    }

    // The lens: a Sarkar-Brown fisheye.
    const lens = { x: -999, y: -999, in: false, m: 0, still: 0, lx: 0, ly: 0, R: 0, K: 2.6 }
    const fish = (px: number, py: number): [number, number, number] => {
      if (lens.m < 0.005) return [px, py, 1]
      const dx = px - lens.x, dy = py - lens.y, d = Math.hypot(dx, dy), R = lens.R
      if (d >= R) return [px, py, 1]
      const t = d / R, K = lens.K * lens.m, g = t * (1 + K) / (1 + K * t), s = (1 + K) / ((1 + K * t) * (1 + K * t)), f = d ? g * R / d : 0
      return [lens.x + dx * f, lens.y + dy * f, s]
    }
    const tc = (t: Tile): [number, number] => [t.home[0] + TILE / 2, t.home[1] + TILE / 2]

    // The egg: take a colour.
    const drag = { t: null as Tile | null, on: false, x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0, at: 0, drop: null as Tile | null, dropAt: -1e9 }
    const note = { c: '', strong: '', soft: '', at: -1e9 }
    const tileAt = (px: number, py: number) => {
      let best: Tile | null = null, bd = 1e9
      for (const t of tiles) {
        if (t.gone) continue
        const [fx, fy, s] = fish(...tc(t)), d = (fx - px) ** 2 + (fy - py) ** 2, r = Math.max(TILE * s * 0.75, 3.4)
        if (d < r * r && d < bd) { bd = d; best = t }
      }
      return best
    }

    function label(c: string, strong: string, soft: string, cx: number, y: number) {
      x.font = '600 11px "BDO Grotesk", system-ui'; const w1 = x.measureText(strong).width
      x.font = '500 11px ui-monospace, SFMono-Regular, Menlo, monospace'; const w2 = x.measureText(soft).width
      const tw = 16 + w1 + 9 + w2, lx = Math.min(Math.max(cx - tw / 2, 8), W - tw - 8)
      x.fillStyle = c; x.fillRect(lx, y - 8, 8, 8); x.textAlign = 'left'
      x.font = '600 11px "BDO Grotesk", system-ui'; x.fillStyle = ink(); x.fillText(strong, lx + 16, y)
      x.font = '500 11px ui-monospace, SFMono-Regular, Menlo, monospace'; x.fillStyle = muted(); x.fillText(soft, lx + 16 + w1 + 9, y)
    }

    function frame(now: number) {
      raf = 0
      const T = (now - t0) / 1000
      x.setTransform(DPR, 0, 0, DPR, 0, 0); x.clearRect(0, 0, W, H)
      lens.m += ((lens.in && phase === 'live' && !drag.on ? 1 : 0) - lens.m) * 0.16
      const snap = (v: number) => Math.round(v * DPR) / DPR
      let moving = phase === 'intro' || Math.abs(lens.m - (lens.in ? 1 : 0)) > 0.01 || drag.on || !!drag.drop
      for (const t of tiles) {
        if (phase === 'intro') { const [px, py, a] = introPos(t, T); x.globalAlpha = a; x.fillStyle = t.c; x.fillRect(px, py, TILE, TILE); continue }
        if (t.gone && !t.refill) continue
        let [cx, cy] = tc(t), a = 1
        if (t.refill) { moving = true; const k = out(cl((now - t.refill) / 520)); cy = mix(cy - 12, cy, k); a = k; if (k >= 1) { t.refill = 0; t.gone = false } }
        const [fx, fy, s] = fish(cx, cy), sz = TILE * s
        x.globalAlpha = a; x.fillStyle = t.c; x.fillRect(snap(fx - sz / 2), snap(fy - sz / 2), snap(sz), snap(sz))
      }
      x.globalAlpha = 1
      if (phase === 'intro' && T > INTRO_END) phase = 'live'
      if (phase === 'live') {
        if (lens.m > 0.02) {
          const R = lens.R * lens.m
          x.lineWidth = 1
          for (const [c, o] of [['rgba(255,45,85,.5)', -0.8], ['rgba(34,211,255,.5)', 0.8]] as const) { x.strokeStyle = c; x.beginPath(); x.arc(lens.x + o, lens.y, R, 0, 6.2832); x.stroke() }
          x.strokeStyle = dark() ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.14)'; x.beginPath(); x.arc(lens.x, lens.y, R, 0, 6.2832); x.stroke()
          const rest = now - lens.still
          if (rest >= 420) {
            let best: Tile | null = null, bd = 1e9
            for (const t of tiles) { if (t.gone) continue; const [a, b] = tc(t), d = (a - lens.x) ** 2 + (b - lens.y) ** 2; if (d < bd) { bd = d; best = t } }
            if (best && bd <= PITCH * PITCH * 2.2) {
              const a = out(cl((rest - 420) / 260)), [fx, fy, s] = fish(...tc(best)), sz = TILE * s + 3
              if (a < 1) moving = true
              x.globalAlpha = a; x.strokeStyle = ink(); x.lineWidth = 1.25; x.strokeRect(fx - sz / 2, fy - sz / 2, sz, sz)
              label(best.c, best.site || 'library', best.c.toUpperCase(), lens.x, lens.y + R + 16 <= H - 4 ? lens.y + R + 16 : lens.y - R - 8 >= 14 ? lens.y - R - 8 : Math.min(H - 6, Math.max(14, lens.y + 22)))
              x.globalAlpha = 1
            } else if (rest < 700) moving = true
          } else moving = true
        }
        if (drag.on) { drag.vx = drag.vx * 0.55 + (drag.x - drag.sx) * 0.3; drag.vy = drag.vy * 0.55 + (drag.y - drag.sy) * 0.3; drag.sx += drag.vx; drag.sy += drag.vy }
        const dt = drag.on ? drag.t : drag.drop
        if (dt) {
          const g = drag.on ? out(cl((now - drag.at) / 240)) : 1 - out(cl((now - drag.dropAt) / 280))
          if (!drag.on && g <= 0) drag.drop = null
          else {
            const S = mix(TILE, 30, g), r = mix(0, 6, g), tilt = Math.max(-0.3, Math.min(0.3, drag.vx * 0.025))
            x.save(); x.translate(drag.sx, drag.sy); x.rotate(tilt)
            x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 16 * g; x.shadowOffsetY = 7 * g; x.fillStyle = dt.c
            x.beginPath(); x.roundRect(-S / 2, -S / 2, S, S, r); x.fill()
            x.shadowColor = 'transparent'; x.strokeStyle = dark() ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.09)'; x.lineWidth = 1; x.stroke(); x.restore()
          }
        }
        // The receipt for a colour you took.
        const na = Math.min(out(cl((now - note.at) / 260)), cl((note.at + 2600 - now) / 400))
        if (na > 0) { moving = true; x.globalAlpha = na; label(note.c, note.strong, note.soft, W / 2, H - 6 + (1 - na) * 4); x.globalAlpha = 1 }
      }
      if (moving && !cancelled) raf = requestAnimationFrame(frame)
    }
    const kick = () => { if (!raf && !cancelled) raf = requestAnimationFrame(frame) }

    const local = (e: PointerEvent): [number, number] => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] }
    const onMove = (e: PointerEvent) => {
      const [px, py] = local(e); lens.x = px; lens.y = py; lens.in = true
      if (Math.hypot(px - lens.lx, py - lens.ly) > 2.5) { lens.still = performance.now(); lens.lx = px; lens.ly = py }
      if (drag.on) { drag.x = px; drag.y = py } else if (phase === 'live') cv.style.cursor = tileAt(px, py) ? 'grab' : 'default'
      kick()
    }
    const onLeave = () => { if (!drag.on) { lens.in = false; kick() } }
    const onDown = (e: PointerEvent) => {
      const [px, py] = local(e); Object.assign(lens, { x: px, y: py, in: true, still: performance.now(), lx: px, ly: py })
      if (phase !== 'live') return
      const t = tileAt(px, py); if (!t) return
      cv.setPointerCapture(e.pointerId)
      const [fx, fy] = fish(...tc(t))
      Object.assign(drag, { t, on: true, x: px, y: py, sx: fx, sy: fy, vx: 0, vy: 0, at: performance.now() }); t.gone = true
      cv.style.cursor = 'grabbing'; kick()
    }
    const onUp = (e: PointerEvent) => {
      if (!drag.on || !drag.t) return
      const t = drag.t, [hx, hy] = tc(t)
      drag.on = false; drag.drop = t; drag.dropAt = performance.now(); cv.style.cursor = 'default'
      if (Math.hypot(drag.sx - hx, drag.sy - hy) > 10) {
        navigator.clipboard?.writeText(t.c.toUpperCase()).catch(() => {})
        Object.assign(note, { c: t.c, strong: `${t.c.toUpperCase()} copied`, soft: t.site ? `from ${t.site}` : '', at: performance.now() })
        // The nearest-hue colour from the library fills the gap.
        const h0 = hsl(t.c)[0]; let best: Swatch | null = null, bd = 1e9
        for (const p of pool) { if (p[0] === t.c) continue; const d = hueDist(hsl(p[0])[0], h0) + Math.random() * 12; if (d < bd) { bd = d; best = p } }
        setTimeout(() => { if (best) { t.c = best[0]; t.site = best[1] } t.refill = performance.now(); kick() }, 380)
      } else t.gone = false
      if (e.pointerType !== 'mouse') setTimeout(() => { lens.in = false; kick() }, 700)
      kick()
    }

    function play(rebuild: boolean) {
      if (rebuild) {
        const perm = slots.map((_, i) => i).sort(() => Math.random() - 0.5)
        tiles.forEach((t, i) => scatter(t, perm[i]))
      }
      drag.on = false; drag.drop = null; note.at = -1e9
      phase = RM ? 'live' : 'intro'; t0 = performance.now() + 120; kick()
    }
    replayRef.current = () => { if (phase === 'live') play(true) }

    Promise.all([loadSwatches(ids), document.fonts?.ready]).then(([all]) => {
      if (cancelled || !all.length) return
      // Your hearts come first in `all`; they set the window's centre.
      pool = hueWindow(all, ids?.length ? all.slice(0, 120) : all, dark())
      slots = wordSlots()
      lens.R = Math.min(74, H * 0.55)
      const centre = centreOf(pool)
      const cols = sortForSlots(slots, fill(pool, slots.length), centre)
      const perm = slots.map((_, i) => i).sort(() => Math.random() - 0.5)
      tiles = cols.map((c, i) => { const t = { c: c[0], site: c[1], home: slots[i] } as Tile; scatter(t, perm[i]); return t })
      cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerleave', onLeave)
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp)
      play(false)
    })
    return () => {
      cancelled = true; cancelAnimationFrame(raf)
      cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerleave', onLeave)
      cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pad])

  return (
    <div className={'group/pro relative w-full ' + className}>
      <canvas ref={ref} role="img" aria-label="Pro, made of colours from the library" className="block touch-none" />
      <button
        type="button" onClick={() => replayRef.current()} aria-label="Replay" title="Replay"
        className="absolute top-2.5 right-2.5 w-8 h-8 grid place-items-center rounded-[10px] text-ink-4 hover:text-ink hover:bg-foreground/[0.05] opacity-0 rotate-[30deg] group-hover/pro:opacity-100 group-hover/pro:rotate-0 focus-visible:opacity-100 focus-visible:rotate-0 [@media(hover:none)]:opacity-70 [@media(hover:none)]:rotate-0 transition-[opacity,transform,background-color,color] duration-200 ease-[var(--ease-sig)]"
      >
        <ArrowCounterClockwise className="w-4 h-4" weight="bold" />
      </button>
    </div>
  )
}
