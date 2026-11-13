#!/usr/bin/env node
// scripts/render-pro-gifs.mjs
//
// Renders the Pro moment as animated GIFs for the welcome email: the same
// intro as the app (scatter → gather → left-to-right sort sweep), the same
// grid (3px squares, 4px pitch, -4% tracking), in library colours. One GIF per
// 30° hue window; the email picks the one nearest the member's own colours.
// Frame 0 is the finished word, so clients that show only the first frame
// (Outlook on Windows) still show a clean "Pro". Plays once, rests sorted.
//
//   node scripts/render-pro-gifs.mjs     → public/email/pro-h000.gif … pro-h330.gif
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifenc

const W = 300, SCALE = 2, FPS = 20

// Library colours (public data), with the site each came from.
const swatches = []
for (let o = 0; o < 1000; o += 100) {
  const j = await (await fetch(`https://hitmanslibrary.xyz/api/design/filter-advanced?limit=100&offset=${o}`)).json()
  for (const d of j.designs) for (const c of d.colors ?? []) if (/^#[0-9a-f]{6}$/i.test(c)) swatches.push(c.toLowerCase())
  if (!j.pagination?.hasMore) break
}

const font = readFileSync(new URL('../public/fonts/BDOGrotesk-VF.woff2', import.meta.url)).toString('base64')
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.setContent(`<style>@font-face{font-family:BDO;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900}</style><div style="font-family:BDO">x</div>`)
await page.evaluate(() => document.fonts.load('760 100px BDO'))

mkdirSync(new URL('../public/email/', import.meta.url), { recursive: true })

for (let centre = 0; centre < 360; centre += 30) {
  const out = await page.evaluate(({ W, SCALE, FPS, centre, swatches }) => {
    const PITCH = 4, TILE = 3
    const hsl = h => { const n = parseInt(h.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m; if (!d) return [0, 0, l]; const k = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(k * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l] }
    const hd = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
    // Same rules as lib/pro/palette.ts: vivid, legible on white, one ±46° window.
    const ok = swatches.filter(c => { const [h, s, l] = hsl(c); return s > 0.42 && l > 0.24 && l < 0.6 && hd(h, centre) < 46 })
    if (ok.length < 6) return null
    // The word, fitted to W.
    const g0 = document.createElement('canvas').getContext('2d')
    g0.font = '760 100px BDO'; g0.letterSpacing = '-4px'
    const m = g0.measureText('Pro'), FS = Math.floor(100 * W / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight))
    g0.font = `760 ${FS}px BDO`; g0.letterSpacing = `${-FS * 0.04}px`
    const m2 = g0.measureText('Pro'), asc = m2.actualBoundingBoxAscent, desc = m2.actualBoundingBoxDescent
    const H = Math.ceil((asc + desc + 8) / PITCH) * PITCH
    const mc = document.createElement('canvas'); mc.width = W; mc.height = H
    const mg = mc.getContext('2d'); mg.font = `760 ${FS}px BDO`; mg.letterSpacing = `${-FS * 0.04}px`; mg.fillText('Pro', m2.actualBoundingBoxLeft, asc + 4)
    const md = mg.getImageData(0, 0, W, H).data, slots = []
    for (let y = PITCH / 2; y < H; y += PITCH) for (let x = TILE / 2; x < W; x += PITCH) if (md[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 110) slots.push([x - TILE / 2, y - TILE / 2])
    // Colours: deterministic fill, hue across, lightest on top of each column.
    let s = centre * 7919 + 1; const rand = () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31 }
    const rel = c => ((hsl(c)[0] - centre + 540) % 360) - 180
    const cols = slots.map(() => ok[Math.floor(rand() * ok.length)]).sort((a, b) => rel(a) - rel(b))
    const byCol = new Map(); slots.forEach((p, i) => (byCol.get(p[0]) ?? byCol.set(p[0], []).get(p[0])).push(i))
    const colour = new Array(slots.length); let p = 0
    for (const k of [...byCol.keys()].sort((a, b) => a - b)) {
      const col = byCol.get(k).sort((a, b) => slots[a][1] - slots[b][1])
      const chunk = cols.slice(p, p + col.length).sort((a, b) => hsl(b)[2] - hsl(a)[2]); p += col.length
      col.forEach((id, j) => { colour[id] = chunk[j] })
    }
    // The app's intro timing.
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), cl = t => Math.max(0, Math.min(1, t)), mix = (a, b, t) => a + (b - a) * t
    const SORT_AT = 1.15, SORT_SWEEP = 0.62, SORT_DUR = 0.42, END = SORT_AT + SORT_SWEEP + 0.1 + SORT_DUR + 0.05
    const perm = slots.map((_, i) => i).sort(() => rand() - 0.5)
    const tiles = slots.map((home, i) => { const a = rand() * 6.2832, r = Math.pow(rand(), 0.6); return { home, c: colour[i], noise: slots[perm[i]], cx: W / 2 + Math.cos(a) * r * W * 0.42, cy: H / 2 + Math.sin(a) * r * H * 0.36, d1: 0.05 + rand() * 0.45, j: rand() } })
    const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = H * SCALE
    const x = cv.getContext('2d')
    window.__draw = T => {
      x.setTransform(SCALE, 0, 0, SCALE, 0, 0); x.globalAlpha = 1; x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H)
      for (const t of tiles) {
        let px = t.home[0], py = t.home[1], a = 1
        if (T < END) {
          const k1 = ease(cl((T - t.d1) / 0.7)); px = mix(t.cx, t.noise[0], k1); py = mix(t.cy, t.noise[1], k1); a = cl(k1 * 3)
          const k2 = ease(cl((T - (SORT_AT + (t.home[0] / W) * SORT_SWEEP + t.j * 0.1)) / SORT_DUR))
          if (k2 > 0) { px = mix(t.noise[0], t.home[0], k2); py = mix(t.noise[1], t.home[1], k2) - Math.sin(Math.PI * k2) * 5 }
        }
        x.globalAlpha = a; x.fillStyle = t.c; x.fillRect(Math.round(px * SCALE) / SCALE, Math.round(py * SCALE) / SCALE, TILE, TILE)
      }
      const d = x.getImageData(0, 0, cv.width, cv.height).data
      let bin = ''; for (let i = 0; i < d.length; i += 0x8000) bin += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000))
      return btoa(bin)
    }
    // Frame 0 is the finished word, for clients that only show the first frame.
    const times = [99]; for (let T = 0; T <= END + 0.04; T += 1 / FPS) times.push(T); times.push(99)
    return { width: cv.width, height: cv.height, times }
  }, { W, SCALE, FPS, centre, swatches })
  if (!out) { console.log(`h${centre}: too few colours, skipped`); continue }

  const grab = async T => new Uint8ClampedArray(Buffer.from(await page.evaluate(t => window.__draw(t), T), 'base64'))
  // One palette for every frame, taken from the finished word plus white.
  const palette = quantize(await grab(99), 128)
  const gif = GIFEncoder()
  for (let i = 0; i < out.times.length; i++) {
    const delay = i === 0 ? 20 : i === out.times.length - 1 ? 60000 : Math.round(1000 / FPS)
    gif.writeFrame(applyPalette(await grab(out.times[i]), palette), out.width, out.height, { palette: i === 0 ? palette : undefined, delay, repeat: -1 })
  }
  gif.finish()
  const name = `pro-h${String(centre).padStart(3, '0')}.gif`
  writeFileSync(new URL(`../public/email/${name}`, import.meta.url), gif.bytes())
  console.log(`${name}  ${out.width / SCALE}×${out.height / SCALE}  ${out.times.length} frames  ${Math.round(gif.bytes().length / 1024)} KB`)
}
await browser.close()
