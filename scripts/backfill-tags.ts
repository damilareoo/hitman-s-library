// scripts/backfill-tags.ts
// Work order A9: replace every row's tags with the computed cleaned set.
//
//   bun run scripts/backfill-tags.ts --dry    # coverage without writing
//   bun run scripts/backfill-tags.ts           # rewrite all tags
//   bun run scripts/backfill-tags.ts --ids 3,4
//
// Destroys the old auto-detected tags (animated, glassmorphism, …) and the
// motion:* tags the motion backfill scattered — both were everywhere-tags.
// The motion vocabulary itself stays in metadata.motion. Idempotent.
import { getSql } from '@/lib/db'
import { computeTags } from '@/lib/tagging'

const sql = getSql()
const args = process.argv.slice(2)
const dry = args.includes('--dry')
const idsRaw = args.find(a => a.startsWith('--ids='))?.slice('--ids='.length)
const onlyIds = idsRaw ? idsRaw.split(',').map(Number).filter(Number.isFinite) : null

async function main() {
  const sites = onlyIds?.length
    ? await sql`SELECT id FROM design_sources WHERE id = ANY(${onlyIds}::int[]) ORDER BY id`
    : await sql`SELECT id FROM design_sources ORDER BY id`

  const [allColors, allTypo, allAssets] = await Promise.all([
    sql`SELECT source_id, oklch, area_share FROM design_colors WHERE hex_value IS NOT NULL`,
    sql`SELECT source_id, font_family FROM design_typography WHERE role != 'legacy' AND font_family IS NOT NULL`,
    sql`SELECT source_id, COUNT(*) AS c FROM design_assets GROUP BY source_id`,
  ])
  const byC = new Map<number, typeof allColors>()
  const byT = new Map<number, typeof allTypo>()
  const byA = new Map<number, number>()
  for (const c of allColors) {
    const list = byC.get(Number(c.source_id)) ?? []
    list.push(c)
    byC.set(Number(c.source_id), list)
  }
  for (const t of allTypo) {
    const list = byT.get(Number(t.source_id)) ?? []
    list.push(t)
    byT.set(Number(t.source_id), list)
  }
  for (const a of allAssets) byA.set(Number(a.source_id), Number(a.c))

  const cov: Record<string, number> = {}
  let written = 0
  for (const { id } of sites) {
    const siteId = Number(id)
    const palette = (byC.get(siteId) ?? []).map(c => ({
      oklch: c.oklch as string,
      areaShare: typeof c.area_share === 'number' ? c.area_share : null,
    }))
    const tags = computeTags({
      palette,
      fontFamilies: (byT.get(siteId) ?? []).map(t => t.font_family as string),
      colorCount: (byC.get(siteId) ?? []).length,
      assetCount: byA.get(siteId) ?? 0,
    })
    for (const t of tags) cov[t] = (cov[t] ?? 0) + 1
    if (!dry) {
      await sql`UPDATE design_sources SET tags = ${tags} WHERE id = ${siteId}`
      written++
    }
  }
  console.log(dry ? 'dry-run coverage:' : `rewrote ${written} rows. coverage:`, JSON.stringify(cov))

}

main()
