// app/api/design/[id]/history/route.ts
// Per-site time travel (Phase 1): every extraction snapshot plus the drift
// between consecutive runs. Public read data, like the gallery and the
// detail endpoint — no auth change.
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getSiteHistory } from '@/lib/extraction-history'
import { DRIFT_ENABLED, driftBetween } from '@/lib/drift'
import { toHttps } from '@/lib/secure-url'

const sql = getSql()

function publicSnapshot(s: Awaited<ReturnType<typeof getSiteHistory>>[number]) {
  return {
    id: s.id,
    captured_at: s.captured_at,
    screenshot_url: toHttps(s.screenshot_url),
    mobile_screenshot_url: toHttps(s.mobile_screenshot_url),
    palette: s.palette,
    typography: s.typography,
    extractor_version: s.extractor_version ?? null,
    redesigned_vs_previous: null as boolean | null,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!DRIFT_ENABLED) {
    return NextResponse.json({ error: 'History is disabled' }, { status: 404 })
  }

  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const exists = await sql`SELECT id FROM design_sources WHERE id = ${id}`
    if (!exists.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const snapshots = await getSiteHistory(id)
    const out = snapshots.map(publicSnapshot)

    // Drift between consecutive runs, so the tab can label each snapshot
    // without recomputing pairs client-side.
    for (let i = 1; i < snapshots.length; i++) {
      const drift = driftBetween(
        {
          palette: snapshots[i - 1].palette,
          typography: snapshots[i - 1].typography,
          screenshotHash: snapshots[i - 1].screenshot_hash,
        },
        {
          palette: snapshots[i].palette,
          typography: snapshots[i].typography,
          screenshotHash: snapshots[i].screenshot_hash,
        },
      )
      out[i].redesigned_vs_previous = drift.redesigned
    }

    // On-demand diff for any two snapshots the scrubber selects.
    const url = new URL(_req.url)
    const aId = parseInt(url.searchParams.get('a') ?? '', 10)
    const bId = parseInt(url.searchParams.get('b') ?? '', 10)
    let pair: ReturnType<typeof driftBetween> | null = null
    let pairMeta: { a: number; b: number } | null = null
    if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) {
      const a = snapshots.find(s => s.id === aId)
      const b = snapshots.find(s => s.id === bId)
      if (a && b) {
        const [before, after] = a.captured_at <= b.captured_at ? [a, b] : [b, a]
        pair = driftBetween(
          {
            palette: before.palette,
            typography: before.typography,
            screenshotHash: before.screenshot_hash,
          },
          {
            palette: after.palette,
            typography: after.typography,
            screenshotHash: after.screenshot_hash,
          },
        )
        pairMeta = { a: before.id, b: after.id }
      }
    }

    return NextResponse.json({ snapshots: out, pair, pairMeta })
  } catch (err) {
    console.error('[GET /api/design/[id]/history]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
