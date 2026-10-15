// scripts/backfill-thumbnails.mjs
// Work order 1 (performance): re-encode hotlinked thumbnails into blob webp.
//
//   node scripts/backfill-thumbnails.mjs
//   node scripts/backfill-thumbnails.mjs --ids 3,4
//   node scripts/backfill-thumbnails.mjs --force
//
// Resume-safe: rows with thumbnail_optimized_url are skipped unless
// --force/--ids. Failures keep the hotlink fallback — nothing is deleted.
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
function argVal(name) {
  const eq = args.find(a => a.startsWith(name + '='))
  if (eq) return eq.slice(name.length + 1)
  const i = args.indexOf(name)
  if (i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--')) return args[i + 1]
  return null
}
const idsRaw = argVal('--ids')
const force = args.includes('--force')
const onlyIds = idsRaw ? idsRaw.split(',').map(Number).filter(Number.isFinite) : null

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const { neon } = await import('@neondatabase/serverless')
const { put } = await import('@vercel/blob')
const { default: sharp } = await import('sharp')
const sql = neon(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL)
process.env.BLOB_READ_WRITE_TOKEN ||= env.BLOB_READ_WRITE_TOKEN

let pending
if (onlyIds) {
  pending = await sql`SELECT id, source_url, thumbnail_url FROM design_sources WHERE id = ANY(${onlyIds}::int[]) AND thumbnail_url IS NOT NULL`
} else if (force) {
  pending = await sql`SELECT id, source_url, thumbnail_url FROM design_sources WHERE thumbnail_url IS NOT NULL ORDER BY id ASC`
} else {
  pending = await sql`SELECT id, source_url, thumbnail_url FROM design_sources WHERE thumbnail_url IS NOT NULL AND thumbnail_optimized_url IS NULL ORDER BY id ASC`
}
console.log(`${pending.length} thumbnails to optimize`)

let done = 0
let failed = 0
let frozen = 0
for (const site of pending) {
  const id = Number(site.id)
  try {
    if (!site.thumbnail_url.startsWith('http')) { failed++; continue }
    const res = await fetch(site.thumbnail_url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!(res.headers.get('content-type') ?? '').startsWith('image/')) throw new Error('non-image')
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) throw new Error('empty')
    const meta = await sharp(buf).metadata()
    // Animated input freezes to its first frame for the grid — the motion
    // stays in the detail panel and the hover clip.
    if ((meta.pages ?? 1) > 1) frozen++
    const iw = meta.width ?? 640
    const ih = meta.height ?? 400
    const boxW = Math.min(iw, Math.floor((ih * 16) / 10))
    const boxH = Math.min(ih, Math.floor((boxW * 10) / 16))
    const out = await sharp(buf, { animated: false }).rotate()
      .extract({
        left: Math.max(0, Math.floor((iw - boxW) / 2)),
        top: Math.max(0, Math.floor((ih - boxH) / 2)),
        width: boxW,
        height: boxH,
      })
      .resize({ width: Math.min(640, boxW), withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
    if (!out.length) throw new Error('encode failed')
    const hostname = new URL(site.source_url).hostname.replace(/\./g, '-')
    const blob = await put(`thumbnails/${hostname}-${Date.now()}.webp`, out, { access: 'public', contentType: 'image/webp' })
    await sql`UPDATE design_sources SET thumbnail_optimized_url = ${blob.url} WHERE id = ${id}`
    done++
  } catch (e) {
    failed++
  }
  if ((done + failed) % 25 === 0) console.log(`progress: ${done + failed}/${pending.length} (frozen GIFs: ${frozen})`)
}
console.log(`done: ${done} optimized, ${failed} failed (hotlink kept), ${frozen} animated inputs frozen`)
