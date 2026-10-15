// scripts/backfill-embeddings.mjs
// Phase 2: one embedding per site for visual similarity search.
//
// Run with node (NOT bun): @xenova/transformers' image reader sniffs `self`
// to detect a browser, and bun defines `self` — so under bun every image
// decode fails. Under node it takes the sharp path and works.
//
//   node scripts/backfill-embeddings.mjs                  # everything missing one
//   node scripts/backfill-embeddings.mjs --ids 3,4        # named sites, re-embed
//   node scripts/backfill-embeddings.mjs --limit 20       # first 20 missing
//   node scripts/backfill-embeddings.mjs --force          # redo all with screenshots
//
// Resume-safe: rows that already have an embedding are skipped unless
// --force or --ids is given. Never touches prod behavior — pure UPDATEs of
// the embedding column (additive; nothing reads it until the similar API
// ships with Phase 2 code).
//
// NOTE: the feature math below mirrors lib/similarity.ts. The script is .mjs
// (node has no TS loader here) so the ~60 lines are duplicated rather than
// imported. If the layout changes there, change it here too — EMBED_DIMS,
// weights, bucket counts, and the kind order must stay identical or old and
// new vectors stop being comparable.
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import { parse } from 'culori'

const IMG_DIMS = 512
const PAL_HUE_BINS = 12
const PAL_LIGHT_BINS = 4
const PAL_ACHRO_BINS = 4
const PAL_DIMS = PAL_HUE_BINS * PAL_LIGHT_BINS + PAL_ACHRO_BINS
const FONT_DIMS = 32
const KINDS = ['AI', 'Developer', 'Work', 'Money', 'Consumer', 'Studio', 'Editorial', 'Company', 'Portfolio', 'Store', 'Venue', 'Event']
const KIND_DIMS = KINDS.length + 1
const EMBED_DIMS = IMG_DIMS + PAL_DIMS + FONT_DIMS + KIND_DIMS
const W_IMAGE = 0.55
const W_PALETTE = 0.3
const W_FONT = 0.1
const W_KIND = 0.05

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
const sql = neon(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL)

function hashFamily(family) {
  let h = 0x811c9dc5
  for (let i = 0; i < family.length; i++) { h ^= family.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0) % FONT_DIMS
}
function l2norm(v) {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  return n === 0 ? v : v.map(x => x / n)
}
function paletteHistogram(palette) {
  const hist = new Array(PAL_DIMS).fill(0)
  if (!palette.length) return hist
  const measured = palette.some(p => typeof p.area_share === 'number')
  const total = measured ? palette.reduce((s, p) => s + (p.area_share ?? 0), 0) : 0
  for (const p of palette) {
    const weight = measured && total > 0 ? (p.area_share ?? 0) / total : 1 / palette.length
    let c = null
    try { c = parse(p.oklch || p.hex_value) } catch { c = null }
    if (!c || c.mode !== 'oklch') continue
    const l = typeof c.l === 'number' ? Math.min(Math.max(c.l, 0), 1) : 0.5
    const chroma = typeof c.c === 'number' ? c.c : 0
    const lightBin = Math.min(PAL_LIGHT_BINS - 1, Math.floor(l * PAL_LIGHT_BINS))
    if (chroma < 0.03 || typeof c.h !== 'number' || Number.isNaN(c.h)) {
      hist[PAL_HUE_BINS * PAL_LIGHT_BINS + lightBin] += weight
    } else {
      hist[Math.min(PAL_HUE_BINS - 1, Math.floor((((c.h % 360) + 360) % 360) / 30)) * PAL_LIGHT_BINS + lightBin] += weight
    }
  }
  return hist
}
function buildEmbedding({ palette, fonts, kind, imageFeatures }) {
  const img = imageFeatures && imageFeatures.length === IMG_DIMS ? l2norm(imageFeatures) : new Array(IMG_DIMS).fill(0)
  const fv = new Array(FONT_DIMS).fill(0)
  for (const f of fonts) { if (f.font_family) fv[hashFamily(f.font_family.toLowerCase().trim())] += 1 }
  const kv = new Array(KIND_DIMS).fill(0)
  const ki = [...KINDS, 'Unsorted'].indexOf(kind || 'Unsorted')
  kv[ki >= 0 ? ki : KIND_DIMS - 1] = 1
  const out = [
    ...img.map(x => x * W_IMAGE),
    ...paletteHistogram(palette).map(x => x * W_PALETTE),
    ...l2norm(fv).map(x => x * W_FONT),
    ...kv.map(x => x * W_KIND),
  ]
  if (out.length !== EMBED_DIMS) throw new Error('dim mismatch ' + out.length)
  return `[${out.map(x => (Number.isFinite(x) ? x : 0).toFixed(6)).join(',')}]`
}

const { pipeline } = await import('@xenova/transformers')
console.log('loading CLIP model…')
const pipe = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32')
console.log('model ready')

// Default pass: rows missing an embedding OR holding a structured-only one
// (zero image block — written by an extraction that ran where the model
// could not load). --force redoes everything with a screenshot.
function imageBlockIsZero(literal) {
  const v = literal.slice(1, -1).split(',', IMG_DIMS + 1).map(Number)
  if (v.length < IMG_DIMS) return true
  return Math.sqrt(v.slice(0, IMG_DIMS).reduce((s, x) => s + x * x, 0)) < 1e-6
}

let pending
if (onlyIds) {
  pending = await sql`SELECT id, source_url, kind, screenshot_url FROM design_sources WHERE id = ANY(${onlyIds}::int[]) AND screenshot_url IS NOT NULL`
} else if (force) {
  pending = await sql`SELECT id, source_url, kind, screenshot_url FROM design_sources WHERE screenshot_url IS NOT NULL ORDER BY id ASC`
} else {
  const cands = await sql`SELECT id, source_url, kind, screenshot_url, embedding::text AS embedding FROM design_sources WHERE screenshot_url IS NOT NULL ORDER BY id ASC`
  pending = cands.filter(r => !r.embedding || imageBlockIsZero(r.embedding))
  if (Number.isFinite(limit)) pending = pending.slice(0, limit)
}
console.log(`${pending.length} sites to embed`)

let done = 0
let failed = 0
for (const site of pending) {
  try {
    const [colors, typo] = await Promise.all([
      sql`SELECT hex_value, oklch, area_share FROM design_colors WHERE source_id = ${site.id} ORDER BY id`,
      sql`SELECT font_family, role FROM design_typography WHERE source_id = ${site.id} AND role != 'legacy'`,
    ])
    let imageFeatures = null
    try {
      const out = await pipe(site.screenshot_url)
      const data = Array.from(out.data ?? out)
      if (data.length === IMG_DIMS) {
        const n = Math.sqrt(data.reduce((s, x) => s + x * x, 0))
        imageFeatures = n === 0 ? data : data.map(x => x / n)
      }
    } catch (e) { console.warn(`[${site.id}] image features failed:`, e.message.slice(0, 100)) }
    const literal = buildEmbedding({ palette: colors, fonts: typo, kind: site.kind, imageFeatures })
    await sql`UPDATE design_sources SET embedding = ${literal}::vector WHERE id = ${site.id}`
    done++
  } catch (e) {
    failed++
    console.warn(`[${site.id}] failed:`, e.message.slice(0, 120))
  }
  if ((done + failed) % 10 === 0) console.log(`progress: ${done + failed}/${pending.length} (failed: ${failed})`)
}
console.log(`done: ${done} embedded, ${failed} failed`)
