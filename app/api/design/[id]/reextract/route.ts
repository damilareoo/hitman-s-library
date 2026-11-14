// app/api/design/[id]/reextract/route.ts
// Re-runs full design extraction for an existing source, bypassing the duplicate guard.
import { NextResponse } from 'next/server'
import { parseId } from '@/lib/parse-id'
import { getSql } from '@/lib/db'
import { extractFullDesignData } from '@/lib/browser-extraction'
import { applyReextraction } from '@/lib/reextract'
import { requireAdmin } from '@/lib/admin-auth'

const sql = getSql()

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // Fetch existing record
  const sources = await sql`
    SELECT id, source_url FROM design_sources WHERE id = ${id}
  `
  if (!sources.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const { source_url: url } = sources[0]

  try {
    const extractionResult = await extractFullDesignData(url)

    const result = await applyReextraction(id, url, extractionResult)
    return NextResponse.json(result.body, { status: result.status })
  } catch (err: any) {
    console.error(`[reextract] Failed for id=${id} url=${url}:`, err)
    // Store the error reason so the UI can explain why data is unavailable
    await sql`
      UPDATE design_sources
      -- ::text matters. jsonb_build_object takes "any", so without a cast
      -- Postgres cannot infer the parameter's type and raises "could not
      -- determine data type of parameter $1". The .catch below then swallowed
      -- it, which is why no extraction error has ever actually been recorded.
      SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('extraction_error', ${err.message ?? 'Unknown error'}::text)
      WHERE id = ${id}
    `.catch(() => null)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
