// app/api/admin/kinds/route.ts
// Files every source that has no usable kind yet. Extraction files each new
// site on the way in, so this exists for the rows that arrived before that was
// true — after it runs the library has no Unsorted shelf at all.
//
// A row counts as unfiled when kind is NULL or holds a value outside the fixed
// taxonomy: queryCategories only renders KINDS + Unsorted, so a stray legacy
// value would be just as unreachable as a null.
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { inferKind } from '@/lib/site-kind'
import { KINDS } from '@/lib/categories'

const sql = getSql()
const KIND_ARRAY = [...KINDS]

export const maxDuration = 60

export async function POST(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const rows = await sql`
      SELECT ds.id,
             ds.source_url AS url,
             ds.source_name AS title,
             ds.tags,
             ds.metadata->>'description' AS description,
             COALESCE(
               array_agg(dt.font_family) FILTER (WHERE dt.font_family IS NOT NULL),
               '{}'
             ) AS fonts
      FROM design_sources ds
      LEFT JOIN design_typography dt
        ON dt.source_id = ds.id AND dt.role != 'legacy'
      WHERE ds.kind IS NULL OR ds.kind <> ALL(${KIND_ARRAY}::text[])
      GROUP BY ds.id
      ORDER BY ds.id
    `

    let filed = 0
    const byKind: Record<string, number> = {}
    for (const row of rows as any[]) {
      const kind = inferKind({
        url: row.url,
        title: row.title,
        description: row.description,
        fontFamilies: row.fonts ?? [],
        tags: row.tags ?? [],
      })
      const updated = await sql`
        UPDATE design_sources SET kind = ${kind}
        WHERE id = ${row.id} AND (kind IS NULL OR kind <> ALL(${KIND_ARRAY}::text[]))
        RETURNING id
      `
      if (!updated.length) continue
      filed++
      byKind[kind] = (byKind[kind] ?? 0) + 1
    }

    const [{ remaining }] = await sql`
      SELECT COUNT(*)::int AS remaining FROM design_sources
      WHERE kind IS NULL OR kind <> ALL(${KIND_ARRAY}::text[])
    `

    if (filed > 0) revalidateTag('designs', 'max')

    return NextResponse.json({ filed, remaining, byKind })
  } catch (err) {
    console.error('[POST /api/admin/kinds]', err)
    return NextResponse.json({ error: 'Failed to file unsorted sites' }, { status: 500 })
  }
}
