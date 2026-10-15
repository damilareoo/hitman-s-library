// scripts/backfill-pixel-palettes.mjs
// Color gaps: sites whose DOM extraction yielded nothing (og-salvaged rows,
// thin renders) get an honest pixel palette sampled from their best image.
// Pure measurement — hue/lightness buckets over downscaled pixels, shares
// included — written in the exact row shape everything reads. Rows whose
// measurement proves the image empty are left alone (skeleton stays).
//
//   node scripts/backfill-pixel-palettes.mjs
//   node scripts/backfill-pixel-palettes.mjs --ids 390,412
//
// Prod-safe: INSERTs into design_colors only, for sites holding none.
// Never touches existing palettes.
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
const onlyIds = idsRaw ? idsRaw.split(',').map(Number).filter(Number.isFinite) : null

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const { neon } = await import('@neondatabase/serverless')
const { parse, formatHex, oklch: toOklch, formatCss, clampChroma, differenceEuclidean } = await import('culori')
const { default: sharp } = await import('sharp')
const sql = neon(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL)
const diff = differenceEuclidean('oklch')

const sites = onlyIds?.length
  ? await sql`SELECT id, screenshot_url FROM design_sources WHERE id = ANY(${onlyIds}::int[])`
  : await sql`SELECT ds.id, ds.screenshot_url FROM design_sources ds WHERE ds.screenshot_url IS NOT NULL AND NOT EXISTS (SELECT 1 FROM design_colors dc WHERE dc.source_id = ds.id AND dc.hex_value IS NOT NULL) ORDER BY ds.id`
console.log(`${sites.length} colorless sites to sample`)

let painted = 0
for (const site of sites) {
  const id = Number(site.id)
  try {
    const res = await fetch(site.screenshot_url, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!(res.headers.get('content-type') ?? '').startsWith('image/')) throw new Error('non-image')
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) throw new Error('empty')
    const { data, info } = await sharp(buf, { animated: false }).rotate().resize({ width: 160, withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true })
    // Bucket pixels by hue band x lightness band; achromatic goes wide.
    const buckets = new Map()
    const n = info.width * info.height
    for (let i = 0; i < n; i++) {
      const r = data[i * info.channels], g = data[i * info.channels + 1], b = data[i * info.channels + 2]
      const a = info.channels === 4 ? data[i * 4 + 3] : 255
      if (a < 128) continue
      let p
      try { p = toOklch({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 }) } catch { continue }
      if (!p || typeof p.l !== 'number') continue
      const hue = typeof p.h === 'number' && !Number.isNaN(p.h) && p.c > 0.03 ? Math.floor((((p.h % 360) + 360) % 360) / 30) : -1
      const key = hue + ':' + Math.min(3, Math.floor(Math.min(Math.max(p.l, 0), 1) * 4))
      const e = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
      e.count++; e.r += r; e.g += g; e.b += b
      buckets.set(key, e)
    }
    const ranked = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 8)
    const total = ranked.reduce((s, e) => s + e.count, 0)
    if (!total) throw new Error('no pixels')
    // Dedupe near-identical buckets, keep shares honest.
    const kept = []
    for (const e of ranked) {
      const hex = formatHex({ mode: 'rgb', r: e.r / e.count / 255, g: e.g / e.count / 255, b: e.b / e.count / 255 })
      if (!hex) continue
      let parsed
      try { parsed = parse(hex) } catch { continue }
      if (!parsed) continue
      if (kept.some(k => { try { return diff(parse(k.hex), parsed) < 0.05 } catch { return false } })) continue
      const clamped = clampChroma(toOklch(parsed), 'oklch')
      const oklch = clamped && formatCss(clamped)
      if (!oklch) continue
      kept.push({ hex, oklch, share: e.count / total })
    }
    if (!kept.length) throw new Error('no colors')
    for (const c of kept) {
      await sql`INSERT INTO design_colors (source_id, hex_value, oklch, area_share) VALUES (${id}, ${c.hex}, ${c.oklch}, ${c.share}) ON CONFLICT DO NOTHING`
    }
    await sql`UPDATE design_sources SET metadata = COALESCE(metadata, '{}') || '{"color_source":"pixels"}'::jsonb WHERE id = ${id}`.catch(() => null)
    painted++
    console.log(`[${id}] ${kept.length} colors from pixels`)
  } catch (e) {
    console.warn(`[${id}] skipped:`, e.message.slice(0, 80))
  }
}
console.log(`painted: ${painted}/${sites.length}`)
