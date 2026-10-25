// scripts/backfill-kinds.ts
// Files every source that has no usable kind, so the Unsorted shelf empties and
// every site appears under a real browse filter.
//
//   bun run scripts/backfill-kinds.ts --dry            # report, write nothing
//   bun run scripts/backfill-kinds.ts                  # file all unfiled
//   bun run scripts/backfill-kinds.ts --ids=435,431    # just these
//
// "Unfiled" is NULL or a value outside the fixed taxonomy — queryCategories
// only renders KINDS + Unsorted, so a stray legacy value is invisible in the
// sidebar just like a null. Rows already filed with a real kind are untouched.
// Idempotent.
import { getSql } from '@/lib/db'
import { inferKind } from '@/lib/site-kind'
import { KINDS } from '@/lib/categories'

const sql = getSql()
const args = process.argv.slice(2)
const dry = args.includes('--dry')
const idsRaw = args.find(a => a.startsWith('--ids='))?.slice('--ids='.length)
const onlyIds = idsRaw ? idsRaw.split(',').map(Number).filter(Number.isFinite) : null
const KIND_ARRAY = [...KINDS]
const UNFILED = sql`(ds.kind IS NULL OR ds.kind <> ALL(${KIND_ARRAY}::text[]))`

async function main() {
  const rows = onlyIds?.length
    ? await sql`
        SELECT ds.id,
               ds.source_url AS url,
               ds.source_name AS title,
               ds.kind AS previous_kind,
               ds.tags,
               ds.metadata->>'description' AS description,
               COALESCE(
                 array_agg(dt.font_family) FILTER (WHERE dt.font_family IS NOT NULL),
                 '{}'
               ) AS fonts
        FROM design_sources ds
        LEFT JOIN design_typography dt
          ON dt.source_id = ds.id AND dt.role != 'legacy'
        WHERE ${UNFILED} AND ds.id = ANY(${onlyIds}::int[])
        GROUP BY ds.id
        ORDER BY ds.id
      `
    : await sql`
        SELECT ds.id,
               ds.source_url AS url,
               ds.source_name AS title,
               ds.kind AS previous_kind,
               ds.tags,
               ds.metadata->>'description' AS description,
               COALESCE(
                 array_agg(dt.font_family) FILTER (WHERE dt.font_family IS NOT NULL),
                 '{}'
               ) AS fonts
        FROM design_sources ds
        LEFT JOIN design_typography dt
          ON dt.source_id = ds.id AND dt.role != 'legacy'
        WHERE ${UNFILED}
        GROUP BY ds.id
        ORDER BY ds.id
      `

  const byKind: Record<string, number> = {}
  let written = 0

  for (const row of rows as any[]) {
    const kind = inferKind({
      url: row.url,
      title: row.title,
      description: row.description,
      fontFamilies: row.fonts ?? [],
      tags: row.tags ?? [],
    })
    byKind[kind] = (byKind[kind] ?? 0) + 1
    const was = row.previous_kind ? ` (was ${row.previous_kind})` : ''
    console.log(`${String(row.id).padStart(4)}  ${kind.padEnd(10)}  ${row.title ?? ''}${was} — ${row.url}`)
    if (!dry) {
      await sql`
        UPDATE design_sources SET kind = ${kind}
        WHERE id = ${row.id} AND (kind IS NULL OR kind <> ALL(${KIND_ARRAY}::text[]))
      `
      written++
    }
  }

  const [{ total, sorted }] = await sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE kind = ANY(${KIND_ARRAY}::text[]))::int AS sorted
    FROM design_sources
  `

  console.log(
    dry ? 'dry-run:' : `filed ${written} rows.`,
    JSON.stringify(byKind),
    `— library ${sorted}/${total} filed, ${total - sorted} remaining`,
  )
}

main()
