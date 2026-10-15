// lib/motion-capture.ts
// Hover motion clips (Phase 3). Server-only: drives puppeteer + ffmpeg,
// both resolved lazily so importing this module is always safe.
//
// The clip is one continuous take, 5–10 seconds: a smooth full-page scroll
// pass, then a hover-and-hold on the primary CTA so its hover state plays.
// Puppeteer's recorder shells out to ffmpeg (no in-process encoder exists),
// which is why availability is probed rather than assumed: no binary, no
// clip, no error — the screenshot stays the card. Only a *failed* capture
// records metadata.motion_error, in the same categories as every other
// extraction failure (lib/classify-extraction-error.ts).
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import type { Page } from 'puppeteer'
import { classifyExtractionError } from './classify-extraction-error'

/** Nobody's card may cost more than this. Enforced, not hoped for. */
export const MAX_CLIP_BYTES = 300_000
/** Recording viewport: card resolution, so the encode stays small. */
export const CLIP_VIEWPORT = { width: 720, height: 450 }
/** Output scale on top of the recording viewport (~360px wide). */
const CLIP_SCALE = 0.5
/** Scroll pass + CTA hold budget. */
const CLIP_BUDGET_MS = 9000

export interface MotionTags {
  hasTransitions: boolean
  hasAnimations: boolean
  easings: string[]
}

export interface MotionClip {
  tmpPath: string
  bytes: number
  durationMs: number
}

/**
 * Where the ffmpeg binary comes from, in order: explicit env override
 * (local backfill), the bundled npm binary (serverless), PATH. Null when
 * recording is impossible — the caller then skips silently.
 *
 * Deliberately fs-only: require()ing the installer package breaks Next's
 * bundler (it uses dynamic require internally), which 500s every route that
 * imports this module. The binary lives at a predictable path per platform.
 */
export function resolveFfmpegPath(): string | null {
  const override = process.env.FFMPEG_PATH
  if (override && existsSync(override)) return override
  const plat = process.platform === 'win32' ? 'win32' : process.platform
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  for (const dir of [`${plat}-${arch}`, 'linux-x64']) {
    const candidate = join(process.cwd(), 'node_modules', '@ffmpeg-installer', dir, plat === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
    try {
      if (existsSync(candidate)) return candidate
    } catch { /* ignore */ }
  }
  return 'ffmpeg'
}

async function ffmpegExists(ffmpegPath: string): Promise<boolean> {
  if (ffmpegPath !== 'ffmpeg') return existsSync(ffmpegPath)
  try {
    const { execFileSync } = await import('node:child_process')
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Read the page's motion vocabulary: which elements carry transitions or
 * running animations, and which easing keywords they use. Pure DOM reads —
 * works everywhere, recorded on every extraction for later filtering.
 */
export async function extractMotionTags(page: Page): Promise<MotionTags> {
  try {
    return await page.evaluate(() => {
      let transitions = 0
      let animations = 0
      const easings = new Set<string>()
      const els = document.querySelectorAll('body *')
      const sample = Array.from(els).slice(0, 1500)
      for (const el of sample) {
        const s = getComputedStyle(el)
        if (s.transitionDuration && s.transitionDuration !== '0s') {
          transitions++
          const tf = s.transitionTimingFunction || ''
          const m = tf.match(/(ease|cubic-bezier|linear|steps|spring)[^,]*/gi)
          if (m) m.forEach(e => easings.add(e.trim().toLowerCase().slice(0, 40)))
        }
        if (s.animationName && s.animationName !== 'none') {
          animations++
        }
      }
      return {
        hasTransitions: transitions > 0,
        hasAnimations: animations > 0,
        easings: Array.from(easings).slice(0, 8),
      }
    })
  } catch {
    return { hasTransitions: false, hasAnimations: false, easings: [] }
  }
}

/** Viewport coordinates of the primary CTA, or null when none qualifies. */
async function findCtaPoint(page: Page): Promise<{ x: number; y: number } | null> {
  try {
    return await page.evaluate(() => {
      const cands = Array.from(document.querySelectorAll('a, button, [role="button"]'))
      let best: { x: number; y: number; score: number } | null = null
      for (const el of cands.slice(0, 400)) {
        const r = el.getBoundingClientRect()
        if (r.width < 24 || r.height < 12 || r.width > window.innerWidth) continue
        if (r.top < 0 || r.top > window.innerHeight || r.left < 0) continue
        const s = getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden') continue
        const text = (el.textContent || '').trim().toLowerCase()
        const ctaWords = /try|start|get|sign|join|book|buy|shop|demo|learn|explore|discover|download|subscribe|contact/i
        const score = r.width * r.height * (ctaWords.test(text) ? 3 : 1)
        if (!best || score > best.score) {
          best = { x: r.left + r.width / 2, y: r.top + r.height / 2, score }
        }
      }
      return best ? { x: best.x, y: best.y } : null
    })
  } catch {
    return null
  }
}

/**
 * Record the take. Returns the clip, or a classified failure. Throws nothing.
 *
 * The page is left scrolled and possibly hovering — the caller runs this
 * last, after every read and capture, so residue cannot pollute anything.
 */
export async function recordMotionClip(
  page: Page,
  siteUrl: string,
  ffmpegPath: string,
): Promise<{ clip: MotionClip } | { failed: string }> {
  const started = Date.now()
  const tmpPath = `/tmp/motion-${Date.now()}-${Math.floor(Math.random() * 1e6)}.webm`
  // No binary, no take — and no error either. A missing recorder is an
  // environment gap (serverless has no ffmpeg), not a property of the site;
  // recording one would blame the site for our tooling. The caller already
  // ignores any failure value outside the shared vocabulary.
  if (!(await ffmpegExists(ffmpegPath))) return { failed: 'recorder-unavailable' }
  let recorder: { stop: () => Promise<void> } | null = null
  try {
    await page.setViewport({ width: CLIP_VIEWPORT.width, height: CLIP_VIEWPORT.height })
    // Restart at the top: the pipeline scrolled this page several times over.
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})

    recorder = await (page as any).screencast({ path: tmpPath, scale: CLIP_SCALE, ffmpegPath })

    // One smooth pass, top to bottom. rAF-driven so wall time — not content
    // height — sets the pace: ~3.5s on any page.
    const scrollMs = 3500
    await page.evaluate((ms: number) => new Promise<void>(resolve => {
      const t0 = performance.now()
      const max = document.documentElement.scrollHeight - window.innerHeight
      function tick() {
        const t = Math.min((performance.now() - t0) / ms, 1)
        window.scrollTo(0, max * t)
        if (t < 1) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    }), scrollMs).catch(() => {})

    // Hold the primary CTA's hover state so transitions play to completion.
    const remaining = CLIP_BUDGET_MS - (Date.now() - started)
    if (remaining > 1500) {
      const pt = await findCtaPoint(page)
      if (pt) {
        await page.mouse.move(pt.x, pt.y, { steps: 5 }).catch(() => {})
        await new Promise(r => setTimeout(r, Math.min(3000, remaining - 500)))
      } else {
        await new Promise(r => setTimeout(r, 1200))
      }
    }

    if (recorder) {
      await recorder.stop()
      recorder = null
    }

    // Normalize the take: the recorder's raw VP9 defaults are tuned for
    // fidelity, not weight (a static page still costs ~700KB). The second
    // pass is what makes the cap structural — most takes land 50–150KB,
    // and anything still over it is discarded, never shipped.
    const { statSync, unlinkSync, renameSync } = await import('node:fs')
    const normalizedPath = tmpPath.replace(/\.webm$/, '.norm.webm')
    try {
      execFileSync(ffmpegPath, [
        '-y', '-loglevel', 'error',
        '-i', tmpPath,
        '-c:v', 'libvpx-vp9', '-crf', '33', '-b:v', '0',
        '-r', '10', '-vf', 'scale=320:-1',
        normalizedPath,
      ], { timeout: 30000 })
      try { unlinkSync(tmpPath) } catch {}
      renameSync(normalizedPath, tmpPath)
    } catch {
      try { unlinkSync(normalizedPath) } catch {}
      // Normalization failed — judge the raw take as-is below.
    }

    const bytes = statSync(tmpPath).size
    if (!bytes) throw new Error('empty clip')
    if (bytes > MAX_CLIP_BYTES) {
      // Oversize takes are discarded, not shipped: the cap is load-bearing
      // for the grid's weight budget. The screenshot stays the card.
      try { unlinkSync(tmpPath) } catch {}
      return { failed: 'oversize' }
    }
    return { clip: { tmpPath, bytes, durationMs: Date.now() - started } }
  } catch (err) {
    try { await recorder?.stop().catch(() => {}) } catch {}
    const { unlinkSync } = await import('node:fs')
    try { unlinkSync(tmpPath) } catch {}
    const info = classifyExtractionError(err instanceof Error ? err.message : String(err))
    console.warn(`[motion] ${siteUrl}: capture failed (${info.category})`)
    return { failed: info.category }
  }
}
