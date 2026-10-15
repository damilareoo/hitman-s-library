// scripts/seed-extraction-history.mjs
// Phase 0/1 bootstrap: record the current live data as snapshot #1 for every
// site that has no history yet, and point the site at it.
//
// The snapshot is built FROM the legacy tables, so pointer resolution renders
// byte-identically to the legacy path — the public view cannot change. Verify
// with: compare /api/design/<id> before and after for a few ids.
//
//   node scripts/seed-extraction-history.mjs
//   node scripts/seed-extraction-history.mjs --ids 3,4
//   node scripts/seed-extraction-history.mjs --force   # add another snapshot even where history exists
//
// Prod-safe by construction: INSERTs into extraction_history plus pointer
// repoints only. No legacy row is touched.
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

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
const sql = neon(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL)

const sites = onlyIds
  ? await sql`SELECT id FROM design_sources WHERE id = ANY(${onlyIds}::int[])`
  : force
    ? await sql`SELECT id FROM design_sources ORDER BY id ASC`
    : await sql`SELECT ds.id FROM design_sources ds LEFT JOIN extraction_history h ON h.site_id = ds.id WHERE h.id IS NULL ORDER BY ds.id ASC`
console.log(`${sites.length} sites to seed`)

let done = 0
for (const { id } of sites) {
  const siteId = Number(id)
  try {
    const [src, colors, typo, assets] = await Promise.all([
      sql`SELECT screenshot_url, mobile_screenshot_url FROM design_sources WHERE id = ${siteId}`,
      sql`SELECT hex_value, oklch, area_share FROM design_colors WHERE source_id = ${siteId} ORDER BY id`,
      sql`SELECT font_family, role, google_fonts_url, primary_weight FROM design_typography WHERE source_id = ${siteId} AND role != 'legacy'`,
      sql`SELECT type, content, width, height FROM design_assets WHERE source_id = ${siteId}`,
    ])
    if (!src.length) continue
    const palette = colors.map(c => ({ hex: c.hex_value, oklch: c.oklch, area_share: c.area_share ?? null })).filter(c => c.hex)
    const typography = typo.map(t => ({
      fontFamily: t.font_family,
      role: t.role,
      googleFontsUrl: t.google_fonts_url ?? null,
      primaryWeight: t.primary_weight ?? 400,
    })).filter(t => t.fontFamily)
    const rows = await sql`
      INSERT INTO extraction_history (site_id, screenshot_url, mobile_screenshot_url, palette, typography, assets, extractor_version)
      VALUES (${siteId}, ${src[0].screenshot_url}, ${src[0].mobile_screenshot_url}, ${JSON.stringify(palette)}, ${JSON.stringify(typography)}, ${JSON.stringify(assets)}, 'seed-legacy')
      RETURNING id
    `
    await sql`UPDATE design_sources SET current_extraction_id = ${rows[0].id} WHERE id = ${siteId}`
    done++
  } catch (e) {
    console.warn(`[${siteId}] failed:`, e.message.slice(0, 120))
  }
  if (done % 25 === 0) console.log(`progress: ${done}/${sites.length}`)
}
console.log(`seeded: ${done}/${sites.length}`)
