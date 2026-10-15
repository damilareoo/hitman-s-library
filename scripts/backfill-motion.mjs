// scripts/backfill-motion.mjs
// Phase 3: record hover clips for sites missing one.
//
// Run with node (NOT bun): puppeteer's recorder path is fine either way, but
// this stays on node like the embeddings backfill for one runtime story.
// Needs ffmpeg: FFMPEG_PATH=/tmp/ffmpeg/ffmpeg (local) or PATH.
//
//   FFMPEG_PATH=/tmp/ffmpeg/ffmpeg node scripts/backfill-motion.mjs --limit 50
//   FFMPEG_PATH=/tmp/ffmpeg/ffmpeg node scripts/backfill-motion.mjs --ids 3,4
//   FFMPEG_PATH=/tmp/ffmpeg/ffmpeg node scripts/backfill-motion.mjs --force
//
// One browser for the whole run, one page per site. ~15s per site.
// Resume-safe: rows with a clip are skipped unless --force/--ids.
// Prod-safe: UPDATEs of motion columns + metadata/tags only; screenshots,
// colors, and typography are never touched.
import { readFileSync, statSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import puppeteer from 'puppeteer'
import { put } from '@vercel/blob'

const MAX_CLIP_BYTES = 300_000
const args = process.argv.slice(2)
function argVal(name) {
  const eq = args.find(a => a.startsWith(name + '='))
  if (eq) return eq.slice(name.length + 1)
  const i = args.indexOf(name)
  if (i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--')) return args[i + 1]
  return null
}
const idsRaw = argVal('--ids')
const limitRaw = argVal('--limit')
const force = args.includes('--force')
const onlyIds = idsRaw ? idsRaw.split(',').map(Number).filter(Number.isFinite) : null
const limit = limitRaw ? parseInt(limitRaw, 10) : null

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const { neon } = await import('@neondatabase/serverless')
const sql = neon(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL)
if (!process.env.BLOB_READ_WRITE_TOKEN && !env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set — cannot upload clips')
  process.exit(1)
}
process.env.BLOB_READ_WRITE_TOKEN ||= env.BLOB_READ_WRITE_TOKEN

const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'

function classifyFailure(message) {
  const m = (message || '').toLowerCase()
  if (m.includes('403') || m.includes('cloudflare') || m.includes('bot') || m.includes('blocked')) return 'bot_protection'
  if (m.includes('401') || m.includes('login') || m.includes('unauthorized') || m.includes('sign in')) return 'login_required'
  if (m.includes('timeout') || m.includes('timed out') || m.includes('navigation timeout')) return 'timeout'
  if (m.includes('404') || m.includes('not found')) return 'not_found'
  return 'unknown'
}

async function motionTags(page) {
  try {
    return await page.evaluate(() => {
      let transitions = 0
      let animations = 0
      const easings = new Set()
      for (const el of Array.from(document.querySelectorAll('body *')).slice(0, 1500)) {
        const s = getComputedStyle(el)
        if (s.transitionDuration && s.transitionDuration !== '0s') {
          transitions++
          const m = (s.transitionTimingFunction || '').match(/(ease|cubic-bezier|linear|steps|spring)[^,]*/gi)
          if (m) m.forEach(e => easings.add(e.trim().toLowerCase().slice(0, 40)))
        }
        if (s.animationName && s.animationName !== 'none') animations++
      }
      return { hasTransitions: transitions > 0, hasAnimations: animations > 0, easings: Array.from(easings).slice(0, 8) }
    })
  } catch { return { hasTransitions: false, hasAnimations: false, easings: [] } }
}

async function findCta(page) {
  try {
    return await page.evaluate(() => {
      let best = null
      for (const el of Array.from(document.querySelectorAll('a, button, [role="button"]')).slice(0, 400)) {
        const r = el.getBoundingClientRect()
        if (r.width < 24 || r.height < 12 || r.width > window.innerWidth) continue
        if (r.top < 0 || r.top > window.innerHeight || r.left < 0) continue
        const s = getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden') continue
        const score = r.width * r.height * (/try|start|get|sign|join|book|buy|shop|demo|learn|explore|discover|download|subscribe|contact/i.test((el.textContent || '').trim().toLowerCase()) ? 3 : 1)
        if (!best || score > best.score) best = { x: r.left + r.width / 2, y: r.top + r.height / 2, score }
      }
      return best ? { x: best.x, y: best.y } : null
    })
  } catch { return null }
}

let pending
if (onlyIds) {
  pending = await sql`SELECT id, source_url FROM design_sources WHERE id = ANY(${onlyIds}::int[]) AND screenshot_url IS NOT NULL`
} else if (force) {
  pending = await sql`SELECT id, source_url FROM design_sources WHERE screenshot_url IS NOT NULL ORDER BY id ASC`
} else {
  const cands = await sql`SELECT id, source_url FROM design_sources WHERE screenshot_url IS NOT NULL AND motion_clip_url IS NULL ORDER BY id ASC`
  pending = Number.isFinite(limit) ? cands.slice(0, limit) : cands
}
console.log(`${pending.length} sites to record`)

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// The shared browser's CDP connection dies after ~30 pages (Protocol error:
// Connection closed) and every later newPage fails with it. Recreate on
// first sign of death and retry the site once, instead of failing the rest
// of the run with a dead browser.
let browser = null
async function getBrowser() {
  if (browser) {
    try {
      if (browser.isConnected()) return browser
    } catch {}
    try { await browser.close().catch(() => {}) } catch {}
    browser = null
  }
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  return browser
}

let clipped = 0
let failed = 0
const failures = {}
for (const site of pending) {
  const id = Number(site.id)
  let page = null
  for (let attempt = 0; attempt < 2 && !page; attempt++) {
    try {
      page = await (await getBrowser()).newPage()
    } catch (e) {
      console.warn(`[${id}] newPage failed (attempt ${attempt + 1}):`, (e.message || String(e)).slice(0, 100))
      browser = null
    }
  }
  if (!page) { failed++; continue }
  try {
    await page.setBypassCSP(true)
    await page.setUserAgent(UA)
    await page.setViewport({ width: 720, height: 450 })
    try {
      await page.goto(site.source_url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    } catch (e) {
      if (!page.url() || page.url() === 'about:blank') throw e
    }
    await new Promise(r => setTimeout(r, 2000))
    const tags = await motionTags(page)

    const tmpPath = `/tmp/motion-${id}-${Date.now()}.webm`
    let recorder = null
    try {
      recorder = await page.screencast({ path: tmpPath, scale: 0.5, ffmpegPath })
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
      await page.evaluate(() => new Promise(resolve => {
        const t0 = performance.now()
        const max = document.documentElement.scrollHeight - window.innerHeight
        ;(function tick() {
          const t = Math.min((performance.now() - t0) / 3500, 1)
          window.scrollTo(0, max * t)
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        })()
      })).catch(() => {})
      const pt = await findCta(page)
      if (pt) {
        await page.mouse.move(pt.x, pt.y, { steps: 5 }).catch(() => {})
        await new Promise(r => setTimeout(r, 2500))
      } else {
        await new Promise(r => setTimeout(r, 1200))
      }
      await recorder.stop()
      recorder = null
      // Normalize like lib/motion-capture.ts: raw VP9 defaults cost ~700KB
      // even for static pages; crf 33 + 10fps + 320w lands 50–150KB.
      const normPath = tmpPath.replace(/\.webm$/, '.norm.webm')
      try {
        execFileSync(ffmpegPath, [
          '-y', '-loglevel', 'error', '-i', tmpPath,
          '-c:v', 'libvpx-vp9', '-crf', '33', '-b:v', '0',
          '-r', '10', '-vf', 'scale=320:-1', normPath,
        ], { timeout: 30000 })
        try { unlinkSync(tmpPath) } catch {}
        const { renameSync } = await import('node:fs')
        renameSync(normPath, tmpPath)
      } catch {
        try { unlinkSync(normPath) } catch {}
      }
      const bytes = statSync(tmpPath).size
      if (bytes && bytes <= MAX_CLIP_BYTES) {
        const hostname = new URL(site.source_url).hostname.replace(/\./g, '-')
        const blob = await put(`motion/${hostname}-${Date.now()}.webm`, readFileSync(tmpPath), { access: 'public', contentType: 'video/webm' })
        await sql`UPDATE design_sources SET motion_clip_url = ${blob.url}, motion_bytes = ${bytes} WHERE id = ${id}`
        clipped++
      } else {
        // Over the cap: discard, keep the screenshot. Not an error — the
        // page rendered fine, the take was just too heavy to ship.
        try { unlinkSync(tmpPath) } catch {}
        failed++
      }
    } catch (e) {
      try { await recorder?.stop().catch(() => {}) } catch {}
      const category = classifyFailure(e.message)
      failures[category] = (failures[category] || 0) + 1
      await sql`UPDATE design_sources SET metadata = COALESCE(metadata, '{}') || ${JSON.stringify({ motion_error: category })}::jsonb WHERE id = ${id}`.catch(() => null)
      failed++
    }
    // Motion vocabulary rides along regardless of the take.
    const mt = await motionTags(page).catch(() => null)
    if (mt && (mt.hasTransitions || mt.hasAnimations)) {
      const list = [...(mt.hasTransitions ? ['motion:transitions'] : []), ...(mt.hasAnimations ? ['motion:animations'] : []), ...mt.easings.slice(0, 4).map(e => `motion:${e}`)]
      if (list.length) await sql`UPDATE design_sources SET tags = ARRAY(SELECT DISTINCT unnest(COALESCE(tags, '{}') || ${list}::text[])) WHERE id = ${id}`.catch(() => null)
      await sql`UPDATE design_sources SET metadata = COALESCE(metadata, '{}') || ${JSON.stringify({ motion: mt })}::jsonb WHERE id = ${id}`.catch(() => null)
    }
  } catch (e) {
    const category = classifyFailure(e.message)
    failures[category] = (failures[category] || 0) + 1
    failed++
  } finally {
    await page.close().catch(() => {})
  }
  if ((clipped + failed) % 10 === 0) console.log(`progress: ${clipped + failed}/${pending.length} (clips: ${clipped}, failed: ${failed})`)
}
await browser?.close().catch(() => {})
console.log(`done: ${clipped} clips, ${failed} failed`, JSON.stringify(failures))
